import * as THREE from 'three';
import { Prototype06, P06_TIMING, P06_REST, P06_FREEZE } from './prototype06.js';
import { createLivingPosterWorld } from './livingPosterWorld.js';
import { createExplorer } from './livingPosterExplore.js';
import { createQualityController } from './livingPosterQuality.js';

// ============================================================================
// Living Poster V0 — isolated experience runtime
//
// Parent wiring (this file does NOT set window.__livingPoster):
//   import { LivingPoster } from './livingPoster.js';
//   const lp = new LivingPoster(renderer, container, showToast);
//   await lp.loadAssets();
//   window.__livingPoster = lp;
//   // animate: lp.update(now);  resize: lp.onResize(w, h);
//   // ENTER overlay: lp.startExperience();  lp.setActive(true);
//
// Pipeline:
//   'prototypes' — private Prototype06 owns POSTER…REST (timings copied exactly)
//   'world'      — p06.update is NOT called; only worldScene is rendered
// ============================================================================

export const LP_V0_FOV = 53.130102;
export const LP_V0_NEAR = 0.1;
export const LP_V0_FAR = 200;
export const LP_V0_ARRIVAL_HOLD = 1.0;
export const LP_V0_HINT_SECONDS = 4.0;

export { P06_TIMING, P06_REST, P06_FREEZE };

const PHASE = {
  POSTER: 'POSTER',
  ENTER: 'ENTER',
  AWAKENING: 'AWAKENING',
  HANDOFF: 'INVISIBLE HANDOFF',
  CITADEL: 'CITADEL',
  WATER: 'WATER',
  HOLD: 'HOLD',
  JOURNEY: 'GATEWAY JOURNEY',
  ARRIVAL: 'ARRIVAL',
  EXPLORATION: 'EXPLORATION',
};

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
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  return {
    level: 'auto',
    pixelRatio: dpr,
    renderScale: 1,
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
        update: w.update ? (dt, cam) => w.update(dt, cam) : () => {},
        dispose: w.dispose ? () => w.dispose() : () => {},
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
    this._pipeline = 'prototypes';
    this._citadelClone = null;
    this._arrivalStartedAt = 0;
    this._exploreOrigin = 0;
    this._lastNow = 0;
    this._hintUntil = 0;
    this._perfHudOn = false;
    this._fps = 0;
    this._fpsFrames = 0;
    this._fpsStamp = 0;
    this._onKeyDown = this._onKeyDown.bind(this);

    this.state = {
      isLoaded: false,
      exploring: false,
      elapsed: 0,
      phase: PHASE.POSTER,
    };

    // Private P06 composition — do not edit prototype06.js.
    this.p06 = new Prototype06(renderer, container, (msg) => this.showToast(msg));

    this.worldScene = new THREE.Scene();
    this.worldCamera = new THREE.PerspectiveCamera(LP_V0_FOV, 1, LP_V0_NEAR, LP_V0_FAR);
    this.worldCamera.position.set(P06_REST.x, P06_REST.y, P06_REST.z);
    this.worldCamera.rotation.set(P06_REST.rx, P06_REST.ry, 0);
    this.worldCamera.updateProjectionMatrix();

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

    this.explorer = wrapExplorer(createExplorer, {
      camera: this.worldCamera,
      bounds: this.world.bounds,
      colliders: this.world.colliders,
      canvas: renderer.domElement,
    });
    this.explorer.disable();

    this.quality = wrapQuality(createQualityController, { renderer, container });
    // Do not own renderer DPR until this experience is on-screen (lab prototypes
    // keep the host Math.min(dpr, 2) cap).
    if (typeof this.quality.setEnabled === 'function') {
      this.quality.setEnabled(false);
    }

    this._hintEl = this._makeHint();
    this._perfEl = this._makePerfHud();
  }

  // --------------------------------------------------------------------------
  // Assets / lifecycle
  // --------------------------------------------------------------------------

  async loadAssets() {
    await this.p06.loadAssets();
    if (this.world.loadAssets) await this.world.loadAssets();
    this._adoptP04Citadel();
    this.resetToPoster();
    this.state.isLoaded = true;
    console.log('LivingPoster V0 runtime initialized (P06 composition + WORLD switch).');
  }

  startExperience() {
    this._exitWorld();
    this.p06.startJourney();
    this.state.exploring = false;
    this.state.elapsed = 0;
    this.state.phase = PHASE.ENTER;
    this._arrivalStartedAt = 0;
    this._exploreOrigin = 0;
  }

  resetToPoster() {
    this._exitWorld();
    this.p06.resetToPoster();
    this.state.exploring = false;
    this.state.elapsed = 0;
    this.state.phase = PHASE.POSTER;
    this._arrivalStartedAt = 0;
    this._exploreOrigin = 0;
    this._hideHint(true);
  }

  restart() {
    this.resetToPoster();
    this.startExperience();
  }

  skipToArrival() {
    if (!this.state.isLoaded) return;
    this.p06.seek(P06_TIMING.journeyEnd, true);
    this.state.elapsed = P06_TIMING.journeyEnd + LP_V0_ARRIVAL_HOLD;
    this._arrivalStartedAt = 0;
    this._enterWorld({ skipped: true });
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
    if (this._pipeline === 'world' && this._active) {
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
    };
  }

  getPipeline() {
    return this._pipeline;
  }

  // --------------------------------------------------------------------------
  // Frame
  // --------------------------------------------------------------------------

  update(now) {
    if (!this.state.isLoaded) return;
    if (this.quality.beginFrame) this.quality.beginFrame(now);

    if (this._pipeline === 'world') {
      this._updateWorld(now);
    } else {
      this._updateJourney(now);
    }

    this._tickFps(now);
    if (this._perfHudOn) this._refreshPerfHud();
    if (this.quality.endFrame) this.quality.endFrame();
  }

  onResize(width, height) {
    this.p06.onResize(width, height);
    const aspect = height > 0 ? width / height : 1;
    this.worldCamera.aspect = aspect;
    this.worldCamera.fov = LP_V0_FOV;
    this.worldCamera.near = LP_V0_NEAR;
    this.worldCamera.far = LP_V0_FAR;
    this.worldCamera.updateProjectionMatrix();
  }

  onPointerMove(_x, _y) {
    // No-op during the scripted P06 journey. Look is explorer/parent-owned.
  }

  // --------------------------------------------------------------------------
  // Journey (P06) → arrival hold → WORLD
  // --------------------------------------------------------------------------

  _updateJourney(now) {
    if (this._arrivalStartedAt) {
      const hold = (now - this._arrivalStartedAt) / 1000;
      this.state.elapsed = P06_TIMING.journeyEnd + hold;
      this.state.phase = PHASE.ARRIVAL;
      if (hold >= LP_V0_ARRIVAL_HOLD) {
        this._enterWorld();
        return;
      }
      // Keep rendering the P06 rest pose (P05 H1) during the 1s hold.
      this.p06.update(now);
      return;
    }

    this.p06.update(now);
    this.state.elapsed = this.p06.state.elapsed;
    this.state.phase = this._phaseFromP06();

    if (this.p06.state.stage === 'REST') {
      this._arrivalStartedAt = now;
      this.state.phase = PHASE.ARRIVAL;
      this.state.elapsed = P06_TIMING.journeyEnd;
    }
  }

  _phaseFromP06() {
    const stage = this.p06.state.stage;
    if (stage === 'POSTER') {
      const started = this.p06.state.playing || this.p06.state.elapsed > 0.0001;
      return started ? PHASE.ENTER : PHASE.POSTER;
    }
    if (stage === 'HANDOFF') return PHASE.HANDOFF;
    if (stage === 'JOURNEY') return PHASE.JOURNEY;
    if (stage === 'REST') return PHASE.ARRIVAL;
    return stage;
  }

  _enterWorld({ skipped } = {}) {
    this._pipeline = 'world';
    this.state.exploring = true;
    this.state.phase = PHASE.EXPLORATION;
    this.state.elapsed = P06_TIMING.journeyEnd + LP_V0_ARRIVAL_HOLD;
    this._exploreOrigin = typeof performance !== 'undefined' ? performance.now() : 0;
    this._arrivalStartedAt = 0;

    // Hard stop: P06 (and the P01–P05 pipelines it drives) must not tick.
    this.p06.state.playing = false;
    this.p06.state.paused = false;

    this._adoptP04Citadel();
    this._syncWorldCameraFromRest();

    // Re-bind explorer so SKIP/RESET while already in WORLD adopts the rest pose
    // (enable() is a no-op if already enabled and would keep a stale walk pose).
    this.explorer.disable();
    if (this._active) {
      this.explorer.setEnabled(true);
      this.explorer.enable();
    }

    this._showHint();
    this._renderWorld();
    this.showToast(skipped ? 'WORLD • skipped to arrival' : 'WORLD • limited exploration');
  }

  _exitWorld() {
    this._pipeline = 'prototypes';
    this.state.exploring = false;
    this.explorer.setEnabled(false);
    this.explorer.disable();
    this._hideHint(true);
  }

  _updateWorld(now) {
    const dt = this._lastNow ? Math.min(0.05, (now - this._lastNow) / 1000) : 1 / 60;
    this._lastNow = now;
    this.state.elapsed = P06_TIMING.journeyEnd + LP_V0_ARRIVAL_HOLD
      + (this._exploreOrigin ? (now - this._exploreOrigin) / 1000 : 0);
    this.state.phase = PHASE.EXPLORATION;
    this.world.update(dt, this.worldCamera);
    if (this.explorer.enabled) this.explorer.update(dt);
    this._tickHint(now);
    this._renderWorld();
  }

  _renderWorld() {
    this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.worldScene, this.worldCamera);
  }

  _syncWorldCameraFromRest() {
    const cam = this.worldCamera;
    cam.fov = LP_V0_FOV;
    cam.near = LP_V0_NEAR;
    cam.far = LP_V0_FAR;
    const src = this.p06.p05 && this.p06.p05.camera;
    if (src) {
      cam.position.copy(src.position);
      cam.quaternion.copy(src.quaternion);
      cam.aspect = src.aspect || cam.aspect;
    } else {
      cam.position.set(P06_REST.x, P06_REST.y, P06_REST.z);
      cam.rotation.set(P06_REST.rx, P06_REST.ry, 0);
    }
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }

  _adoptP04Citadel() {
    if (this._citadelClone && this._citadelClone.parent) return;
    // Env world already builds the P04 citadel (`lp-citadel`). Do not clone a
    // second mesh on top of it.
    if (this.world.group && this.world.group.getObjectByName('lp-citadel')) return;
    const src = this.p06.p05 && this.p06.p05.volumeCitadelMesh;
    if (!src) return;
    const existing = this.world.group.getObjectByName('lpP04Citadel');
    if (existing) {
      this._citadelClone = existing;
      return;
    }
    const clone = src.clone(false);
    clone.name = 'lpP04Citadel';
    clone.visible = true;
    this.world.group.add(clone);
    this._citadelClone = clone;
  }

  // --------------------------------------------------------------------------
  // HUD / hint (DOM in container — not index.html)
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
      `LP ${this.state.phase}`,
      `pipe ${s.pipeline}`,
      `${s.fps.toFixed(0)} fps  ${Number(s.frameMs).toFixed(1)} ms`,
      `draws ${s.drawCalls || 0}  tris ${s.triangles || 0}`,
      `q ${s.level}${s.appliedLevel ? `/${s.appliedLevel}` : ''}  pr ${Number(s.pixelRatio).toFixed(2)}  rs ${Number(s.renderScale).toFixed(2)}`,
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

  // Namespaced key listener — WASD is explorer/parent-owned. Bound only while active.
  _onKeyDown(_event) {}

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
}
