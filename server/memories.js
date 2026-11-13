/**
 * Memory construction + validation helpers (visitor memories).
 * Seeds come from seedData.js; everything here is about live / persisted ones.
 */
import crypto from 'node:crypto';
import {
  LANGUAGE_CODES,
  TRANSLATION_STATUSES,
  isValidChapter,
  isValidLanguage,
  isValidSymbol,
} from '../shared/events.js';

export const MAX_MEMORIES = 200;
export const MAX_NAME = 40;
export const MAX_TEXT = 600;
export const MAX_TITLE = 80;
// Translations can run longer than the original (e.g. RO → DE), so stored text gets more room.
const MAX_STORED_TEXT = 1200;
const MAX_STORED_TITLE = 160;

export const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function spawnPosition() {
  const angle = Math.random() * Math.PI * 2;
  const radius = 1.4 + Math.random() * 0.7;
  return {
    x: +(Math.cos(angle) * radius).toFixed(3),
    y: +(0.2 + Math.random() * 0.9).toFixed(3),
    z: +(Math.sin(angle) * radius).toFixed(3),
  };
}

/** `{ [orig]: value }` → `{ ro, en, hu, de, sr }`, every missing language filled with the original. */
export function fillAllLanguages(obj, originalLanguage) {
  const original = obj?.[originalLanguage] ?? '';
  return Object.fromEntries(LANGUAGE_CODES.map((l) => [l, obj?.[l] || original]));
}

export function translationMeta(status, provider, languages) {
  return {
    status,
    provider: provider ?? null,
    languages: LANGUAGE_CODES.filter((l) => languages.includes(l)),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Build a visitor memory from an ADD_MEMORY payload. Returns `{ error }` or `{ memory }`.
 * All 5 language keys are populated immediately (original text as fallback) so every
 * screen has something to render; `translation.status` says whether real translations follow.
 */
export function buildVisitorMemory(payload, { language: activeLanguage, activeChapter }, { translating }) {
  const text = clean(payload?.text, MAX_TEXT);
  if (!text) return { error: 'text is required' };
  const language = isValidLanguage(payload?.language) ? payload.language : activeLanguage;
  const chapter = isValidChapter(payload?.chapter) ? payload.chapter : activeChapter;
  const author = clean(payload?.name, MAX_NAME) || 'Anonymous';
  const title = clean(payload?.title, MAX_TITLE) || clean(text.split(/[.!?]/)[0], 60) || text.slice(0, 60);

  return {
    memory: {
      id: `mem-${crypto.randomUUID().slice(0, 8)}`,
      chapter,
      author,
      role: null,
      year: new Date().getFullYear(),
      symbol: isValidSymbol(payload?.symbol) ? payload.symbol : 'candle',
      position: spawnPosition(),
      title: fillAllLanguages({ [language]: title }, language),
      text: fillAllLanguages({ [language]: text }, language),
      originalLanguage: language,
      composite: false,
      isSeed: false,
      createdAt: new Date().toISOString(),
      translation: translationMeta(translating ? 'pending' : 'original-only', translating ? 'claude' : null, [language]),
    },
  };
}

/** Merge finished translations (`{ [lang]: { title, text } }`) into a memory; the original is never overwritten. */
export function applyTranslations(memory, translations, provider) {
  const orig = memory.originalLanguage;
  const title = { ...memory.title };
  const text = { ...memory.text };
  const done = [orig];
  for (const lang of LANGUAGE_CODES) {
    if (lang === orig) continue;
    const t = translations?.[lang];
    const tt = clean(t?.text, MAX_STORED_TEXT);
    if (!tt) continue;
    text[lang] = tt;
    title[lang] = clean(t?.title, MAX_STORED_TITLE) || title[lang];
    done.push(lang);
  }
  // Partial results still count as translated; `translation.languages` says which ones are real.
  const status = done.length > 1 ? 'translated' : 'failed';
  return { ...memory, title, text, translation: translationMeta(status, provider, done) };
}

const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/**
 * Validate + normalise a memory read from disk (the file may be hand-edited or from an
 * older version). Returns null if it is unusable.
 */
export function normalizeStoredMemory(m) {
  if (!m || typeof m !== 'object') return null;
  if (typeof m.id !== 'string' || !/^mem-[\w-]{1,40}$/.test(m.id)) return null;
  if (!isValidChapter(m.chapter)) return null;
  const originalLanguage = isValidLanguage(m.originalLanguage) ? m.originalLanguage : null;
  if (!originalLanguage) return null;

  const pick = (obj, max) =>
    Object.fromEntries(
      LANGUAGE_CODES.filter((l) => typeof obj?.[l] === 'string' && obj[l].trim()).map((l) => [l, clean(obj[l], max)]),
    );
  const text = pick(m.text, MAX_STORED_TEXT);
  if (!text[originalLanguage]) return null;
  const title = pick(m.title, MAX_STORED_TITLE);
  if (!title[originalLanguage]) title[originalLanguage] = clean(text[originalLanguage].split(/[.!?]/)[0], 60);

  const pos = m.position ?? {};
  const position =
    Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.z)
      ? { x: pos.x, y: pos.y, z: pos.z }
      : spawnPosition();

  // Languages with genuine text: trust stored metadata if present, else only the original.
  const storedLangs = Array.isArray(m.translation?.languages) ? m.translation.languages : [originalLanguage];
  const genuine = [originalLanguage, ...storedLangs.filter((l) => isValidLanguage(l) && text[l])];
  const status = TRANSLATION_STATUSES.includes(m.translation?.status) ? m.translation.status : 'original-only';

  return {
    id: m.id,
    chapter: m.chapter,
    author: clean(m.author, MAX_NAME) || 'Anonymous',
    role: null,
    year: num(m.year, new Date().getFullYear()),
    symbol: isValidSymbol(m.symbol) ? m.symbol : 'candle',
    position,
    title: fillAllLanguages(title, originalLanguage),
    text: fillAllLanguages(text, originalLanguage),
    originalLanguage,
    composite: false,
    isSeed: false,
    createdAt: typeof m.createdAt === 'string' && !Number.isNaN(Date.parse(m.createdAt)) ? m.createdAt : new Date().toISOString(),
    translation: {
      ...translationMeta(status, m.translation?.provider ?? null, [...new Set(genuine)]),
      updatedAt: m.translation?.updatedAt ?? new Date().toISOString(),
    },
  };
}

/** Keep seeds forever; drop the oldest visitor memories beyond MAX_MEMORIES. Mutates + returns the array. */
export function capMemories(memories) {
  while (memories.length > MAX_MEMORIES) {
    const idx = memories.findIndex((m) => !m.isSeed);
    if (idx === -1) break;
    memories.splice(idx, 1);
  }
  return memories;
}
