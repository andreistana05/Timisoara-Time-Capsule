/**
 * useSocket — the ONE shared realtime hook. FROZEN after scaffold.
 *
 * A single module-level socket is shared by every component, so calling
 * useSocket() in many places never opens extra connections.
 *
 * Returns:
 *   state            globalState from the server (null until STATE_INIT arrives)
 *   connected        boolean
 *   changeChapter(chapterId)
 *   changeLanguage(language)
 *   selectMemoryNode(id | null)
 *   addMemory({ name, text, symbol, language?, chapter?, title? }) -> Promise<ack>
 *   lastAddedMemory  { memory, receivedAt } | null — changes once per MEMORY_ADDED
 */
import { useSyncExternalStore } from 'react';
import { io } from 'socket.io-client';
import { EVENTS } from '@shared/events.js';

// Default = same origin. In dev, Vite proxies /socket.io → :3001, so this also
// works through a single HTTPS tunnel on the phone. Override with VITE_SOCKET_URL.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

let store = { state: null, connected: false, lastAddedMemory: null };
const listeners = new Set();
const setStore = (patch) => {
  store = { ...store, ...patch };
  listeners.forEach((l) => l());
};

let socket = null;
function getSocket() {
  if (socket) return socket;
  const role = window.location.pathname.replace(/\//g, '') || 'lobby';
  socket = io(SOCKET_URL, { query: { role }, transports: ['websocket', 'polling'] });
  socket.on('connect', () => setStore({ connected: true }));
  socket.on('disconnect', () => setStore({ connected: false }));
  socket.on(EVENTS.STATE_INIT, (state) => setStore({ state }));
  socket.on(EVENTS.STATE_UPDATED, (state) => setStore({ state }));
  socket.on(EVENTS.MEMORY_ADDED, ({ memory }) => setStore({ lastAddedMemory: { memory, receivedAt: Date.now() } }));
  if (import.meta.env.DEV) window.__timecapsuleSocket = socket;
  return socket;
}

const emit = (event, payload) =>
  new Promise((resolve) => {
    getSocket().timeout(5000).emit(event, payload, (err, ack) => resolve(err ? { ok: false, error: 'timeout' } : ack));
  });

// Optimistic local patch so the tapping screen feels instant; server broadcast confirms.
const patchState = (patch) => store.state && setStore({ state: { ...store.state, ...patch } });

const actions = {
  changeChapter: (chapterId) => {
    patchState({ activeChapter: chapterId, activeNodeId: null });
    return emit(EVENTS.CHANGE_CHAPTER, { chapterId });
  },
  changeLanguage: (language) => {
    patchState({ language });
    return emit(EVENTS.CHANGE_LANGUAGE, { language });
  },
  selectMemoryNode: (id) => {
    patchState({ activeNodeId: id });
    return emit(EVENTS.SELECT_MEMORY_NODE, { id });
  },
  addMemory: (memory) => emit(EVENTS.ADD_MEMORY, memory),
};

const subscribe = (cb) => {
  getSocket();
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getSnapshot = () => store;

export function useSocket() {
  const snap = useSyncExternalStore(subscribe, getSnapshot);
  return { ...snap, ...actions };
}

export default useSocket;
