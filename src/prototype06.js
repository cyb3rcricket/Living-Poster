import * as THREE from 'three';
import { Prototype03 } from './prototype03.js';
import { Prototype05 } from './prototype05.js';

// ============================================================================
// Prototype 06 — First Controlled Poster-to-World Journey
// Isolated orchestration. Does not modify Prototypes 01–05 source.
// Composes a private P03 (through p=0.70) with a private P05 (H1 SEA-ONLY).
// ============================================================================

const DEG = Math.PI / 180;
const Z_FLOOR = 1.86;

const T = {
  posterEnd: 0.50,
  awakenEnd: 2.60,
  handoffEnd: 5.40,
  citadelEnd: 5.70,
  waterEnd: 6.20,
  holdEnd: 7.30,
  journeyEnd: 12.90,
};

const FREEZE = { x: 0.0, y: 0.0, z: 1.984, rx: 0.0, ry: 0.0 };
const REST = { x: -0.020, y: 0.003, z: 1.892, rx: -0.004, ry: 0.0175 };

const RAIL = [
  { t: 0.00, x: 0.000, y: 0.0000, z: 1.984, yaw: 0.0, pitch: 0.0 },
  { t: 0.42, x: -0.005, y: 0.0015, z: 1.945, yaw: 0.35 * DEG, pitch: 0.0 },
  { t: 0.77, x: -0.015, y: 0.0025, z: 1.910, yaw: 0.75 * DEG, pitch: -0.12 * DEG },
  { t: 1.00, x: REST.x, y: REST.y, z: REST.z, yaw: REST.ry, pitch: REST.rx },
];

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function smooth01(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1)
    + (-p0 + p2) * t
    + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
    + (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function evalRail(uRaw) {
  const u = clamp(uRaw, 0, 1);
  // Forward Z uses the full rail immediately. Lateral / yaw lag so the first
  // beat reads as walking into the channel, not sliding sideways.
  const uZ = smooth01(u);
  const uLat = smooth01(clamp((u - 0.16) / 0.84, 0, 1));
  const pZ = sampleKnots(RAIL, uZ);
  const pLat = sampleKnots(RAIL, uLat);
  return {
    x: pLat.x,
    y: pLat.y,
    z: Math.max(Z_FLOOR, pZ.z),
    yaw: pLat.yaw,
    pitch: mix(pZ.pitch, pLat.pitch, 0.65),
  };
}

function sampleKnots(knots, u) {
  const t = clamp(u, 0, 1);
  if (t <= knots[0].t) return { ...knots[0] };
  if (t >= knots[knots.length - 1].t) return { ...knots[knots.length - 1] };
  let i = 0;
  while (i < knots.length - 2 && knots[i + 1].t < t) i += 1;
  const k0 = knots[Math.max(0, i - 1)];
  const k1 = knots[i];
  const k2 = knots[i + 1];
  const k3 = knots[Math.min(knots.length - 1, i + 2)];
  const span = Math.max(1e-6, k2.t - k1.t);
  const s = smooth01((t - k1.t) / span);
  return {
    t,
    x: catmull(k0.x, k1.x, k2.x, k3.x, s),
    y: catmull(k0.y, k1.y, k2.y, k3.y, s),
    z: catmull(k0.z, k1.z, k2.z, k3.z, s),
    yaw: catmull(k0.yaw, k1.yaw, k2.yaw, k3.yaw, s),
    pitch: catmull(k0.pitch, k1.pitch, k2.pitch, k3.pitch, s),
  };
}

function stageAt(elapsed) {
  if (elapsed < T.posterEnd) return 'POSTER';
  if (elapsed < T.awakenEnd) return 'AWAKENING';
  if (elapsed < T.handoffEnd) return 'HANDOFF';
  if (elapsed < T.citadelEnd) return 'CITADEL';
  if (elapsed < T.waterEnd) return 'WATER';
  if (elapsed < T.holdEnd) return 'HOLD';
  if (elapsed < T.journeyEnd) return 'JOURNEY';
  return 'REST';
}

export class Prototype06 {
  constructor(renderer, container, showToast) {
    this.renderer = renderer;
    this.container = container;
    this.showToast = showToast;

    this.p03 = new Prototype03(renderer, container, () => {});
    this.p05 = new Prototype05(renderer, container, () => {});
    this.p03.config.spatialUnlockStart = 2.0;
    this.p03.config.soloMode = false;
    this.p03.config.diagnosticMode = 'normal';

    this.canonicalFov = 53.130102;
    this.state = {
      isLoaded: false,
      playing: false,
      paused: false,
      elapsed: 0,
      origin: 0,
      stage: 'POSTER',
      citadelOwned: 0,
      waterOwned: 0,
      p03Progress: 0,
      hudVisible: true,
      lastStage: '',
    };

    this._blend = this._makeBlend();
    this._p05Prepared = false;
    this._h1Ready = false;
  }

  _makeBlend() {
    const w = this.container.clientWidth || 1024;
    const h = this.container.clientHeight || 1024;
    const dpr = Math.min(window.devicePixelRatio, 2.0);
    const rtW = Math.round(w * dpr);
    const rtH = Math.round(h * dpr);
    const opts = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      stencilBuffer: false,
      depthBuffer: true,
    };
    const rtA = new THREE.WebGLRenderTarget(rtW, rtH, opts);
    const rtB = new THREE.WebGLRenderTarget(rtW, rtH, opts);
    rtA.texture.colorSpace = THREE.LinearSRGBColorSpace;
    rtB.texture.colorSpace = THREE.LinearSRGBColorSpace;

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTexA: { value: rtA.texture },
        uTexB: { value: rtB.texture },
        uMix: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        uniform sampler2D uTexA;
        uniform sampler2D uTexB;
        uniform float uMix;
        void main() {
          vec4 a = texture2D(uTexA, vUv);
          vec4 b = texture2D(uTexB, vUv);
          gl_FragColor = mix(a, b, clamp(uMix, 0.0, 1.0));
          #include <colorspace_fragment>
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    const scene = new THREE.Scene();
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(quad);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return { rtA, rtB, mat, scene, cam };
  }

  async loadAssets() {
    await Promise.all([this.p03.loadAssets(), this.p05.loadAssets()]);
    this._prepareP05Card();
    this.resetToPoster();
    this.state.isLoaded = true;
    console.log('Prototype 06 first controlled journey initialized.');
  }

  _prepareP05Card() {
    const p5 = this.p05;
    p5.config.parallaxEnabled = false;
    p5.config.scriptedSweep = false;
    p5.config.freezeCamera = true;
    p5.config.alive = false;
    p5.config.contactCorrection = false;
    p5.config.seaSource = 'sea-only';
    p5.config.profile = 'linear';
    p5.config.h1FarZ = -3.0;
    p5.config.zNear = 1.38;
    p5.config.zHorizon = 0.70;
    p5.camera.fov = this.canonicalFov;
    p5.camera.near = 0.1;
    p5.camera.far = 200;
    p5.camera.updateProjectionMatrix();
    p5.snapPose(FREEZE);
    p5.setComparisonMode('card', true);
    this._p05Prepared = true;
    this._h1Ready = false;
  }

  _ensureH1() {
    if (this._h1Ready) return;
    const p5 = this.p05;
    p5.config.seaSource = 'sea-only';
    p5.config.profile = 'linear';
    p5.config.h1FarZ = -3.0;
    p5.config.zNear = 1.38;
    p5.config.alive = false;
    p5.config.contactCorrection = false;
    p5.setTopology('h1', true);
    p5.setSeaSource('sea-only', true);
    p5.setProfile('linear', true);
    this._h1Ready = true;
  }

  _p03ProgressForTime(elapsed) {
    if (elapsed <= T.posterEnd) return 0;
    if (elapsed <= T.awakenEnd) {
      const u = (elapsed - T.posterEnd) / (T.awakenEnd - T.posterEnd);
      return 0.30 * u;
    }
    if (elapsed <= T.handoffEnd) {
      const u = (elapsed - T.awakenEnd) / (T.handoffEnd - T.awakenEnd);
      return 0.30 + 0.40 * u;
    }
    return 0.70;
  }

  _poseForTime(elapsed) {
    if (elapsed < T.holdEnd) return { ...FREEZE };
    if (elapsed >= T.journeyEnd) return { ...REST };
    const u = (elapsed - T.holdEnd) / (T.journeyEnd - T.holdEnd);
    const p = evalRail(u);
    return { x: p.x, y: p.y, z: p.z, rx: p.pitch, ry: p.yaw };
  }

  _applyP05Pose(pose) {
    const p5 = this.p05;
    p5.config.freezeCamera = true;
    p5.config.parallaxEnabled = false;
    p5.config.scriptedSweep = false;
    p5.camera.position.set(pose.x, pose.y, pose.z);
    p5.camera.rotation.set(pose.rx, pose.ry, 0);
    p5.camera.updateMatrixWorld(true);
  }

  _renderP03To(target) {
    this.renderer.setRenderTarget(target || null);
    this.renderer.clear();
    this.renderer.render(this.p03.p02Scene, this.p03.camera);
    this.renderer.setRenderTarget(null);
  }

  _renderP05To(target) {
    if (target) this.renderer.setRenderTarget(target);
    else this.renderer.setRenderTarget(null);
    this.renderer.clear();
    this.renderer.render(this.p05.scene, this.p05.camera);
    if (target) this.renderer.setRenderTarget(null);
  }

  _composite(mixAmt) {
    this._blend.mat.uniforms.uMix.value = mixAmt;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this._blend.scene, this._blend.cam);
  }

  _driveP03(now, progress) {
    const p03 = this.p03;
    p03.state.isPlaying = false;
    p03.config.soloMode = false;
    p03.config.spatialUnlockStart = 2.0;
    p03.config.diagnosticMode = 'normal';
    p03.state.masterProgress = progress;
    p03.update(now);
  }

  _syncP05WaterClock(now, pose) {
    const p5 = this.p05;
    if (!p5.waterMaterial) return;
    p5.waterMaterial.uniforms.uTime.value = now * 0.001;
    const dx = pose.x - 0;
    const dy = pose.y - 0;
    const dz = pose.z - 2.0;
    const atCanon = (dx * dx + dy * dy + dz * dz) < 0.0004
      && Math.abs(pose.rx) < 0.002
      && Math.abs(pose.ry) < 0.002;
    p5.waterMaterial.uniforms.uCanonWarpLock.value = atCanon ? 1.0 : 0.0;
    p5.config.alive = false;
    p5.syncWaterUniforms();
  }

  startJourney() {
    this.resetToPoster();
    this.state.playing = true;
    this.state.paused = false;
    this.state.origin = performance.now();
    this.state.elapsed = 0;
    this.showToast('ENTER • Poster to world');
  }

  replay() {
    this.startJourney();
    this.showToast('REPLAY • Same journey');
  }

  togglePause() {
    if (!this.state.isLoaded) return this.state.playing;
    if (this.state.elapsed >= T.journeyEnd && !this.state.playing) {
      return false;
    }
    if (this.state.playing) {
      this.state.playing = false;
      this.state.paused = true;
      this.showToast(`Paused ${this.state.elapsed.toFixed(2)}s • ${this.state.stage}`);
    } else {
      this.state.playing = true;
      this.state.paused = false;
      this.state.origin = performance.now() - this.state.elapsed * 1000;
      this.showToast('Resumed');
    }
    return this.state.playing;
  }

  seek(seconds, pause = true) {
    this.state.elapsed = clamp(seconds, 0, T.journeyEnd + 0.01);
    this.state.playing = !pause;
    this.state.paused = pause;
    if (!pause) this.state.origin = performance.now() - this.state.elapsed * 1000;
    this.state.stage = stageAt(this.state.elapsed);
    this.update(performance.now());
  }

  freezeStage(name) {
    const map = {
      POSTER: 0.20,
      'MID AWAKENING': 1.55,
      'MID HANDOFF': 4.00,
      'POST CITADEL': 5.70,
      'POST WATER': 6.21,
      'MID JOURNEY': 10.10,
      REST: T.journeyEnd,
    };
    const t = map[name];
    if (t == null) return;
    this.seek(t, true);
    this.showToast(`Freeze: ${name}`);
  }

  resetToPoster() {
    this.state.playing = false;
    this.state.paused = false;
    this.state.elapsed = 0;
    this.state.stage = 'POSTER';
    this.state.citadelOwned = 0;
    this.state.waterOwned = 0;
    this.state.p03Progress = 0;
    this.state.lastStage = '';
    this._h1Ready = false;
    const p03 = this.p03;
    p03.state.isPlaying = false;
    p03.state.masterProgress = 0;
    p03.camera.position.set(0, 0, 2);
    p03.camera.rotation.set(0, 0, 0);
    this._prepareP05Card();
  }

  onPointerMove() {
    // P06 v1: no pointer parallax.
  }

  onResize(width, height) {
    this.p03.onResize(width, height);
    this.p05.onResize(width, height);
    const dpr = Math.min(window.devicePixelRatio, 2.0);
    const rtW = Math.round(width * dpr);
    const rtH = Math.round(height * dpr);
    this._blend.rtA.setSize(rtW, rtH);
    this._blend.rtB.setSize(rtW, rtH);
  }

  getTelemetry() {
    const pose = this._poseForTime(this.state.elapsed);
    const cam = this.state.elapsed < T.handoffEnd ? this.p03.camera : this.p05.camera;
    return {
      stage: this.state.stage,
      elapsed: this.state.elapsed,
      playing: this.state.playing,
      camX: cam.position.x,
      camY: cam.position.y,
      camZ: cam.position.z,
      yaw: cam.rotation.y,
      pitch: cam.rotation.x,
      yawDeg: cam.rotation.y / DEG,
      pitchDeg: cam.rotation.x / DEG,
      p03Progress: this.state.p03Progress,
      citadelOwned: this.state.citadelOwned,
      waterOwned: this.state.waterOwned,
      pose,
    };
  }

  update(now) {
    if (!this.state.isLoaded) return;

    if (this.state.playing) {
      this.state.elapsed = (now - this.state.origin) / 1000;
      if (this.state.elapsed >= T.journeyEnd) {
        this.state.elapsed = T.journeyEnd;
        this.state.playing = false;
        this.state.paused = false;
        if (this.state.lastStage !== 'REST') this.showToast('Rest • Inside the painting');
      }
    }

    const elapsed = this.state.elapsed;
    const stage = stageAt(elapsed);
    this.state.stage = stage;
    if (stage !== this.state.lastStage && this.state.lastStage) {
      if (stage === 'CITADEL') this.showToast('Citadel takes ownership');
      if (stage === 'WATER') this.showToast('Ocean takes ownership');
      if (stage === 'HOLD') this.showToast('Space established');
      if (stage === 'JOURNEY') this.showToast('Gateway');
    }
    this.state.lastStage = stage;

    const p03p = this._p03ProgressForTime(elapsed);
    this.state.p03Progress = p03p;

    if (elapsed < T.handoffEnd) {
      this.state.citadelOwned = 0;
      this.state.waterOwned = 0;
      this._driveP03(now, p03p);
      return;
    }

    // Ownership freeze: P06 takes the camera. Do not run P03 spatial unlock.
    this.p03.state.isPlaying = false;
    this.p03.state.masterProgress = 0.70;
    this.p03.camera.position.set(FREEZE.x, FREEZE.y, FREEZE.z);
    this.p03.camera.rotation.set(0, 0, 0);
    this.p03.camera.updateMatrixWorld(true);

    const pose = this._poseForTime(elapsed);
    this._applyP05Pose(pose);
    this._syncP05WaterClock(now, pose);
    this._ensureH1();
    this.p05.setComparisonMode('card', true);

    if (elapsed < T.citadelEnd) {
      const u = (elapsed - T.handoffEnd) / (T.citadelEnd - T.handoffEnd);
      this.state.citadelOwned = clamp(u, 0, 1);
      this.state.waterOwned = 0;
      this.p05.setComparisonMode('card', true);
      this._renderP03To(this._blend.rtA);
      this._renderP05To(this._blend.rtB);
      this._composite(smooth01(u));
      return;
    }

    this.state.citadelOwned = 1;

    if (elapsed < T.waterEnd) {
      const u = (elapsed - T.citadelEnd) / (T.waterEnd - T.citadelEnd);
      this.state.waterOwned = clamp(u, 0, 1);
      this._ensureH1();
      this.p05.setComparisonMode('card', true);
      this._renderP05To(this._blend.rtA);
      this.p05.setComparisonMode('h1', true);
      this._renderP05To(this._blend.rtB);
      this._composite(smooth01(u));
      return;
    }

    this.state.waterOwned = 1;
    this._ensureH1();
    this.p05.setComparisonMode('h1', true);
    this._renderP05To(null);
  }
}

export const P06_TIMING = T;
export const P06_FREEZE = FREEZE;
export const P06_REST = REST;
