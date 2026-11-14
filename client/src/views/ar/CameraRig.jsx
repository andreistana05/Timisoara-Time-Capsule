/**
 * Camera framing for /ar. Owner: Member 3.
 *
 * The old initialCamera() fitted the 4.8-unit orb ring to the screen WIDTH, which on a portrait phone
 * (aspect ≈ 0.46) pushed the camera to the 11.5 max and made everything tiny. planFrame() frames the CONTENT:
 *   dist = max( halfW / (tan(fov/2)·aspect), max(halfD, contentH/2) / tan(fov/2) ) × 1.1, clamped [3.2, 9]
 * (in portrait the decorative pedestal ring may overflow the screen edges). Because that framing is tighter than the
 * orb orbit (radius up to 2.1), the orbit is pulled in (`spread`) to fit the visible width, and lifted (`lift`) to
 * clear the roofs under that smaller ring. <CameraRig> eases to the plan over ~0.8 s on plaza change / rotation, and
 * applies zoom requests (pinch / − + in AR camera mode) by dollying along the view direction, clamped [1.8, 9].
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export const MIN_DIST = 1.8;
export const MAX_DIST = 9;
const FIT_MIN = 3.2;
const DIR = new THREE.Vector3(0, 0.42, 0.9).normalize(); // same elevation as before
const EASE_S = 0.8;
const ORB_R_MAX = 2.1; // outermost orb slot radius (seed positions)
const ORB_R_MIN = 1.2; // innermost orb slot radius
const ORB_LOW = 0.38; // lowest orb above the orbit base (slot y ≥ 0.45, bob ±0.07)
const ORB_HIGH = 1.45 + 0.24; // highest orb + its glow

/**
 * @param ext     fittedExtents(...) of the shown plaza, or null (procedural diorama → the original framing)
 * @param aspect  canvas width / height
 * @returns {{ dist, target:[x,y,z], spread, lift, orbTop }}
 */
export function planFrame(ext, aspect, fovDeg = 50, groupY = -0.6) {
  const tanH = Math.tan(THREE.MathUtils.degToRad(fovDeg / 2));
  if (!ext) {
    const dist = THREE.MathUtils.clamp(2.4 / (tanH * Math.min(aspect, 1.4)), 5, 11.5);
    return { dist, target: [0, 0.1, 0], spread: 1, lift: 0, orbTop: ORB_HIGH };
  }
  // 1) frame the buildings
  let dist = THREE.MathUtils.clamp(Math.max(ext.halfW / (tanH * aspect), Math.max(ext.halfD, ext.top / 2) / tanH) * 1.1, FIT_MIN, MAX_DIST);
  // 2) pull the orbit in so the outermost orb stays inside ~85 % of the visible half-width
  const visHalfW = tanH * aspect * dist;
  const spread = THREE.MathUtils.clamp((visHalfW * 0.85) / ORB_R_MAX, 0.45, 1);
  // 3) lift the orbit over the roofs under the (smaller) ring
  const lift = Math.max(0, ext.ringTopAt(ORB_R_MIN * spread) + 0.25 - ORB_LOW);
  const orbTop = lift + ORB_HIGH;
  // 4) make sure the orbs also fit vertically (matters in landscape)
  dist = THREE.MathUtils.clamp(Math.max(dist, ((orbTop / 2) / tanH) * 1.1), FIT_MIN, MAX_DIST);
  const target = [0, groupY + 0.3 * Math.max(ext.top, orbTop * 0.8), 0];
  return { dist, target, spread, lift, orbTop };
}

const _fwd = new THREE.Vector3();
const _p = new THREE.Vector3();

/**
 * @param plan      planFrame(...) result
 * @param planKey   changes when the plan should be (re)applied (plaza id, mode, aspect)
 * @param zoomRef   { current: number } pending zoom factor (< 1 = closer), consumed here
 */
export function CameraRig({ plan, planKey, zoomRef }) {
  const { camera, controls } = useThree();
  const anim = useRef(null);
  const lastTarget = useRef(new THREE.Vector3(...plan.target));

  useEffect(() => {
    const target = new THREE.Vector3(...plan.target);
    anim.current = {
      t0: null,
      fromPos: camera.position.clone(),
      toPos: target.clone().addScaledVector(DIR, plan.dist),
      fromTarget: controls?.target ? controls.target.clone() : target.clone(),
      toTarget: target,
    };
    lastTarget.current.copy(target);
  }, [planKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => {
    const a = anim.current;
    if (a) {
      if (a.t0 === null) a.t0 = clock.elapsedTime;
      const k = Math.min(1, (clock.elapsedTime - a.t0) / EASE_S);
      const e = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(a.fromPos, a.toPos, e);
      if (controls?.target) {
        controls.target.lerpVectors(a.fromTarget, a.toTarget, e);
        controls.update();
      }
      if (k >= 1) anim.current = null;
    }
    // pinch / button zoom (AR camera mode; OrbitControls handles its own zoom in orbit mode)
    const z = zoomRef?.current ?? 1;
    if (z !== 1 && zoomRef) {
      zoomRef.current = 1;
      const tgt = controls?.target ?? _p.copy(lastTarget.current);
      const d = camera.position.distanceTo(tgt);
      const nd = THREE.MathUtils.clamp(d * z, MIN_DIST, MAX_DIST);
      camera.getWorldDirection(_fwd);
      camera.position.addScaledVector(_fwd, d - nd);
    }
  });
  return null;
}
