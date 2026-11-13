/**
 * JSON-file persistence for visitor memories.
 *
 * Only visitor memories are stored — seeds are rebuilt from seedData.js on boot so
 * edits to the seeds always win. Writes are debounced, synchronous and atomic
 * (write `*.tmp`, then rename) so a crash mid-write never leaves half a file.
 * Chapter / language are deliberately NOT persisted: they change on every tap and
 * the demo should boot into chapter 1 anyway.
 *
 * File shape: { version: 1, savedAt: ISOString, memories: Memory[] }
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const FILE_VERSION = 1;

// Short debounce: on Windows a killed process (node --watch restart, concurrently -k) gets no
// signal handler, so anything still waiting in the debounce window would be lost.
export function createMemoryStore({ file, debounceMs = 100, log = console }) {
  const dir = path.dirname(file);
  const backupFile = file.replace(/\.json$/i, '') + '.backup.json';
  let timer = null;
  let pending = null; // latest snapshot waiting to be written

  function writeAtomic(target, memories) {
    mkdirSync(dir, { recursive: true });
    const body = JSON.stringify({ version: FILE_VERSION, savedAt: new Date().toISOString(), memories }, null, 2);
    const tmp = `${target}.tmp`;
    writeFileSync(tmp, body, 'utf8');
    renameSync(tmp, target);
  }

  /** Returns the raw stored visitor memories (unvalidated) — the caller normalises them. */
  function load() {
    if (!existsSync(file)) return [];
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8'));
      const list = Array.isArray(parsed) ? parsed : parsed?.memories;
      if (!Array.isArray(list)) throw new Error('no "memories" array');
      return list;
    } catch (err) {
      // Never silently overwrite a file we could not read: move it aside, start clean.
      const aside = file.replace(/\.json$/i, '') + `.corrupt-${Date.now()}.json`;
      try {
        renameSync(file, aside);
        log.warn(`[persist] could not read ${path.basename(file)} (${err.message}); moved it to ${path.basename(aside)}`);
      } catch {
        log.warn(`[persist] could not read ${path.basename(file)} (${err.message}); starting empty`);
      }
      return [];
    }
  }

  function flush() {
    if (timer) clearTimeout(timer);
    timer = null;
    if (!pending) return;
    const memories = pending;
    pending = null;
    try {
      writeAtomic(file, memories);
    } catch (err) {
      log.error(`[persist] write failed: ${err.message}`);
    }
  }

  /** Debounced save of the given visitor memories. */
  function save(memories) {
    pending = memories;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  }

  /** Immediate save (used by reset so a crash right after can't resurrect old memories). */
  function saveNow(memories) {
    pending = memories;
    flush();
  }

  /** Keep one rolling safety copy (e.g. before a reset wipes the archive). */
  function backup(memories) {
    if (!memories.length) return null;
    try {
      writeAtomic(backupFile, memories);
      return backupFile;
    } catch (err) {
      log.error(`[persist] backup failed: ${err.message}`);
      return null;
    }
  }

  return { file, backupFile, load, save, saveNow, flush, backup };
}
