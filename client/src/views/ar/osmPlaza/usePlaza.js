/**
 * Loads the authentic OSM plazas from the server (GET /api/monuments-3d?plaza=<id>) and decides
 * which one /ar should show. Owner: Member 3. Data contract: server/osmPlazas.js (Member 1).
 */
import { useEffect, useState } from 'react';
import { TIMELINE_ERAS, TIMELINE_ERA_BY_ID } from '@shared/events.js';

const ALL_PLAZA_IDS = [...new Set(TIMELINE_ERAS.map((e) => e.plazaId))];
const cache = new Map(); // plazaId → Plaza (resolved)
const inflight = new Map(); // plazaId → Promise<Plaza>

/** One request per plaza for the whole tab; the promise is shared, so StrictMode's double effect is harmless. */
function loadPlaza(id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  if (!inflight.has(id)) {
    const p = fetch(`/api/monuments-3d?plaza=${encodeURIComponent(id)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const plaza = json?.plazas?.[0];
        if (!plaza || !Array.isArray(plaza.buildings)) throw new Error('bad payload');
        cache.set(id, plaza);
        return plaza;
      })
      .finally(() => inflight.delete(id));
    inflight.set(id, p);
  }
  return inflight.get(id);
}

let prefetched = false;
function prefetchOthers() {
  if (prefetched) return;
  prefetched = true;
  // stagger so the first plaza's build-up isn't competing with downloads
  ALL_PLAZA_IDS.forEach((id, i) => setTimeout(() => loadPlaza(id).catch(() => {}), 600 + i * 400));
}

/** @returns {{ plaza: object|null, status: 'idle'|'loading'|'ready'|'error' }} */
export function usePlaza(plazaId) {
  const [res, setRes] = useState(() =>
    plazaId && cache.has(plazaId) ? { id: plazaId, plaza: cache.get(plazaId), status: 'ready' } : { id: plazaId, plaza: null, status: plazaId ? 'loading' : 'idle' },
  );

  useEffect(() => {
    if (!plazaId) {
      setRes({ id: null, plaza: null, status: 'idle' });
      return;
    }
    if (cache.has(plazaId)) {
      setRes({ id: plazaId, plaza: cache.get(plazaId), status: 'ready' });
      prefetchOthers();
      return;
    }
    const ctrl = new AbortController(); // only used to ignore late results after unmount / id change
    setRes({ id: plazaId, plaza: null, status: 'loading' });
    loadPlaza(plazaId)
      .then((plaza) => {
        if (ctrl.signal.aborted) return;
        setRes({ id: plazaId, plaza, status: 'ready' });
        prefetchOthers();
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        console.warn('[ar] plaza load failed', plazaId, err.message);
        setRes({ id: plazaId, plaza: null, status: 'error' });
      });
    return () => ctrl.abort();
  }, [plazaId]);

  // never hand back a stale plaza for a different id
  return res.id === plazaId ? res : { plaza: null, status: plazaId ? 'loading' : 'idle' };
}

/**
 * Which plaza to show, read-only from the socket snapshot.
 * Piața Maria is not in the OSM data → null (keep the procedural diorama).
 */
export function resolvePlazaId(state) {
  if (!state) return null;
  if (state.activeChapter === '1989_piata_maria') return null;
  if (state.anchor?.locked && state.anchor.plazaId) return state.anchor.plazaId;
  return TIMELINE_ERA_BY_ID[state.nearestStation]?.plazaId ?? null;
}
