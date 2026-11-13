import { useEffect, useRef, useState } from 'react';

/**
 * Rear-camera stream for the WebAR overlay.
 * status: 'off' | 'starting' | 'live' | 'denied' | 'unsupported'
 * Camera needs a secure context (https or localhost) — use the cloudflared tunnel on phones.
 */
export function useCamera(enabled) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('off');

  useEffect(() => {
    if (!enabled) {
      setStatus('off');
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }
    let stream;
    let cancelled = false;
    setStatus('starting');
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        setStatus('live');
      })
      .catch(() => !cancelled && setStatus('denied'));

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled]);

  return { videoRef, status };
}
