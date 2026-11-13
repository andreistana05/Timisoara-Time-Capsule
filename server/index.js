/**
 * TIMIȘOARA TIME CAPSULE — realtime state server
 * Express + Socket.io, single in-memory `globalState`, broadcast on every change.
 * Owner: Member 1 (Backend, State & AI). Contract lives in /shared/events.js.
 */
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';

import {
  EVENTS,
  DEFAULT_CHAPTER,
  DEFAULT_LANGUAGE,
  isValidChapter,
  isValidLanguage,
  isValidSymbol,
} from '../shared/events.js';
import { buildSeedMemories } from './seedData.js';

const PORT = Number(process.env.PORT) || 3001;
const MAX_MEMORIES = 200;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── State ──────────────────────────────────────────────────────────────
function createInitialState() {
  return {
    activeChapter: DEFAULT_CHAPTER,
    language: DEFAULT_LANGUAGE,
    activeNodeId: null,
    memories: buildSeedMemories(),
  };
}
let globalState = createInitialState();

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function spawnPosition() {
  const angle = Math.random() * Math.PI * 2;
  const radius = 1.4 + Math.random() * 0.7;
  return {
    x: +(Math.cos(angle) * radius).toFixed(3),
    y: +(0.2 + Math.random() * 0.9).toFixed(3),
    z: +(Math.sin(angle) * radius).toFixed(3),
  };
}

// ─── HTTP ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, clients: io.engine.clientsCount }));
app.get('/api/state', (_req, res) => res.json(globalState));
// Demo helper: wipe user memories and go back to chapter 1 (curl -X POST :3001/api/reset)
app.post('/api/reset', (_req, res) => {
  globalState = createInitialState();
  broadcastState();
  res.json({ ok: true });
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
  console.log(`[+] ${socket.id} (${role}) — ${io.engine.clientsCount} connected`);
  socket.emit(EVENTS.STATE_INIT, globalState);

  socket.on(EVENTS.CHANGE_CHAPTER, (payload, ack) => {
    const chapterId = payload?.chapterId;
    if (!isValidChapter(chapterId)) return fail(ack, 'invalid chapterId');
    if (globalState.activeChapter !== chapterId) {
      globalState = { ...globalState, activeChapter: chapterId, activeNodeId: null };
      broadcastState();
    }
    ok(ack);
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
    const text = clean(payload?.text, 600);
    if (!text) return fail(ack, 'text is required');
    const language = isValidLanguage(payload?.language) ? payload.language : globalState.language;
    const chapter = isValidChapter(payload?.chapter) ? payload.chapter : globalState.activeChapter;
    const author = clean(payload?.name, 40) || 'Anonymous';
    const title = clean(payload?.title, 80) || text.split(/[.!?]/)[0].slice(0, 60);

    const memory = {
      id: `mem-${crypto.randomUUID().slice(0, 8)}`,
      chapter,
      author,
      role: null,
      year: new Date().getFullYear(),
      symbol: isValidSymbol(payload?.symbol) ? payload.symbol : 'candle',
      position: spawnPosition(),
      title: { [language]: title },
      text: { [language]: text },
      originalLanguage: language,
      composite: false,
      isSeed: false,
      createdAt: new Date().toISOString(),
    };

    const memories = [...globalState.memories, memory];
    // keep seeds forever, trim oldest user memories if we overflow
    while (memories.length > MAX_MEMORIES) {
      const idx = memories.findIndex((m) => !m.isSeed);
      if (idx === -1) break;
      memories.splice(idx, 1);
    }
    globalState = { ...globalState, memories };

    io.emit(EVENTS.MEMORY_ADDED, { memory });
    broadcastState();
    console.log(`[✦] memory ${memory.id} by "${author}" (${chapter}/${language})`);
    ok(ack, { memory });
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id} (${role}) — ${io.engine.clientsCount} connected`);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ⏳ Time Capsule server listening on http://0.0.0.0:${PORT}`);
  console.log(`     state: http://localhost:${PORT}/api/state\n`);
});
