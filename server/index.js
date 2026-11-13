/**
 * TIMIȘOARA TIME CAPSULE — realtime state server
 * Express + Socket.io, single in-memory `globalState`, broadcast on every change.
 * Owner: Member 1 (Backend, State & AI). Contract lives in /shared/events.js.
 *
 * v2: visitor memories persist to memories.json · RESET_TO_SEED · background
 * translation into all 5 languages · ASK_ARCHIVE. AI features are optional
 * (see ai.js); without them everything still works offline.
 *
 * v3 (Phase 2): TIME_SCRUB rotary dial 1900–2026 with 4 tuning stations (throttled
 * volatile broadcast while turning + reliable "settled" update), activeChapter snapping
 * to existing chapter ids, LOCK_ANCHOR_STATE for the AR plaza, GET /api/monuments-3d.
 *
 * Env: PORT · MEMORIES_FILE (default ./memories.json, relative to /server)
 *      RESET_TOKEN (if set, resets must send it) · AI_DISABLED · CLAUDE_MODEL
 */
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';

import {
  EVENTS,
  DEFAULT_CHAPTER,
  DEFAULT_LANGUAGE,
  LANGUAGE_CODES,
  TIMELINE,
  TIMELINE_ERA_BY_ID,
  chapterForProgress,
  isValidChapter,
  isValidLanguage,
  progressFromYear,
  readTimeDial,
  stationForChapter,
} from '../shared/events.js';
import { buildSeedMemories } from './seedData.js';
import { MONUMENTS_3D, PLAZA_IDS, getPlaza } from './monuments3d.js';
import {
  applyTranslations,
  buildVisitorMemory,
  capMemories,
  clean,
  normalizeStoredMemory,
  translationMeta,
} from './memories.js';
import { createMemoryStore } from './persistence.js';
import { createTranslator } from './translate.js';
import { askArchive } from './archive.js';
import { initAi, aiStatus } from './ai.js';

const PORT = Number(process.env.PORT) || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEMORIES_FILE = path.resolve(__dirname, process.env.MEMORIES_FILE || 'memories.json');
const RESET_TOKEN = process.env.RESET_TOKEN || '';
const ASK_COOLDOWN_MS = 1500;
// Time dial: in-motion broadcasts are throttled + volatile (dropping a stale frame is fine);
// once the dial rests for SCRUB_SETTLE_MS one reliable "settled" update + STATE_UPDATED goes out.
const SCRUB_INTERVAL_MS = 25; // ≈ 40 Hz to the other screens
const SCRUB_SETTLE_MS = 160;

console.log('');
await initAi();

// ─── Persistence ────────────────────────────────────────────────────────
const store = createMemoryStore({ file: MEMORIES_FILE });

function loadVisitorMemories() {
  const raw = store.load();
  const seen = new Set();
  const out = [];
  for (const r of raw) {
    const m = normalizeStoredMemory(r);
    if (!m || seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  const skipped = raw.length - out.length;
  console.log(
    `  ✦ Persistence: ${path.relative(process.cwd(), MEMORIES_FILE) || MEMORIES_FILE} — restored ${out.length} visitor memor${out.length === 1 ? 'y' : 'ies'}` +
      (skipped ? ` (skipped ${skipped} invalid/duplicate)` : ''),
  );
  return out;
}

// ─── State ──────────────────────────────────────────────────────────────
const UNLOCKED_ANCHOR = Object.freeze({ locked: false, plazaId: null, pose: null, by: null, updatedAt: null });

function createInitialState(visitorMemories = []) {
  const dial = readTimeDial(TIMELINE.defaultProgress); // 0.85 → 1989
  return {
    activeChapter: DEFAULT_CHAPTER,
    language: DEFAULT_LANGUAGE,
    activeNodeId: null,
    memories: capMemories([...buildSeedMemories(), ...visitorMemories]),
    // v3 Phase 2 (additive) — mirrored here so late joiners get them in STATE_INIT.
    timeProgress: dial.timeProgress,
    currentYear: dial.currentYear,
    nearestStation: dial.nearestStation,
    stationProximity: dial.stationProximity,
    anchor: UNLOCKED_ANCHOR,
  };
}
let globalState = createInitialState(loadVisitorMemories());

const visitorMemories = () => globalState.memories.filter((m) => !m.isSeed);
const persist = () => store.save(visitorMemories());

/** Replace one memory (if it still exists), broadcast, persist. */
function patchMemory(id, fn) {
  const idx = globalState.memories.findIndex((m) => m.id === id);
  if (idx === -1) return null; // removed by reset / cap while we were busy — drop the result
  const memories = globalState.memories.slice();
  memories[idx] = fn(memories[idx]);
  globalState = { ...globalState, memories };
  broadcastState();
  persist();
  return memories[idx];
}

// ─── Translation ────────────────────────────────────────────────────────
const translator = createTranslator({
  onTranslated: (id, translations, provider) => patchMemory(id, (m) => applyTranslations(m, translations, provider)),
  onFailed: (id) =>
    patchMemory(id, (m) => ({
      ...m,
      translation: translationMeta('failed', 'claude', m.translation?.languages ?? [m.originalLanguage]),
    })),
});

// On boot: finish what a restart interrupted, and backfill memories written while offline.
{
  let queued = 0;
  for (const m of visitorMemories()) {
    const complete = (m.translation?.languages?.length ?? 1) >= LANGUAGE_CODES.length;
    if (complete) continue;
    if (translator.available) {
      const pending = patchMemoryQuiet(m.id, (x) => ({ ...x, translation: translationMeta('pending', 'claude', x.translation.languages) }));
      if (translator.enqueue(pending)) queued += 1;
    } else if (m.translation?.status === 'pending') {
      patchMemoryQuiet(m.id, (x) => ({ ...x, translation: translationMeta('original-only', null, x.translation.languages) }));
    }
  }
  if (queued) console.log(`  ✦ Translation: re-queued ${queued} visitor memor${queued === 1 ? 'y' : 'ies'}`);
}
// Same as patchMemory but before any client is connected (no broadcast needed).
function patchMemoryQuiet(id, fn) {
  const idx = globalState.memories.findIndex((m) => m.id === id);
  const memories = globalState.memories.slice();
  memories[idx] = fn(memories[idx]);
  globalState = { ...globalState, memories };
  return memories[idx];
}

// ─── Reset ──────────────────────────────────────────────────────────────
const resetAllowed = (token) => !RESET_TOKEN || token === RESET_TOKEN;

function resetToSeed(source) {
  const visitors = visitorMemories();
  const backupPath = store.backup(visitors); // one rolling safety copy, in case of a mis-tap mid-demo
  translator.clear();
  clearTimeout(scrub.settleTimer);
  anchorOwner = null;
  globalState = createInitialState();
  store.saveNow([]);
  broadcastState();
  console.log(
    `[↺] reset to seed via ${source} — cleared ${visitors.length} visitor memor${visitors.length === 1 ? 'y' : 'ies'}` +
      (backupPath ? ` (backup: ${path.basename(backupPath)})` : ''),
  );
  return { removed: visitors.length };
}

// ─── Time dial (TIME_SCRUB) ─────────────────────────────────────────────
const scrub = { lastEmitAt: 0, settleTimer: null, source: null };

const scrubPayload = (settled) => ({
  timeProgress: globalState.timeProgress,
  currentYear: globalState.currentYear,
  nearestStation: globalState.nearestStation,
  stationProximity: globalState.stationProximity,
  inStation: readTimeDial(globalState.timeProgress).inStation,
  activeChapter: globalState.activeChapter,
  settled,
  source: scrub.source,
});

/** Parse { timeProgress } or { year } → t, or null if invalid. */
function parseScrub(payload) {
  if (Number.isFinite(payload?.timeProgress)) return payload.timeProgress;
  if (Number.isFinite(payload?.year)) return progressFromYear(payload.year);
  return null;
}

/**
 * Move the dial. Writes the reading into globalState; snaps activeChapter (reliable
 * STATE_UPDATED) only when the dial settles into a station that does not already host it.
 */
function applyDial(t, sourceId) {
  const r = readTimeDial(t);
  scrub.source = sourceId;
  globalState = {
    ...globalState,
    timeProgress: r.timeProgress,
    currentYear: r.currentYear,
    nearestStation: r.nearestStation,
    stationProximity: r.stationProximity,
  };
  const nextChapter = chapterForProgress(r.timeProgress, globalState.activeChapter);
  const chapterChanged = nextChapter !== globalState.activeChapter;
  if (chapterChanged) {
    globalState = { ...globalState, activeChapter: nextChapter, activeNodeId: null };
    broadcastState();
    console.log(`[⟳] dial ${r.currentYear} → station ${r.nearestStation} → chapter ${nextChapter}`);
  }
  return { reading: r, chapterChanged };
}

function emitScrub(senderSocket, force = false) {
  const now = Date.now();
  if (force || now - scrub.lastEmitAt >= SCRUB_INTERVAL_MS) {
    scrub.lastEmitAt = now;
    // Others only: the turning screen already shows its own reading (readTimeDial is shared).
    senderSocket.volatile.broadcast.emit(EVENTS.TIME_SCRUB_UPDATED, scrubPayload(false));
  }
  clearTimeout(scrub.settleTimer);
  scrub.settleTimer = setTimeout(settleScrub, SCRUB_SETTLE_MS);
}

/** Dial at rest: one reliable update to everyone + a state snapshot for useSocket() clients. */
function settleScrub() {
  scrub.settleTimer = null;
  io.emit(EVENTS.TIME_SCRUB_UPDATED, scrubPayload(true));
  broadcastState();
}

// ─── AR anchor (LOCK_ANCHOR_STATE) ──────────────────────────────────────
let anchorOwner = null; // socket id that locked it; unlocking happens if that socket leaves

const finiteArray = (v, n) => Array.isArray(v) && v.length === n && v.every(Number.isFinite);

function parseAnchor(payload) {
  if (typeof payload?.locked !== 'boolean') return { error: 'locked (boolean) is required' };
  if (!payload.locked) return { anchor: { locked: false } };
  const plazaId = payload.plazaId ?? TIMELINE_ERA_BY_ID[globalState.nearestStation]?.plazaId ?? null;
  if (plazaId !== null && !PLAZA_IDS.includes(plazaId)) return { error: 'unknown plazaId' };
  let pose = null;
  if (payload.pose != null) {
    const { position, rotation, scale = 1 } = payload.pose;
    if (!finiteArray(position, 3) || !finiteArray(rotation, 4) || !Number.isFinite(scale) || scale <= 0) {
      return { error: 'pose must be { position:[x,y,z], rotation:[x,y,z,w], scale>0 }' };
    }
    pose = { position, rotation, scale };
  }
  return { anchor: { locked: true, plazaId, pose } };
}

function setAnchor(anchor, role, socketId) {
  globalState = {
    ...globalState,
    anchor: anchor.locked
      ? { ...anchor, by: role, updatedAt: new Date().toISOString() }
      : { ...UNLOCKED_ANCHOR, by: role, updatedAt: new Date().toISOString() },
  };
  anchorOwner = anchor.locked ? socketId : null;
  io.emit(EVENTS.ANCHOR_STATE_UPDATED, globalState.anchor);
  broadcastState();
  return globalState.anchor;
}

// ─── Ask the Archive ────────────────────────────────────────────────────
async function handleAsk(payload, source) {
  const result = await askArchive(payload, globalState);
  if (result.error) return result;
  const { answer } = result;
  // Optional: spotlight the testimony the answer drew on (only if it's on screen right now).
  if (payload?.spotlight === true && answer.sourceIds.length) {
    const target = globalState.memories.find((m) => m.id === answer.sourceIds[0]);
    if (target && target.chapter === globalState.activeChapter) {
      globalState = { ...globalState, activeNodeId: target.id };
      broadcastState();
    }
  }
  io.emit(EVENTS.ARCHIVE_ANSWER, answer);
  console.log(`[?] ${source} asked (${answer.language}/${answer.provider}): "${answer.question.slice(0, 60)}"`);
  return result;
}

// ─── HTTP ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '16kb' }));

app.get('/api/health', (_req, res) =>
  res.json({
    ok: true,
    clients: io.engine.clientsCount,
    ai: aiStatus(),
    persistence: { file: path.basename(MEMORIES_FILE), visitorMemories: visitorMemories().length },
  }),
);
app.get('/api/state', (_req, res) => res.json(globalState));
// Schematic miniature plazas for /ar (static seed data; ?plaza=<id> for one).
app.get('/api/monuments-3d', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  const id = req.query.plaza;
  if (id == null) return res.json(MONUMENTS_3D);
  const plaza = getPlaza(String(id));
  if (!plaza) return res.status(404).json({ ok: false, error: 'unknown plaza', plazaIds: PLAZA_IDS });
  res.json({ ...MONUMENTS_3D, plazas: [plaza] });
});
// Demo helper: wipe visitor memories and go back to chapter 1 (npm run reset)
app.post('/api/reset', (req, res) => {
  const token = req.get('x-reset-token') ?? req.body?.token;
  if (!resetAllowed(token)) return res.status(401).json({ ok: false, error: 'invalid reset token' });
  res.json({ ok: true, ...resetToSeed('http') });
});
// Same as the ASK_ARCHIVE socket event, for screens that prefer fetch('/api/ask').
app.post('/api/ask', async (req, res) => {
  const result = await handleAsk(req.body, 'http');
  if (result.error) return res.status(400).json({ ok: false, error: result.error });
  res.json({ ok: true, answer: result.answer });
});

// If the client has been built (`npm run build` in /client), serve it too → single-port demo.
const clientDist = path.resolve(__dirname, '../client/dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

function broadcastState() {
  io.emit(EVENTS.STATE_UPDATED, globalState);
}

const ok = (ack, data = {}) => typeof ack === 'function' && ack({ ok: true, ...data });
const fail = (ack, error) => typeof ack === 'function' && ack({ ok: false, error });

// ─── Socket handlers ────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const role = clean(socket.handshake.query?.role, 20) || 'unknown';
  let lastAskAt = 0;
  console.log(`[+] ${socket.id} (${role}) — ${io.engine.clientsCount} connected`);
  socket.emit(EVENTS.STATE_INIT, globalState);

  socket.on(EVENTS.CHANGE_CHAPTER, (payload, ack) => {
    const chapterId = payload?.chapterId;
    if (!isValidChapter(chapterId)) return fail(ack, 'invalid chapterId');
    if (globalState.activeChapter !== chapterId) {
      globalState = { ...globalState, activeChapter: chapterId, activeNodeId: null };
      // Keep the dial coherent: if it isn't already resting on a station that hosts this
      // chapter, move it to the chapter's station (1989 chapters → 1989, mosaic → 2026).
      const r = readTimeDial(globalState.timeProgress);
      const hosts = r.inStation && TIMELINE_ERA_BY_ID[r.nearestStation].chapters.includes(chapterId);
      const station = stationForChapter(chapterId);
      if (!hosts && station) {
        clearTimeout(scrub.settleTimer);
        applyDial(station.t, socket.id);
        io.emit(EVENTS.TIME_SCRUB_UPDATED, scrubPayload(true));
      }
      broadcastState();
    }
    ok(ack);
  });

  socket.on(EVENTS.TIME_SCRUB, (payload, ack) => {
    const t = parseScrub(payload);
    if (t === null) return fail(ack, 'timeProgress (0..1) or year is required');
    const { reading, chapterChanged } = applyDial(t, socket.id);
    emitScrub(socket, chapterChanged);
    ok(ack, { ...reading, activeChapter: globalState.activeChapter });
  });

  socket.on(EVENTS.LOCK_ANCHOR_STATE, (payload, ack) => {
    const { anchor, error } = parseAnchor(payload);
    if (error) return fail(ack, error);
    const result = setAnchor(anchor, role, socket.id);
    console.log(`[⚓] ${role} ${result.locked ? `locked ${result.plazaId}` : 'unlocked'} the anchor`);
    ok(ack, { anchor: result });
  });

  socket.on(EVENTS.CHANGE_LANGUAGE, (payload, ack) => {
    const language = payload?.language;
    if (!isValidLanguage(language)) return fail(ack, 'invalid language');
    if (globalState.language !== language) {
      globalState = { ...globalState, language };
      broadcastState();
    }
    ok(ack);
  });

  socket.on(EVENTS.SELECT_MEMORY_NODE, (payload, ack) => {
    const id = payload?.id ?? null;
    if (id !== null && !globalState.memories.some((m) => m.id === id)) return fail(ack, 'unknown memory id');
    globalState = { ...globalState, activeNodeId: id };
    broadcastState();
    ok(ack);
  });

  socket.on(EVENTS.ADD_MEMORY, (payload, ack) => {
    const { memory, error } = buildVisitorMemory(payload, globalState, { translating: translator.available });
    if (error) return fail(ack, error);

    globalState = { ...globalState, memories: capMemories([...globalState.memories, memory]) };
    persist();

    io.emit(EVENTS.MEMORY_ADDED, { memory });
    broadcastState();
    console.log(`[✦] memory ${memory.id} by "${memory.author}" (${memory.chapter}/${memory.originalLanguage}) — ${memory.translation.status}`);
    ok(ack, { memory });

    // Translations arrive later as a STATE_UPDATED patch; the celebration never waits for them.
    if (memory.translation.status === 'pending' && !translator.enqueue(memory)) {
      patchMemory(memory.id, (m) => ({ ...m, translation: translationMeta('original-only', null, [m.originalLanguage]) }));
    }
  });

  socket.on(EVENTS.RESET_TO_SEED, (payload, ack) => {
    if (!resetAllowed(payload?.token)) return fail(ack, 'invalid reset token');
    ok(ack, resetToSeed(`socket ${socket.id} (${role})`));
  });

  socket.on(EVENTS.ASK_ARCHIVE, async (payload, ack) => {
    const now = Date.now();
    if (now - lastAskAt < ASK_COOLDOWN_MS) return fail(ack, 'too many questions — wait a moment');
    lastAskAt = now;
    const result = await handleAsk(payload, `socket ${socket.id} (${role})`);
    if (result.error) return fail(ack, result.error);
    ok(ack, { answer: result.answer });
  });

  socket.on('disconnect', () => {
    // A phone that locked the plaza and then left (sleep, closed tab) must not leave
    // tablet/stage showing a stale "locked" state.
    if (anchorOwner === socket.id) setAnchor({ locked: false }, `${role} (disconnected)`, socket.id);
    console.log(`[-] ${socket.id} (${role}) — ${io.engine.clientsCount} connected`);
  });
});

// Flush pending writes on shutdown (Ctrl+C, node --watch restart, concurrently -k).
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    store.flush();
    process.exit(0);
  });
}
process.on('exit', () => store.flush());

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ⏳ Time Capsule server listening on http://0.0.0.0:${PORT}`);
  console.log(`     state: http://localhost:${PORT}/api/state\n`);
});
