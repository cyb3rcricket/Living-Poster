// ============================================================================
// Living Poster V0 — Explorer (movement / look / bounds)
// Slow contemplative walk after Prototype 06 rest. No rendering.
// ============================================================================
//
// createExplorer({ camera, bounds, colliders, canvas })
//   camera     duck-typed Three.js camera (position / rotation / updateMatrixWorld)
//   bounds     { minX, maxX, minY, maxY, minZ, maxZ }  — used as given when passed
//   colliders  [{ type:'circle', x, z, r } | { type:'aabb', minX, maxX, minZ, maxZ }]
//   canvas     element that may request pointer lock (optional)
//
// Returns { enabled, enable(), disable(), setEnabled(bool), update(dt), dispose(), getPose() }
// getPose() → { x, y, z, yaw, pitch }
//
// Feel (world units; P06 rest is the origin of the walk)
//   MAX_SPEED  0.018 u/s     ~ P06 rail pace (ΔZ 0.092 over 5.6 s)
//   ACCEL      0.050 u/s²    ~0.36 s to full walk
//   DAMP       3.6 /s        exponential; half-life ≈ 0.19 s glide
//   YAW        [-0.052, 0.087] rad   (−3.0° … +5.0°); rest +0.0175 is inside
//   PITCH      [-0.055, 0.040] rad   (−3.15° look-up … +2.29° look-down)
//                              tight so sky / water cards stay off-frame
//   Y locked to bounds (default eye-height 0.003). No jump / crouch / fly / bob.
//
// Default bounds (when `bounds` is missing) — P06 rest / central channel only:
//   X [-0.08, +0.04]   Z [1.87, 1.97]   Y 0.003 (painting eye-height)
//   Rest (−0.020, 0.003, 1.892) sits inside. Too small to leave the supported
//   ocean square, enter the Citadel, or pass the Sentinel.
//
// Default colliders (when `colliders` is missing / null):
//   Citadel AABB — P04 mesh (x 0.061–0.685, z 0.63–1.012) padded 0.02
//   Sentinel circle — Layer C card mass at z=1.25, alpha world x ≈ [−0.368, −0.143]
//   Empty array [] is respected as “no extra colliders”.
//
// Collision: XZ positional clamps. AABB shortest-axis push-out, circle radial
// push-out, then re-clamp to bounds. Four iterations. Not a physics engine.
//
// Input: listeners attached only while enabled. WASD / arrows move (W = forward
// along yaw, Three.js −Z at yaw 0). Mouse look only under pointer lock.
// Click canvas to lock; Escape and disable() release. Keys 1–6, P, H untouched
// (no preventDefault / stopPropagation). R is not handled.
// ============================================================================

const REST = Object.freeze({
  x: -0.020,
  y: 0.003,
  z: 1.892,
  yaw: 0.0175,
  pitch: -0.004,
});

const MAX_SPEED = 0.018;
const ACCEL = 0.050;
const DAMP = 3.6;
const MAX_DT = 0.05;

const YAW_MIN = -0.052;
const YAW_MAX = 0.087;
const PITCH_MIN = -0.055;
const PITCH_MAX = 0.040;

const MOUSE_YAW = 0.00042;
const MOUSE_PITCH = 0.00038;

const DEFAULT_BOUNDS = Object.freeze({
  minX: -0.08,
  maxX: 0.04,
  minY: REST.y,
  maxY: REST.y,
  minZ: 1.87,
  maxZ: 1.97,
});

const DEFAULT_COLLIDERS = Object.freeze([
  Object.freeze({
    type: 'aabb',
    minX: 0.041,
    maxX: 0.705,
    minZ: 0.610,
    maxZ: 1.032,
  }),
  Object.freeze({
    type: 'circle',
    x: -0.255,
    z: 1.25,
    r: 0.145,
  }),
]);

const MOVE_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
]);

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function finite(n, fallback) {
  return Number.isFinite(n) ? n : fallback;
}

function resolveBounds(bounds) {
  if (!bounds) return { ...DEFAULT_BOUNDS };
  return {
    minX: finite(bounds.minX, DEFAULT_BOUNDS.minX),
    maxX: finite(bounds.maxX, DEFAULT_BOUNDS.maxX),
    minY: finite(bounds.minY, DEFAULT_BOUNDS.minY),
    maxY: finite(bounds.maxY, DEFAULT_BOUNDS.maxY),
    minZ: finite(bounds.minZ, DEFAULT_BOUNDS.minZ),
    maxZ: finite(bounds.maxZ, DEFAULT_BOUNDS.maxZ),
  };
}

function copyCollider(c) {
  if (!c || typeof c !== 'object') return null;
  if (c.type === 'circle' && Number.isFinite(c.x) && Number.isFinite(c.z) && Number.isFinite(c.r) && c.r > 0) {
    return { type: 'circle', x: c.x, z: c.z, r: c.r };
  }
  if (
    c.type === 'aabb'
    && Number.isFinite(c.minX) && Number.isFinite(c.maxX)
    && Number.isFinite(c.minZ) && Number.isFinite(c.maxZ)
  ) {
    return {
      type: 'aabb',
      minX: Math.min(c.minX, c.maxX),
      maxX: Math.max(c.minX, c.maxX),
      minZ: Math.min(c.minZ, c.maxZ),
      maxZ: Math.max(c.minZ, c.maxZ),
    };
  }
  return null;
}

function resolveColliders(colliders) {
  if (colliders == null) return DEFAULT_COLLIDERS.map(copyCollider);
  if (!Array.isArray(colliders)) return DEFAULT_COLLIDERS.map(copyCollider);
  const out = [];
  for (let i = 0; i < colliders.length; i += 1) {
    const c = copyCollider(colliders[i]);
    if (c) out.push(c);
  }
  return out;
}

function clampPoseToBounds(pose, bounds) {
  pose.x = clamp(pose.x, bounds.minX, bounds.maxX);
  pose.y = clamp(pose.y, bounds.minY, bounds.maxY);
  pose.z = clamp(pose.z, bounds.minZ, bounds.maxZ);
  pose.yaw = clamp(pose.yaw, YAW_MIN, YAW_MAX);
  pose.pitch = clamp(pose.pitch, PITCH_MIN, PITCH_MAX);
}

function separateCircle(pose, c) {
  const dx = pose.x - c.x;
  const dz = pose.z - c.z;
  const d2 = dx * dx + dz * dz;
  const r2 = c.r * c.r;
  if (d2 >= r2) return;
  if (d2 < 1e-12) {
    pose.z = c.z + c.r;
    return;
  }
  const d = Math.sqrt(d2);
  const k = c.r / d;
  pose.x = c.x + dx * k;
  pose.z = c.z + dz * k;
}

function separateAabb(pose, a) {
  if (pose.x < a.minX || pose.x > a.maxX || pose.z < a.minZ || pose.z > a.maxZ) return;
  const left = pose.x - a.minX;
  const right = a.maxX - pose.x;
  const down = pose.z - a.minZ;
  const up = a.maxZ - pose.z;
  const m = Math.min(left, right, down, up);
  if (m === left) pose.x = a.minX;
  else if (m === right) pose.x = a.maxX;
  else if (m === down) pose.z = a.minZ;
  else pose.z = a.maxZ;
}

function resolveCollisions(pose, bounds, colliders) {
  for (let n = 0; n < 4; n += 1) {
    for (let i = 0; i < colliders.length; i += 1) {
      const c = colliders[i];
      if (c.type === 'circle') separateCircle(pose, c);
      else if (c.type === 'aabb') separateAabb(pose, c);
    }
    clampPoseToBounds(pose, bounds);
  }
}

function applyToCamera(camera, pose) {
  if (!camera) return;
  const p = camera.position;
  if (p) {
    if (typeof p.set === 'function') p.set(pose.x, pose.y, pose.z);
    else {
      p.x = pose.x;
      p.y = pose.y;
      p.z = pose.z;
    }
  }
  const r = camera.rotation;
  if (r) {
    // Match P06: rotation.set(pitch, yaw, 0) with default Euler XYZ.
    if (typeof r.set === 'function') r.set(pose.pitch, pose.yaw, 0);
    else {
      r.x = pose.pitch;
      r.y = pose.yaw;
      r.z = 0;
    }
  }
  if (typeof camera.updateMatrixWorld === 'function') camera.updateMatrixWorld(true);
}

function readCameraPose(camera) {
  if (!camera || !camera.position) return { ...REST };
  const p = camera.position;
  const r = camera.rotation || {};
  return {
    x: finite(p.x, REST.x),
    y: finite(p.y, REST.y),
    z: finite(p.z, REST.z),
    yaw: finite(r.y, REST.yaw),
    pitch: finite(r.x, REST.pitch),
  };
}

function doc() {
  return typeof document !== 'undefined' ? document : null;
}

function win() {
  return typeof window !== 'undefined' ? window : null;
}

/**
 * @param {{ camera?: object, bounds?: object, colliders?: object[], canvas?: object }} opts
 */
export function createExplorer({ camera = null, bounds, colliders, canvas = null } = {}) {
  let cam = camera || null;
  let el = canvas || null;
  const box = resolveBounds(bounds);
  const solids = resolveColliders(colliders);

  let enabled = false;
  let alive = true;
  let listening = false;

  const pose = { ...REST };
  clampPoseToBounds(pose, box);
  resolveCollisions(pose, box, solids);

  let vx = 0;
  let vz = 0;
  const keys = new Set();

  const onKeyDown = (e) => {
    if (!e) return;
    if (e.code === 'Escape') {
      releasePointerLock();
      return;
    }
    if (!MOVE_CODES.has(e.code)) return;
    if (typeof e.preventDefault === 'function') e.preventDefault();
    keys.add(e.code);
  };

  const onKeyUp = (e) => {
    if (!e || !MOVE_CODES.has(e.code)) return;
    keys.delete(e.code);
  };

  const onBlur = () => {
    keys.clear();
  };

  const onMouseMove = (e) => {
    const d = doc();
    if (!d || !el || d.pointerLockElement !== el) return;
    const dx = finite(e.movementX, 0);
    const dy = finite(e.movementY, 0);
    // Three.js +Y yaw looks left; mouse-right should look right.
    pose.yaw -= dx * MOUSE_YAW;
    pose.pitch += dy * MOUSE_PITCH;
    pose.yaw = clamp(pose.yaw, YAW_MIN, YAW_MAX);
    pose.pitch = clamp(pose.pitch, PITCH_MIN, PITCH_MAX);
    applyToCamera(cam, pose);
  };

  const onClick = () => {
    if (!enabled || !el || typeof el.requestPointerLock !== 'function') return;
    try {
      const p = el.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {
      /* browser may require a stronger gesture; ignore */
    }
  };

  const onPointerLockChange = () => {};

  function releasePointerLock() {
    const d = doc();
    if (!d) return;
    if (el && d.pointerLockElement === el && typeof d.exitPointerLock === 'function') {
      try { d.exitPointerLock(); } catch (_) { /* ignore */ }
    }
  }

  function attach() {
    if (listening) return;
    listening = true;
    const w = win();
    const d = doc();
    if (w) {
      w.addEventListener('keydown', onKeyDown);
      w.addEventListener('keyup', onKeyUp);
      w.addEventListener('blur', onBlur);
    }
    if (d) {
      d.addEventListener('mousemove', onMouseMove);
      d.addEventListener('pointerlockchange', onPointerLockChange);
    }
    if (el && typeof el.addEventListener === 'function') {
      el.addEventListener('click', onClick);
    }
  }

  function detach() {
    if (!listening) return;
    listening = false;
    const w = win();
    const d = doc();
    if (w) {
      w.removeEventListener('keydown', onKeyDown);
      w.removeEventListener('keyup', onKeyUp);
      w.removeEventListener('blur', onBlur);
    }
    if (d) {
      d.removeEventListener('mousemove', onMouseMove);
      d.removeEventListener('pointerlockchange', onPointerLockChange);
    }
    if (el && typeof el.removeEventListener === 'function') {
      el.removeEventListener('click', onClick);
    }
    keys.clear();
  }

  function enable() {
    if (!alive || enabled) return;
    enabled = true;
    const adopted = readCameraPose(cam);
    pose.x = adopted.x;
    pose.y = adopted.y;
    pose.z = adopted.z;
    pose.yaw = adopted.yaw;
    pose.pitch = adopted.pitch;
    clampPoseToBounds(pose, box);
    resolveCollisions(pose, box, solids);
    vx = 0;
    vz = 0;
    keys.clear();
    attach();
    applyToCamera(cam, pose);
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    detach();
    releasePointerLock();
    vx = 0;
    vz = 0;
  }

  function setEnabled(value) {
    if (value) enable();
    else disable();
  }

  function wishXZ() {
    let wx = 0;
    let wz = 0;
    const yaw = pose.yaw;
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    if (keys.has('KeyW') || keys.has('ArrowUp')) {
      wx += fwdX;
      wz += fwdZ;
    }
    if (keys.has('KeyS') || keys.has('ArrowDown')) {
      wx -= fwdX;
      wz -= fwdZ;
    }
    if (keys.has('KeyD') || keys.has('ArrowRight')) {
      wx += rightX;
      wz += rightZ;
    }
    if (keys.has('KeyA') || keys.has('ArrowLeft')) {
      wx -= rightX;
      wz -= rightZ;
    }
    const len = Math.hypot(wx, wz);
    if (len > 1e-8) {
      wx /= len;
      wz /= len;
    }
    return { wx, wz, len };
  }

  function update(dtRaw) {
    if (!alive || !enabled) return;
    const dt = clamp(finite(dtRaw, 0), 0, MAX_DT);
    if (dt <= 0) {
      applyToCamera(cam, pose);
      return;
    }

    const { wx, wz, len } = wishXZ();
    if (len > 0) {
      vx += wx * ACCEL * dt;
      vz += wz * ACCEL * dt;
      const speed = Math.hypot(vx, vz);
      if (speed > MAX_SPEED) {
        const s = MAX_SPEED / speed;
        vx *= s;
        vz *= s;
      }
    } else {
      const f = Math.exp(-DAMP * dt);
      vx *= f;
      vz *= f;
      if (vx * vx + vz * vz < 1e-12) {
        vx = 0;
        vz = 0;
      }
    }

    const prevX = pose.x;
    const prevZ = pose.z;
    pose.x += vx * dt;
    pose.z += vz * dt;
    pose.y = clamp(pose.y, box.minY, box.maxY);
    resolveCollisions(pose, box, solids);
    if (dt > 0) {
      vx = (pose.x - prevX) / dt;
      vz = (pose.z - prevZ) / dt;
    }

    applyToCamera(cam, pose);
  }

  function getPose() {
    return {
      x: pose.x,
      y: pose.y,
      z: pose.z,
      yaw: pose.yaw,
      pitch: pose.pitch,
    };
  }

  function dispose() {
    disable();
    alive = false;
    cam = null;
    el = null;
  }

  return {
    get enabled() {
      return enabled;
    },
    enable,
    disable,
    setEnabled,
    update,
    dispose,
    getPose,
  };
}
