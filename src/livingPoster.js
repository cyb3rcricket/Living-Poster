import * as THREE from 'three';
import { PaintMeltEffect } from './effects/paintMelt.js';
import { createLivingPosterWorld } from './livingPosterWorld.js';
import { createExplorer } from './livingPosterExplore.js';
import { createQualityController } from './livingPosterQuality.js';

// ============================================================================
// Living Poster V1 — "Melt into the World"
//
// Continuous "painting becomes world" pipeline:
//   0.0–1.0s:  POSTER           — Untouched flat painting, pixel-registered at (0, 0, 2.0)
//   1.0–4.0s:  AWAKENING        — Localized cyan shimmer, ribbon breathing, flare bloom, flecks
//   4.0–8.0s:  MELT             — Viscous GPU curl noise melt, semantic depth separation, shards
//   8.0s:      THRESHOLD        — Camera crosses canvas threshold (Z < 1.78), lifecycle cleanup
//   8.0–13.0s: WORLD GENERATION — Corridor flight, progressive chunk construction ahead of lens
//   13.0–14.0s: ARRIVAL         — Settle smoothly into rest viewpoint
//   14.0s+:    EXPLORATION      — WASD + mouse look in bounded painterly world
// ============================================================================

export const LP_V0_FOV = 53.130102;
export const LP_V1_FOV = 53.130102;
export const LP_V0_NEAR = 0.05;
export const LP_V0_FAR = 200.0;
export const LP_V0_ARRIVAL_HOLD = 1.0;
export const LP_V0_HINT_SECONDS = 4.0;

export const LP_V1_REST = Object.freeze({
  x: -0.020,
  y: 0.003,
  z: 1.892,
  rx: -0.004,
  ry: 0.0175,
});

export const LP_V1_CANON = Object.freeze({
  x: 0.0,
  y: 0.0,
  z: 2.0,
  rx: 0.0,
  ry: 0.0,
});

// Backward compatibility exports
export const P06_REST = LP_V1_REST;
export const P06_FREEZE = { x: 0.0, y: 0.0, z: 1.984, rx: 0.0, ry: 0.0 };
export const P06_TIMING = {
  posterEnd: 1.0,
  awakenEnd: 4.0,
  handoffEnd: 8.0,
  citadelEnd: 9.0,
  waterEnd: 10.0,
  holdEnd: 13.0,
  journeyEnd: 13.0,
};

export const PHASE = Object.freeze({
  POSTER: 'POSTER',
  AWAKENING: 'AWAKENING',
  MELT: 'MELT',
  THRESHOLD: 'THRESHOLD CROSSING',
  WORLD_STREAM: 'WORLD GENERATION',
  ARRIVAL: 'ARRIVAL',
  EXPLORATION: 'EXPLORATION',
});

function fallbackWorld({ THREE: T, scene }) {
  const group = new T.Group();
  group.name = 'lpWorldFallback';
  if (scene && scene.background == null) {
    scene.background = new T.Color(0x0b1020);
  }
  return {
    group,
    bounds: { min: { x: -0.45, y: -0.18, z: 1.70 }, max: { x: 0.45, y: 0.18, z: 2.05 } },
    colliders: [],
    loadAssets: async () => {},
    update() {},
    dispose() { group.clear(); },
    toggleDebugColors: () => false,
    toggleBoundaries: () => false,
  };
}

function fallbackExplorer() {
  return {
    enabled: false,
    enable() { this.enabled = true; },
    disable() { this.enabled = false; },
    setEnabled(on) { this.enabled = !!on; },
    update() {},
    dispose() { this.enabled = false; },
  };
}

function fallbackQuality({ renderer }) {
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 1.25) : 1;
  return {
    level: 'auto',
    pixelRatio: dpr,
    renderScale: 0.8,
    _t0: 0,
    _frameMs: 0,
    setLevel(level) { this.level = level; },
    beginFrame(now) { this._t0 = now || 0; },
    endFrame() {
      const t1 = typeof performance !== 'undefined' ? performance.now() : this._t0;
      this._frameMs = t1 - this._t0;
    },
    getStats() {
      return {
        level: this.level,
        pixelRatio: this.pixelRatio,
        renderScale: this.renderScale,
        frameMs: this._frameMs || 0,
        fps: this._frameMs > 0 ? 1000 / this._frameMs : 0,
      };
    },
    apply() {},
  };
}

function wrapWorld(factory, args) {
  try {
    const w = factory(args);
    if (w && w.group) {
      return {
        group: w.group,
        bounds: w.bounds || fallbackWorld(args).bounds,
        colliders: w.colliders || [],
        loadAssets: w.loadAssets ? () => w.loadAssets() : async () => {},
        update: w.update ? (dt, cam, elapsed) => w.update(dt, cam, elapsed) : () => {},
        dispose: w.dispose ? () => w.dispose() : () => {},
        get streamer() { return w.streamer; },
        toggleDebugColors: w.toggleDebugColors ? () => w.toggleDebugColors() : () => false,
        toggleBoundaries: w.toggleBoundaries ? () => w.toggleBoundaries() : () => false,
      };
    }
  } catch (err) {
    console.warn('[LivingPoster] createLivingPosterWorld failed; using fallback', err);
  }
  return fallbackWorld(args);
}

function wrapExplorer(factory, args) {
  try {
    const e = factory(args);
    if (e && typeof e.update === 'function') {
      return {
        get enabled() { return !!e.enabled; },
        set enabled(v) { e.enabled = !!v; },
        enable: e.enable ? () => e.enable() : () => { e.enabled = true; },
        disable: e.disable ? () => e.disable() : () => { e.enabled = false; },
        setEnabled: e.setEnabled
          ? (on) => e.setEnabled(!!on)
          : (on) => { e.enabled = !!on; },
        update: (dt) => e.update(dt),
        dispose: e.dispose ? () => e.dispose() : () => {},
      };
    }
  } catch (err) {
    console.warn('[LivingPoster] createExplorer failed; using fallback', err);
  }
  return fallbackExplorer();
}

function wrapQuality(factory, args) {
  try {
    const q = factory(args);
    if (q && typeof q.getStats === 'function') {
      return q;
    }
  } catch (err) {
    console.warn('[LivingPoster] createQualityController failed; using fallback', err);
  }
  return fallbackQuality(args);
}

export class LivingPoster {
  constructor(renderer, container, showToast) {
    this.renderer = renderer;
    this.container = container;
    this.showToast = showToast || (() => {});

    this._active = false;
    this._pipeline = 'melt-v1';
    this._arrivalStartedAt = 0;
    this._exploreOrigin = 0;
    this._lastNow = 0;
    this._hintUntil = 0;
    this._perfHudOn = false;
    this._fps = 0;
    this._fpsFrames = 0;
    this._fpsStamp = 0;
    this._isPaused = false;
    this._pauseStartedAt = 0;
    this._totalPausedMs = 0;
    this._journeyStartTime = 0;
    this._keysBound = false;
    this._onKeyDown = this._onKeyDown.bind(this);

    this.state = {
      isLoaded: false,
      exploring: false,
      elapsed: 0,
      phase: PHASE.POSTER,
      isPlaying: false,
    };

    // Shared 3D Scene and Camera
    this.worldScene = new THREE.Scene();
    this.worldCamera = new THREE.PerspectiveCamera(LP_V1_FOV, 1, LP_V0_NEAR, LP_V0_FAR);
    this.worldCamera.position.set(LP_V1_CANON.x, LP_V1_CANON.y, LP_V1_CANON.z);
    this.worldCamera.rotation.set(0, 0, 0);
    this.worldCamera.updateProjectionMatrix();

    // GPU Melt Effect (320x320 plane + brushstroke particles)
    this.paintMelt = new PaintMeltEffect();
    this.worldScene.add(this.paintMelt.group);

    // Living Poster World (ocean, curved sky dome, infinite Umbral Giant, Citadel, Sentinel, ribbons, crystal streamer)
    this.world = wrapWorld(createLivingPosterWorld, {
      THREE,
      renderer,
      container,
      camera: this.worldCamera,
      scene: this.worldScene,
    });
    if (this.world.group && this.world.group.parent !== this.worldScene) {
      this.worldScene.add(this.world.group);
    }

    // WASD + Mouse Explorer
    this.explorer = wrapExplorer(createExplorer, {
      camera: this.worldCamera,
      bounds: this.world.bounds,
      colliders: this.world.colliders,
      canvas: renderer.domElement,
    });
    this.explorer.disable();

    // Quality Controller (DPR cap 1.25, renderScale 0.8)
    this.quality = wrapQuality(createQualityController, { renderer, container });
    if (typeof this.quality.setEnabled === 'function') {
      this.quality.setEnabled(false);
    }

    this._hintEl = this._makeHint();
    this._perfEl = this._makePerfHud();
  }

  // --------------------------------------------------------------------------
  // Asset Loading
  // --------------------------------------------------------------------------

  async loadAssets() {
    const loader = new THREE.TextureLoader();
    await Promise.all([
      this.paintMelt.loadAssets(loader),
      this.world.loadAssets ? this.world.loadAssets() : Promise.resolve(),
    ]);

    this.resetToPoster();
    this.state.isLoaded = true;
    console.log('Living Poster V1 "Melt into the World" pipeline initialized.');
  }

  // --------------------------------------------------------------------------
  // Playback & Transition Controls
  // --------------------------------------------------------------------------

  startExperience() {
    this._exitWorld();
    this.state.isPlaying = true;
    this._isPaused = false;
    this._journeyStartTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this._totalPausedMs = 0;
    this.state.elapsed = 0;
    this.state.phase = PHASE.POSTER;
    this.state.exploring = false;

    this.paintMelt.reset();
    if (this.world.group) this.world.group.visible = false;
    if (this.paintMelt.mesh) this.paintMelt.mesh.visible = true;
    this._syncCameraToCanon();
    this.showToast('LIVING POSTER V1 • Awaken');
  }

  resetToPoster() {
    this._exitWorld();
    this.state.isPlaying = false;
    this._isPaused = false;
    this.state.elapsed = 0;
    this.state.phase = PHASE.POSTER;
    this.state.exploring = false;
    this._arrivalStartedAt = 0;
    this._exploreOrigin = 0;

    this.paintMelt.reset();
    if (this.world.group) this.world.group.visible = false;
    if (this.paintMelt.mesh) this.paintMelt.mesh.visible = true;
    this._syncCameraToCanon();
    this._hideHint(true);
  }

  restart() {
    this.resetToPoster();
    this.startExperience();
  }

  restartThreshold() {
    // Replay melt & threshold transition from 4.0s
    this.resetToPoster();
    this.state.isPlaying = true;
    this._journeyStartTime = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - 4000;
    this.state.elapsed = 4.0;
    this.state.phase = PHASE.MELT;
    this.showToast('V1 • Replaying GPU Melt (4.0s)');
  }

  skipToArrival() {
    if (!this.state.isLoaded) return;
    this.state.elapsed = 13.0;
    this._enterWorld({ skipped: true });
  }

  seek(t) {
    this.state.isPlaying = true;
    this._isPaused = true;
    this.state.elapsed = t;

    if (t < 1.0) this.state.phase = PHASE.POSTER;
    else if (t < 4.0) this.state.phase = PHASE.AWAKENING;
    else if (t < 7.8) this.state.phase = PHASE.MELT;
    else if (t < 8.5) this.state.phase = PHASE.THRESHOLD;
    else if (t < 13.0) this.state.phase = PHASE.WORLD_STREAM;
    else if (t < 14.0) this.state.phase = PHASE.ARRIVAL;
    else {
      this._enterWorld();
      return;
    }

    if (t < 4.0) {
      if (this.world.group) this.world.group.visible = false;
      if (this.paintMelt.mesh) this.paintMelt.mesh.visible = true;
    } else if (t < 8.2) {
      if (this.world.group) this.world.group.visible = true;
      if (this.paintMelt.mesh) this.paintMelt.mesh.visible = true;
    } else {
      if (this.world.group) this.world.group.visible = true;
      if (this.paintMelt.mesh) this.paintMelt.mesh.visible = false;
    }

    this._evalCameraFlight(t);
    this.paintMelt.update(t, this.worldCamera);
    this.world.update(1 / 60, this.worldCamera, t, true);
    this._renderWorld();
  }

  togglePause() {
    if (!this.state.isPlaying || this.state.exploring) return;
    this._isPaused = !this._isPaused;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (this._isPaused) {
      this._pauseStartedAt = now;
      this.showToast('V1 Transition • PAUSED (M to resume)');
    } else {
      if (this._pauseStartedAt) {
        this._totalPausedMs += (now - this._pauseStartedAt);
        this._pauseStartedAt = 0;
      }
      this.showToast('V1 Transition • RESUMED');
    }
    return this._isPaused;
  }

  toggleDebugColors() {
    const active = this.world.toggleDebugColors();
    this.showToast(active ? 'WORLD-GEN DEBUG • Phase Colors ON' : 'WORLD-GEN • Natural Palette ON');
    return active;
  }

  toggleChunkBoundaries() {
    const active = this.world.toggleBoundaries();
    this.showToast(active ? 'WORLD CHUNKS • Bounds ON' : 'WORLD CHUNKS • Bounds OFF');
    return active;
  }

  setActive(active) {
    this._active = !!active;
    if (this._active) this._bindKeys();
    else this._unbindKeys();

    if (typeof this.quality.setEnabled === 'function') {
      this.quality.setEnabled(this._active);
    } else if (this._active && this.quality.apply) {
      this.quality.apply();
    }

    if (this.state.exploring && this._active) {
      this.explorer.setEnabled(true);
      this.explorer.enable();
    } else {
      this.explorer.setEnabled(false);
      this.explorer.disable();
    }
  }

  setQuality(level) {
    const allowed = ['auto', 'high', 'medium', 'low'];
    const next = allowed.includes(level) ? level : 'auto';
    if (this.quality.setLevel) this.quality.setLevel(next);
    if (this.quality.apply) this.quality.apply();
  }

  togglePerfHud() {
    this._perfHudOn = !this._perfHudOn;
    if (this._perfEl) {
      this._perfEl.style.display = this._perfHudOn ? 'block' : 'none';
      if (this._perfHudOn) this._refreshPerfHud();
    }
    return this._perfHudOn;
  }

  getPerfStats() {
    const q = this.quality.getStats ? this.quality.getStats() : {};
    return {
      fps: this._fps || q.fps || 0,
      frameMs: q.frameMs || q.frameTime || 0,
      drawCalls: q.drawCalls || 0,
      triangles: q.triangles || 0,
      level: q.level || this.quality.level || 'auto',
      appliedLevel: q.info && q.info.appliedLevel,
      pixelRatio: q.pixelRatio != null ? q.pixelRatio : this.quality.pixelRatio,
      renderScale: q.renderScale != null ? q.renderScale : this.quality.renderScale,
      pipeline: this._pipeline,
    };
  }

  getState() {
    return {
      phase: this.state.phase,
      exploring: !!this.state.exploring,
      elapsed: this.state.elapsed,
      isPlaying: this.state.isPlaying,
      isPaused: this._isPaused,
    };
  }

  getPipeline() {
    return this._pipeline;
  }

  // --------------------------------------------------------------------------
  // Per-Frame Update Loop
  // --------------------------------------------------------------------------

  update(now) {
    if (!this.state.isLoaded) return;
    if (this.quality.beginFrame) this.quality.beginFrame(now);

    const dt = this._lastNow ? Math.min(0.05, (now - this._lastNow) / 1000) : 1 / 60;
    this._lastNow = now;

    if (this.state.exploring) {
      this._updateExploration(now, dt);
    } else {
      this._updateTransition(now, dt);
    }

    this._renderWorld();

    this._tickFps(now);
    if (this._perfHudOn) this._refreshPerfHud();
    if (this.quality.endFrame) this.quality.endFrame();
  }

  _updateTransition(now, dt) {
    if (!this.state.isPlaying) {
      // Idle at poster
      this._syncCameraToCanon();
      this.paintMelt.update(0, this.worldCamera);
      this.world.update(dt, this.worldCamera, 0);
      return;
    }

    if (this._isPaused) {
      // Paused — hold camera, maintain visibility handoffs, and animate fluid ripples
      const elapsed = this.state.elapsed;
      if (elapsed < 4.0) {
        if (this.world.group) this.world.group.visible = false;
        if (this.paintMelt.mesh) this.paintMelt.mesh.visible = true;
      } else if (elapsed < 8.2) {
        if (this.world.group) this.world.group.visible = true;
        if (this.paintMelt.mesh) this.paintMelt.mesh.visible = true;
      } else {
        if (this.world.group) this.world.group.visible = true;
        if (this.paintMelt.mesh) this.paintMelt.mesh.visible = false;
      }

      this._evalCameraFlight(elapsed);
      this.paintMelt.update(elapsed, this.worldCamera);
      this.world.update(dt, this.worldCamera, elapsed);
      return;
    }

    const elapsed = Math.max(0, (now - this._journeyStartTime - this._totalPausedMs) / 1000);
    this.state.elapsed = elapsed;

    // Determine Phase
    if (elapsed < 1.0) {
      this.state.phase = PHASE.POSTER;
    } else if (elapsed < 4.0) {
      this.state.phase = PHASE.AWAKENING;
    } else if (elapsed < 7.8) {
      this.state.phase = PHASE.MELT;
    } else if (elapsed < 8.5) {
      this.state.phase = PHASE.THRESHOLD;
    } else if (elapsed < 13.0) {
      this.state.phase = PHASE.WORLD_STREAM;
    } else if (elapsed < 14.0) {
      this.state.phase = PHASE.ARRIVAL;
    } else {
      this._enterWorld();
      return;
    }

    // Dynamic layer visibility handoff:
    if (elapsed < 4.0) {
      if (this.world.group) this.world.group.visible = false;
      if (this.paintMelt.mesh) this.paintMelt.mesh.visible = true;
    } else if (elapsed < 8.2) {
      if (this.world.group) this.world.group.visible = true;
      if (this.paintMelt.mesh) this.paintMelt.mesh.visible = true;
    } else {
      if (this.world.group) this.world.group.visible = true;
      if (this.paintMelt.mesh) this.paintMelt.mesh.visible = false;
    }

    // Evaluate Continuous Camera Flight Path
    this._evalCameraFlight(elapsed);

    // Update GPU Melt Shader and Brushstroke Particles
    this.paintMelt.update(elapsed, this.worldCamera);

    // Update World Geometry & Progressive Streamer
    this.world.update(dt, this.worldCamera, elapsed);
  }

  _evalCameraFlight(t) {
    const cam = this.worldCamera;

    if (t <= 1.0) {
      // 0–1s: Pristine canonical registration
      cam.position.set(LP_V1_CANON.x, LP_V1_CANON.y, LP_V1_CANON.z);
      cam.rotation.set(0, 0, 0);
    } else if (t <= 4.0) {
      // 1–4s: Painting awakens — subtle organic breathing
      const u = (t - 1.0) / 3.0;
      const breathZ = Math.sin(u * Math.PI * 2) * 0.0025;
      cam.position.set(LP_V1_CANON.x, LP_V1_CANON.y, LP_V1_CANON.z - breathZ);
      cam.rotation.set(0, 0, 0);
    } else if (t <= 8.0) {
      // 4–8s: Melt & approach — eased acceleration pushing forward through canvas
      const u = (t - 4.0) / 4.0;
      const ease = u * u * (3.0 - 2.0 * u);
      const x = THREE.MathUtils.lerp(0.0, -0.008, ease);
      const y = THREE.MathUtils.lerp(0.0, 0.002, ease);
      const z = THREE.MathUtils.lerp(2.0, 1.780, ease); // reaches threshold Z=1.78 at 8s
      const yaw = THREE.MathUtils.lerp(0.0, 0.003, ease);
      const pitch = THREE.MathUtils.lerp(0.0, -0.001, ease);
      cam.position.set(x, y, z);
      cam.rotation.set(pitch, yaw, 0);
    } else if (t <= 13.0) {
      // 8–13s: World corridor flight — crystal formations constructing ahead
      const u = (t - 8.0) / 5.0;
      const ease = u * u * (3.0 - 2.0 * u);
      const x = THREE.MathUtils.lerp(-0.008, LP_V1_REST.x, ease);
      const y = THREE.MathUtils.lerp(0.002, LP_V1_REST.y, ease);
      const z = THREE.MathUtils.lerp(1.780, LP_V1_REST.z, ease);
      const yaw = THREE.MathUtils.lerp(0.003, LP_V1_REST.ry, ease);
      const pitch = THREE.MathUtils.lerp(-0.001, LP_V1_REST.rx, ease);
      cam.position.set(x, y, z);
      cam.rotation.set(pitch, yaw, 0);
    } else {
      // 13–14s: Arrival hold at rest pose
      cam.position.set(LP_V1_REST.x, LP_V1_REST.y, LP_V1_REST.z);
      cam.rotation.set(LP_V1_REST.rx, LP_V1_REST.ry, 0);
    }

    cam.updateMatrixWorld(true);
  }

  _enterWorld({ skipped } = {}) {
    this.state.exploring = true;
    this.state.phase = PHASE.EXPLORATION;
    this.state.elapsed = 14.0;
    this._exploreOrigin = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Lifecycle cleanup: Hide melt mesh & particles to maximize performance
    if (this.paintMelt.mesh) {
      this.paintMelt.mesh.visible = false;
    }
    if (this.paintMelt.particles) {
      this.paintMelt.particles.active = false;
      if (this.paintMelt.particles._instancedMesh) {
        this.paintMelt.particles._instancedMesh.visible = false;
      }
    }

    // Adopt rest pose for camera
    this.worldCamera.position.set(LP_V1_REST.x, LP_V1_REST.y, LP_V1_REST.z);
    this.worldCamera.rotation.set(LP_V1_REST.rx, LP_V1_REST.ry, 0);
    this.worldCamera.updateMatrixWorld(true);

    // Activate WASD + mouse look
    this.explorer.disable();
    if (this._active) {
      this.explorer.setEnabled(true);
      this.explorer.enable();
    }

    this._showHint();
    this.showToast(skipped ? 'WORLD • Skipped to arrival' : 'WORLD • Free exploration (WASD + Look)');
  }

  _exitWorld() {
    this.state.exploring = false;
    this.explorer.setEnabled(false);
    this.explorer.disable();
    this._hideHint(true);
  }

  _updateExploration(now, dt) {
    this.state.phase = PHASE.EXPLORATION;
    this.state.elapsed = 14.0 + (this._exploreOrigin ? (now - this._exploreOrigin) / 1000 : 0);

    this.world.update(dt, this.worldCamera, this.state.elapsed);
    if (this.explorer.enabled) {
      this.explorer.update(dt);
    }
    this._tickHint(now);
  }

  _renderWorld() {
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.worldScene, this.worldCamera);
  }

  _syncCameraToCanon() {
    this.worldCamera.position.set(LP_V1_CANON.x, LP_V1_CANON.y, LP_V1_CANON.z);
    this.worldCamera.rotation.set(0, 0, 0);
    this.worldCamera.fov = LP_V1_FOV;
    this.worldCamera.updateProjectionMatrix();
    this.worldCamera.updateMatrixWorld(true);
  }

  onResize(width, height) {
    const aspect = height > 0 ? width / height : 1;
    this.worldCamera.aspect = aspect;
    this.worldCamera.fov = LP_V1_FOV;
    this.worldCamera.near = LP_V0_NEAR;
    this.worldCamera.far = LP_V0_FAR;
    this.worldCamera.updateProjectionMatrix();
  }

  onPointerMove(_x, _y) {
    // Look is owned by explorer under pointer lock
  }

  // --------------------------------------------------------------------------
  // Keyboard Shortcuts (Active when in LP mode)
  // --------------------------------------------------------------------------

  _onKeyDown(e) {
    if (!this._active) return;
    const code = e.code;

    if (code === 'KeyM') {
      e.preventDefault();
      this.togglePause();
    } else if (code === 'KeyG') {
      e.preventDefault();
      this.toggleDebugColors();
    } else if (code === 'KeyC') {
      e.preventDefault();
      this.toggleChunkBoundaries();
    } else if (code === 'KeyT') {
      e.preventDefault();
      this.restartThreshold();
    } else if (code === 'KeyP') {
      e.preventDefault();
      this.togglePerfHud();
    } else if (code === 'KeyR') {
      e.preventDefault();
      this.restart();
    }
  }

  _bindKeys() {
    if (this._keysBound) return;
    window.addEventListener('keydown', this._onKeyDown);
    this._keysBound = true;
  }

  _unbindKeys() {
    if (!this._keysBound) return;
    window.removeEventListener('keydown', this._onKeyDown);
    this._keysBound = false;
  }

  // --------------------------------------------------------------------------
  // DOM Hints & Performance HUD
  // --------------------------------------------------------------------------

  _makeHint() {
    const el = document.createElement('div');
    el.className = 'lp-v0-explore-hint';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div>MOVE — WASD</div><div>LOOK — MOUSE</div>';
    el.style.cssText = [
      'position:absolute',
      'left:50%',
      'bottom:11%',
      'transform:translateX(-50%)',
      'pointer-events:none',
      'z-index:8',
      'text-align:center',
      'font:500 11px/1.7 ui-sans-serif,system-ui,sans-serif',
      'letter-spacing:0.22em',
      'text-transform:uppercase',
      'color:rgba(255,229,128,0.88)',
      'text-shadow:0 1px 8px rgba(0,0,0,0.7)',
      'opacity:0',
      'transition:opacity 1.1s ease',
    ].join(';');
    this.container.appendChild(el);
    return el;
  }

  _showHint() {
    this._hintUntil = (typeof performance !== 'undefined' ? performance.now() : 0)
      + LP_V0_HINT_SECONDS * 1000;
    if (this._hintEl) this._hintEl.style.opacity = '1';
  }

  _hideHint(immediate) {
    this._hintUntil = 0;
    if (!this._hintEl) return;
    if (immediate) this._hintEl.style.transition = 'none';
    this._hintEl.style.opacity = '0';
    if (immediate) {
      void this._hintEl.offsetHeight;
      this._hintEl.style.transition = 'opacity 1.1s ease';
    }
  }

  _tickHint(now) {
    if (this._hintUntil && now >= this._hintUntil) this._hideHint(false);
  }

  _makePerfHud() {
    const el = document.createElement('div');
    el.className = 'lp-v0-perf-hud';
    el.style.cssText = [
      'display:none',
      'position:absolute',
      'top:8px',
      'left:8px',
      'z-index:9',
      'pointer-events:none',
      'font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace',
      'color:#d7e0ff',
      'background:rgba(6,8,18,0.62)',
      'padding:6px 8px',
      'border-radius:3px',
    ].join(';');
    this.container.appendChild(el);
    return el;
  }

  _refreshPerfHud() {
    if (!this._perfEl || !this._perfHudOn) return;
    const s = this.getPerfStats();
    this._perfEl.textContent = [
      `LP V1: ${this.state.phase}`,
      `time: ${this.state.elapsed.toFixed(2)}s ${this._isPaused ? '[PAUSED]' : ''}`,
      `${s.fps.toFixed(0)} fps  ${Number(s.frameMs).toFixed(1)} ms`,
      `draws: ${s.drawCalls || 0}  tris: ${s.triangles || 0}`,
      `q: ${s.level}${s.appliedLevel ? `/${s.appliedLevel}` : ''}  pr: ${Number(s.pixelRatio).toFixed(2)}  rs: ${Number(s.renderScale).toFixed(2)}`,
      `keys: [M] pause [G] debug col [C] bounds [T] thresh [R] restart`,
    ].join('\n');
    this._perfEl.style.whiteSpace = 'pre';
  }

  _tickFps(now) {
    this._fpsFrames += 1;
    if (!this._fpsStamp) this._fpsStamp = now;
    const span = now - this._fpsStamp;
    if (span >= 400) {
      this._fps = (this._fpsFrames * 1000) / span;
      this._fpsFrames = 0;
      this._fpsStamp = now;
    }
  }
}
