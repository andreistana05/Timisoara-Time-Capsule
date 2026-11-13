/**
 * 3DoF "world lock" for the AR lens. When the phone rotates, the virtual camera
 * rotates by the same amount, so the hologram appears fixed above the tablet
 * instead of stuck to the screen. This is not marker tracking, but it gives a
 * convincing AR effect without any library.
 *
 * status: 'unavailable' | 'needs-permission' (iOS) | 'waiting' | 'active' | 'denied'
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function useGyro() {
  const orientation = useRef(null);
  const [status, setStatus] = useState(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return 'unavailable';
    return typeof window.DeviceOrientationEvent.requestPermission === 'function' ? 'needs-permission' : 'waiting';
  });
  const statusRef = useRef(status);
  statusRef.current = status;

  const attach = useCallback(() => {
    const onOri = (e) => {
      if (e.alpha == null || e.beta == null) return;
      orientation.current = { alpha: e.alpha, beta: e.beta, gamma: e.gamma ?? 0 };
      if (statusRef.current !== 'active') setStatus('active');
    };
    window.addEventListener('deviceorientation', onOri);
    return () => window.removeEventListener('deviceorientation', onOri);
  }, []);

  useEffect(() => {
    if (status !== 'waiting' && status !== 'active') return;
    return attach();
  }, [status === 'waiting' || status === 'active', attach]); // eslint-disable-line react-hooks/exhaustive-deps

  /** iOS only: must be called from a tap. */
  const requestPermission = useCallback(async () => {
    try {
      const res = await window.DeviceOrientationEvent.requestPermission();
      setStatus(res === 'granted' ? 'waiting' : 'denied');
    } catch {
      setStatus('denied');
    }
  }, []);

  return { orientation, status, requestPermission };
}

/* ───────── R3F component: drives the camera from device orientation ───────── */
const DEG = Math.PI / 180;
const euler = new THREE.Euler();
const zee = new THREE.Vector3(0, 0, 1);
const qScreen = new THREE.Quaternion();
const qWorld = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // camera looks out the back of the device
const qNow = new THREE.Quaternion();
const qDelta = new THREE.Quaternion();
const qTarget = new THREE.Quaternion();

function deviceQuaternion(out, { alpha, beta, gamma }) {
  const screenAngle = (window.screen?.orientation?.angle ?? window.orientation ?? 0) * DEG;
  euler.set(beta * DEG, alpha * DEG, -gamma * DEG, 'YXZ');
  out.setFromEuler(euler);
  out.multiply(qWorld);
  out.multiply(qScreen.setFromAxisAngle(zee, -screenAngle));
  return out;
}

export function GyroCamera({ orientation, enabled, recenterKey, lookAt = [0, -0.1, 0] }) {
  const { camera } = useThree();
  const base = useRef(null);
  const camBase = useRef(new THREE.Quaternion());

  useEffect(() => {
    base.current = null; // capture a new baseline on enable or recenter
  }, [enabled, recenterKey]);

  useFrame(() => {
    if (!enabled || !orientation.current) return;
    deviceQuaternion(qNow, orientation.current);
    if (!base.current) {
      base.current = qNow.clone();
      camera.lookAt(...lookAt);
      camBase.current.copy(camera.quaternion);
      return;
    }
    qDelta.copy(base.current).invert().multiply(qNow);
    qTarget.copy(camBase.current).multiply(qDelta);
    camera.quaternion.slerp(qTarget, 0.35);
  });
  return null;
}
