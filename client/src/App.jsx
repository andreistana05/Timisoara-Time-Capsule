/**
 * App shell & routes — FROZEN after scaffold (coordinate before editing).
 * Views are lazy-loaded so the phone only downloads three.js on /ar.
 */
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Launchpad from './components/Launchpad.jsx';

const TabletView = lazy(() => import('./views/tablet/TabletView.jsx'));
const ArView = lazy(() => import('./views/ar/ArView.jsx'));
const StageView = lazy(() => import('./views/stage/StageView.jsx'));

function Loading() {
  return (
    <div className="flex h-full items-center justify-center bg-obsidian">
      <div className="h-14 w-14 animate-spin rounded-full border-2 border-amber-gold/20 border-t-amber-gold" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Launchpad />} />
        <Route path="/tablet" element={<TabletView />} />
        <Route path="/ar" element={<ArView />} />
        <Route path="/stage" element={<StageView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
