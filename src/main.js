import * as THREE from 'three';
import { Prototype01 } from './prototype01.js';
import { Prototype02 } from './prototype02.js';
import { Prototype03 } from './prototype03.js';
import { Prototype04 } from './prototype04.js';
import { Prototype05 } from './prototype05.js';

// ============================================================================
// Shared WebGL Setup & Application Controller
// ============================================================================
const canvas = document.getElementById('webgl-canvas');
const container = document.getElementById('canvas-container');
const enterOverlay = document.getElementById('enter-overlay');
const enterBtn = document.getElementById('enter-btn');
const devPanel = document.getElementById('dev-panel');
const devToggleBtn = document.getElementById('dev-toggle-btn');
const devHeaderTitle = document.getElementById('dev-header-title');
const toast = document.getElementById('status-toast');

// Prototype Selector Tabs
const tabProto01 = document.getElementById('tab-proto-01');
const tabProto02 = document.getElementById('tab-proto-02');
const tabProto03 = document.getElementById('tab-proto-03');
const tabProto04 = document.getElementById('tab-proto-04');
const tabProto05 = document.getElementById('tab-proto-05');
const panelProto01 = document.getElementById('panel-proto-01');
const panelProto02 = document.getElementById('panel-proto-02');
const panelProto03 = document.getElementById('panel-proto-03');
const panelProto04 = document.getElementById('panel-proto-04');
const panelProto05 = document.getElementById('panel-proto-05');

// Prototype 04 DOM Elements
const p4BtnPoster = document.getElementById('p4-btn-poster');
const p4BtnProxy = document.getElementById('p4-btn-proxy');
const p4BtnVolume = document.getElementById('p4-btn-volume');
const p4BtnOverlay = document.getElementById('p4-btn-overlay');
const p4BtnSilhouette = document.getElementById('p4-btn-silhouette');
const p4BtnWireframe = document.getElementById('p4-btn-wireframe');
const p4BtnGenerated = document.getElementById('p4-btn-generated');

const p4SliderBlend = document.getElementById('p4-slider-blend');
const p4ValBlend = document.getElementById('p4-val-blend');
const p4BtnMotionPointer = document.getElementById('p4-btn-motion-pointer');
const p4BtnMotionSweep = document.getElementById('p4-btn-motion-sweep');
const p4BtnFlareMode = document.getElementById('p4-btn-flare-mode');

const p4TelDrift = document.getElementById('p4-tel-drift');
const p4TelTriangles = document.getElementById('p4-tel-triangles');
const p4TelVertices = document.getElementById('p4-tel-vertices');
const p4TelThickness = document.getElementById('p4-tel-thickness');
const p4TelZrange = document.getElementById('p4-tel-zrange');
const p4TelCam = document.getElementById('p4-tel-cam');
const p4TelPerf = document.getElementById('p4-tel-perf');

const p4SliderShiftX = document.getElementById('p4-slider-shift-x');
const p4ValShiftX = document.getElementById('p4-val-shift-x');
const p4SliderPushZ = document.getElementById('p4-slider-push-z');
const p4ValPushZ = document.getElementById('p4-val-push-z');
const p4SliderLighting = document.getElementById('p4-slider-lighting');
const p4ValLighting = document.getElementById('p4-val-lighting');

// Prototype 05 DOM Elements
const p5BtnPoster = document.getElementById('p5-btn-poster');
const p5BtnCard = document.getElementById('p5-btn-card');
const p5BtnSlab = document.getElementById('p5-btn-slab');
const p5BtnStack = document.getElementById('p5-btn-stack');
const p5BtnOverlay = document.getElementById('p5-btn-overlay');
const p5BtnWire = document.getElementById('p5-btn-wire');
const p5BtnFootprint = document.getElementById('p5-btn-footprint');
const p5BtnProj = document.getElementById('p5-btn-proj');
const p5BtnProfileDbg = document.getElementById('p5-btn-profiledbg');
const p5BtnTopoBase = document.getElementById('p5-btn-topo-base');
const p5BtnH1 = document.getElementById('p5-btn-h1');
const p5BtnH2 = document.getElementById('p5-btn-h2');
const p5BtnH3 = document.getElementById('p5-btn-h3');
const p5BtnH4 = document.getElementById('p5-btn-h4');
const p5BtnSeaOriginal = document.getElementById('p5-btn-sea-original');
const p5BtnSeaOnly = document.getElementById('p5-btn-sea-only');
const p5BtnFp0 = document.getElementById('p5-btn-fp0');
const p5BtnFp1 = document.getElementById('p5-btn-fp1');
const p5BtnFp2 = document.getElementById('p5-btn-fp2');
const p5SliderH1Far = document.getElementById('p5-slider-h1far');
const p5ValH1Far = document.getElementById('p5-val-h1far');
const p5SliderCoveStart = document.getElementById('p5-slider-covestart');
const p5ValCoveStart = document.getElementById('p5-val-covestart');
const p5SliderCoveFar = document.getElementById('p5-slider-covefar');
const p5ValCoveFar = document.getElementById('p5-val-covefar');
const p5SliderCoveVert = document.getElementById('p5-slider-covevert');
const p5ValCoveVert = document.getElementById('p5-val-covevert');
const p5SliderH3Split = document.getElementById('p5-slider-h3split');
const p5ValH3Split = document.getElementById('p5-val-h3split');
const p5TelTopo = document.getElementById('p5-tel-topo');
const p5TelSeaSource = document.getElementById('p5-tel-seasource');
const p5BtnProfLinear = document.getElementById('p5-btn-prof-linear');
const p5BtnProfSmooth = document.getElementById('p5-btn-prof-smooth');
const p5BtnProfPower = document.getElementById('p5-btn-prof-power');
const p5BtnProfHermite = document.getElementById('p5-btn-prof-hermite');
const p5BtnDepthWrite = document.getElementById('p5-btn-depthwrite');
const p5BtnFootprintToggle = document.getElementById('p5-btn-footprint-toggle');
const p5BtnAlive = document.getElementById('p5-btn-alive');
const p5BtnContact = document.getElementById('p5-btn-contact');
const p5BtnMotionPointer = document.getElementById('p5-btn-motion-pointer');
const p5BtnMotionPath = document.getElementById('p5-btn-motion-path');
const p5BtnFlareMode = document.getElementById('p5-btn-flare-mode');
const p5SliderZHorizon = document.getElementById('p5-slider-zhorizon');
const p5ValZHorizon = document.getElementById('p5-val-zhorizon');
const p5SliderZNear = document.getElementById('p5-slider-znear');
const p5ValZNear = document.getElementById('p5-val-znear');
const p5SliderGamma = document.getElementById('p5-slider-gamma');
const p5ValGamma = document.getElementById('p5-val-gamma');
const p5SliderTMid = document.getElementById('p5-slider-tmid');
const p5ValTMid = document.getElementById('p5-val-tmid');
const p5SliderZMidT = document.getElementById('p5-slider-zmidt');
const p5ValZMidT = document.getElementById('p5-val-zmidt');
const p5SliderFeather = document.getElementById('p5-slider-feather');
const p5ValFeather = document.getElementById('p5-val-feather');
const p5SliderShiftX = document.getElementById('p5-slider-shift-x');
const p5ValShiftX = document.getElementById('p5-val-shift-x');
const p5SliderPushZ = document.getElementById('p5-slider-push-z');
const p5ValPushZ = document.getElementById('p5-val-push-z');
const p5TelProfile = document.getElementById('p5-tel-profile');
const p5TelVerts = document.getElementById('p5-tel-verts');
const p5TelTris = document.getElementById('p5-tel-tris');
const p5TelZh = document.getElementById('p5-tel-zh');
const p5TelZn = document.getElementById('p5-tel-zn');
const p5TelCam = document.getElementById('p5-tel-cam');
const p5TelHorizon = document.getElementById('p5-tel-horizon');
const p5TelPerf = document.getElementById('p5-tel-perf');

// Prototype 03 DOM Elements
const p3BadgeStage = document.getElementById('p3-badge-stage');
const p3ValProgress = document.getElementById('p3-val-progress');
const p3SliderProgress = document.getElementById('p3-slider-progress');
const p3BtnReplay = document.getElementById('p3-btn-replay');
const p3BtnPlaypause = document.getElementById('p3-btn-playpause');
const p3BtnSolo = document.getElementById('p3-btn-solo');

const p3BtnDiagNormal = document.getElementById('p3-btn-diag-normal');
const p3BtnDiagOverlay = document.getElementById('p3-btn-diag-overlay');
const p3BtnDiagDiff = document.getElementById('p3-btn-diag-diff');
const p3BtnDiagP1 = document.getElementById('p3-btn-diag-p1');
const p3BtnDiagP2 = document.getElementById('p3-btn-diag-p2');

const p3TelMax = document.getElementById('p3-tel-max');
const p3TelSentinel = document.getElementById('p3-tel-sentinel');
const p3TelCitadel = document.getElementById('p3-tel-citadel');
const p3TelNeedle = document.getElementById('p3-tel-needle');
const p3TelHorizon = document.getElementById('p3-tel-horizon');
const p3TelWeights = document.getElementById('p3-tel-weights');
const p3TelPerf = document.getElementById('p3-tel-perf');

const p3SliderDuration = document.getElementById('p3-slider-duration');
const p3ValDuration = document.getElementById('p3-val-duration');
const p3SliderMaxdepth = document.getElementById('p3-slider-maxdepth');
const p3ValMaxdepth = document.getElementById('p3-val-maxdepth');
const p3SliderPush = document.getElementById('p3-slider-push');
const p3ValPush = document.getElementById('p3-val-push');
const p3SliderHstart = document.getElementById('p3-slider-hstart');
const p3SliderHend = document.getElementById('p3-slider-hend');
const p3ValWindow = document.getElementById('p3-val-window');
const p3SliderUnlock = document.getElementById('p3-slider-unlock');
const p3ValUnlock = document.getElementById('p3-val-unlock');
const p3SliderParallax = document.getElementById('p3-slider-parallax');
const p3ValParallax = document.getElementById('p3-val-parallax');
const p3SliderGain = document.getElementById('p3-slider-gain');
const p3ValGain = document.getElementById('p3-val-gain');

// Prototype 02 DOM Elements
const p2BtnOriginal = document.getElementById('p2-btn-original');
const p2BtnProxy = document.getElementById('p2-btn-proxy');
const p2BtnParallax = document.getElementById('p2-btn-parallax');
const p2BtnMask = document.getElementById('p2-btn-mask');
const p2BtnMotionPointer = document.getElementById('p2-btn-motion-pointer');
const p2BtnMotionSweep = document.getElementById('p2-btn-motion-sweep');
const p2BtnFlareMode = document.getElementById('p2-btn-flare-mode');

const layerBtns = {
  sky: document.getElementById('layer-btn-sky'),
  ribbons: document.getElementById('layer-btn-ribbons'),
  sentinel: document.getElementById('layer-btn-sentinel'),
  citadel: document.getElementById('layer-btn-citadel'),
  needles: document.getElementById('layer-btn-needles'),
  water: document.getElementById('layer-btn-water'),
  flare: document.getElementById('layer-btn-flare'),
};

const p2SliderShift = document.getElementById('p2-slider-shift');
const p2SliderPush = document.getElementById('p2-slider-push');
const p2SliderSentinelZ = document.getElementById('p2-slider-sentinel-z');
const p2SliderCitadelZ = document.getElementById('p2-slider-citadel-z');
const p2ValShift = document.getElementById('p2-val-shift');
const p2ValPush = document.getElementById('p2-val-push');
const p2ValSentinelZ = document.getElementById('p2-val-sentinel-z');
const p2ValCitadelZ = document.getElementById('p2-val-citadel-z');

// Prototype 01 DOM Elements
const p1BtnFlat = document.getElementById('p1-btn-flat');
const p1BtnDepth = document.getElementById('p1-btn-depth');
const p1BtnMap = document.getElementById('p1-btn-map');
const p1BtnTechMesh = document.getElementById('p1-btn-tech-mesh');
const p1BtnTechPom = document.getElementById('p1-btn-tech-pom');
const p1BtnReawaken = document.getElementById('p1-btn-reawaken');
const p1BtnToggleParallax = document.getElementById('p1-btn-toggle-parallax');
const p1SliderDepth = document.getElementById('p1-slider-depth');
const p1SliderPush = document.getElementById('p1-slider-push');
const p1SliderParallax = document.getElementById('p1-slider-parallax');
const p1SliderDuration = document.getElementById('p1-slider-duration');
const p1ValDepth = document.getElementById('p1-val-depth');
const p1ValPush = document.getElementById('p1-val-push');
const p1ValParallax = document.getElementById('p1-val-parallax');
const p1ValDuration = document.getElementById('p1-val-duration');

// ============================================================================
// Toast Notification System
// ============================================================================
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('toast-hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('toast-hidden');
  }, 1800);
}

// ============================================================================
// WebGL Renderer
// ============================================================================
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
renderer.setSize(container.clientWidth, container.clientHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Instantiate all four prototypes
const proto01 = new Prototype01(renderer, container, showToast);
const proto02 = new Prototype02(renderer, container, showToast);
const proto03 = new Prototype03(renderer, container, showToast);
const proto04 = new Prototype04(renderer, container, showToast);
const proto05 = new Prototype05(renderer, container, showToast);
window.__p05 = proto05;

// Active prototype reference ('p1'–'p5'). Default remains Prototype 04.
let activeProtoId = 'p4';
let activeProto = proto04;

// Check URL query param ?p=1, ?p=2, ?p=3, ?p=4, or ?p=5
const urlParams = new URLSearchParams(window.location.search);
const pParam = urlParams.get('p');
if (pParam === '1') {
  activeProtoId = 'p1';
  activeProto = proto01;
} else if (pParam === '2') {
  activeProtoId = 'p2';
  activeProto = proto02;
} else if (pParam === '3') {
  activeProtoId = 'p3';
  activeProto = proto03;
} else if (pParam === '5') {
  activeProtoId = 'p5';
  activeProto = proto05;
} else {
  activeProtoId = 'p4';
  activeProto = proto04;
}

// Immediately synchronize UI with active prototype
updateActiveUI();

// Load assets for all four prototypes
Promise.all([
  proto01.loadAssets().catch(err => console.error('P01 asset load error:', err)),
  proto02.loadAssets().catch(err => console.error('P02 asset load error:', err)),
  proto03.loadAssets().catch(err => console.error('P03 asset load error:', err)),
  proto04.loadAssets().catch(err => console.error('P04 asset load error:', err)),
  proto05.loadAssets().catch(err => console.error('P05 asset load error:', err)),
]).then(() => {
  console.log('All prototype assets loaded successfully.');
  updateActiveUI();
  animate();
});

// ============================================================================
// Prototype Switching & UI Management
// ============================================================================
function switchPrototype(id) {
  if (activeProtoId === id) return;
  activeProtoId = id;
  if (id === 'p1') activeProto = proto01;
  else if (id === 'p2') activeProto = proto02;
  else if (id === 'p3') activeProto = proto03;
  else if (id === 'p5') activeProto = proto05;
  else activeProto = proto04;

  // Update URL without page reload
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set('p', id.replace('p', ''));
  window.history.replaceState({}, '', newUrl);

  updateActiveUI();
  const names = {
    p1: 'Switched to Prototype 01: Awakening',
    p2: 'Switched to Prototype 02: Proxies',
    p3: 'Switched to Prototype 03: Invisible Handoff',
    p4: 'Switched to Prototype 04: Citadel Volumetric Reconstruction',
    p5: 'Switched to Prototype 05: Painted Ocean Spatial Reconstruction',
  };
  showToast(names[id] || id);
}

function updateActiveUI() {
  const isP1 = activeProtoId === 'p1';
  const isP2 = activeProtoId === 'p2';
  const isP3 = activeProtoId === 'p3';
  const isP4 = activeProtoId === 'p4';
  const isP5 = activeProtoId === 'p5';

  tabProto01.classList.toggle('active', isP1);
  tabProto02.classList.toggle('active', isP2);
  tabProto03.classList.toggle('active', isP3);
  tabProto04.classList.toggle('active', isP4);
  tabProto05.classList.toggle('active', isP5);

  panelProto01.classList.toggle('panel-hidden', !isP1);
  panelProto02.classList.toggle('panel-hidden', !isP2);
  panelProto03.classList.toggle('panel-hidden', !isP3);
  panelProto04.classList.toggle('panel-hidden', !isP4);
  panelProto05.classList.toggle('panel-hidden', !isP5);

  if (isP1) devHeaderTitle.textContent = 'PROTOTYPE 01 • DEPTH AWAKENING';
  else if (isP2) devHeaderTitle.textContent = 'PROTOTYPE 02 • PROXY RECONSTRUCTION';
  else if (isP3) devHeaderTitle.textContent = 'PROTOTYPE 03 • INVISIBLE HANDOFF';
  else if (isP5) devHeaderTitle.textContent = 'PROTOTYPE 05 • PAINTED OCEAN SPATIAL RECONSTRUCTION';
  else devHeaderTitle.textContent = 'PROTOTYPE 04 • CITADEL VOLUMETRIC RECONSTRUCTION';

  // Manage ENTER overlay
  if (isP3 && proto03.state.masterProgress <= 0.0001 && !proto03.state.isPlaying) {
    enterOverlay.classList.remove('overlay-state-hidden');
    enterOverlay.classList.add('overlay-state-visible');
  } else if (isP1 && !proto01.state.isAwakened && !proto01.state.isTransitioning) {
    enterOverlay.classList.remove('overlay-state-hidden');
    enterOverlay.classList.add('overlay-state-visible');
  } else {
    enterOverlay.classList.remove('overlay-state-visible');
    enterOverlay.classList.add('overlay-state-hidden');
  }
}


// ============================================================================
// Event Listeners: Prototype 03 Controls
// ============================================================================
let isUserDraggingP3Slider = false;

function initPrototype03Events() {
  enterBtn.addEventListener('click', () => {
    if (activeProtoId === 'p3') {
      proto03.startAwakening();
      enterOverlay.classList.remove('overlay-state-visible');
      enterOverlay.classList.add('overlay-state-hidden');
    } else if (activeProtoId === 'p1') {
      proto01.startAwakening();
      enterOverlay.classList.remove('overlay-state-visible');
      enterOverlay.classList.add('overlay-state-hidden');
    }
  });

  p3BtnReplay.addEventListener('click', () => {
    proto03.replay();
    enterOverlay.classList.remove('overlay-state-visible');
    enterOverlay.classList.add('overlay-state-hidden');
    p3BtnPlaypause.textContent = 'Pause';
  });

  p3BtnPlaypause.addEventListener('click', () => {
    const isPlaying = proto03.togglePlayPause();
    p3BtnPlaypause.textContent = isPlaying ? 'Pause' : 'Play';
  });

  p3BtnSolo.addEventListener('click', () => {
    const isSolo = proto03.toggleSoloMode();
    p3BtnSolo.classList.toggle('active', isSolo);
    p3BtnSolo.textContent = isSolo ? 'Exit Solo' : 'Solo Handoff';
  });

  // Progress scrubber
  p3SliderProgress.addEventListener('mousedown', () => { isUserDraggingP3Slider = true; });
  p3SliderProgress.addEventListener('touchstart', () => { isUserDraggingP3Slider = true; });
  window.addEventListener('mouseup', () => { isUserDraggingP3Slider = false; });
  window.addEventListener('touchend', () => { isUserDraggingP3Slider = false; });

  p3SliderProgress.addEventListener('input', (e) => {
    const p = parseFloat(e.target.value);
    proto03.setMasterProgress(p);
  });

  // Diagnostic mode buttons
  const diagButtons = {
    normal: p3BtnDiagNormal,
    overlay: p3BtnDiagOverlay,
    diff: p3BtnDiagDiff,
    p1: p3BtnDiagP1,
    p2: p3BtnDiagP2,
  };

  const updateDiagBtns = (mode) => {
    Object.keys(diagButtons).forEach((key) => {
      diagButtons[key].classList.toggle('active', key === mode);
    });
  };

  p3BtnDiagNormal.addEventListener('click', () => { proto03.setDiagnosticMode('normal'); updateDiagBtns('normal'); });
  p3BtnDiagOverlay.addEventListener('click', () => { proto03.setDiagnosticMode('overlay'); updateDiagBtns('overlay'); });
  p3BtnDiagDiff.addEventListener('click', () => { proto03.setDiagnosticMode('diff'); updateDiagBtns('diff'); });
  p3BtnDiagP1.addEventListener('click', () => { proto03.setDiagnosticMode('p1'); updateDiagBtns('p1'); });
  p3BtnDiagP2.addEventListener('click', () => { proto03.setDiagnosticMode('p2'); updateDiagBtns('p2'); });

  // Tunable Sliders
  p3SliderDuration.addEventListener('input', (e) => {
    proto03.config.totalDuration = parseFloat(e.target.value);
    p3ValDuration.textContent = `${proto03.config.totalDuration.toFixed(1)}s`;
    p3BtnReplay.textContent = `Replay (${proto03.config.totalDuration.toFixed(1)}s)`;
  });

  p3SliderMaxdepth.addEventListener('input', (e) => {
    proto03.config.p1MaxDepth = parseFloat(e.target.value);
    p3ValMaxdepth.textContent = proto03.config.p1MaxDepth.toFixed(3);
  });

  p3SliderPush.addEventListener('input', (e) => {
    proto03.config.cameraPush = parseFloat(e.target.value);
    p3ValPush.textContent = proto03.config.cameraPush.toFixed(3);
  });

  const updateHandoffWindowLabel = () => {
    p3ValWindow.textContent = `${proto03.config.handoffStart.toFixed(2)} — ${proto03.config.handoffEnd.toFixed(2)}`;
  };

  p3SliderHstart.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (val < proto03.config.handoffEnd - 0.05) {
      proto03.config.handoffStart = val;
    } else {
      proto03.config.handoffStart = proto03.config.handoffEnd - 0.05;
      e.target.value = proto03.config.handoffStart;
    }
    updateHandoffWindowLabel();
  });

  p3SliderHend.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (val > proto03.config.handoffStart + 0.05) {
      proto03.config.handoffEnd = val;
    } else {
      proto03.config.handoffEnd = proto03.config.handoffStart + 0.05;
      e.target.value = proto03.config.handoffEnd;
    }
    updateHandoffWindowLabel();
  });

  p3SliderUnlock.addEventListener('input', (e) => {
    proto03.config.spatialUnlockStart = parseFloat(e.target.value);
    p3ValUnlock.textContent = proto03.config.spatialUnlockStart.toFixed(2);
  });

  p3SliderParallax.addEventListener('input', (e) => {
    proto03.config.finalParallaxShift = parseFloat(e.target.value);
    proto03.config.finalParallaxTilt = proto03.config.finalParallaxShift * 0.44;
    p3ValParallax.textContent = proto03.config.finalParallaxShift.toFixed(3);
  });

  p3SliderGain.addEventListener('input', (e) => {
    proto03.config.diffGain = parseFloat(e.target.value);
    proto03.compositeMaterial.uniforms.uDiffGain.value = proto03.config.diffGain;
    p3ValGain.textContent = `${proto03.config.diffGain.toFixed(1)}x`;
  });
}

function updateP3TelemetryUI() {
  const st = proto03.state;

  // 1. Stage Badge & Progress
  p3BadgeStage.textContent = st.currentStage;
  p3BadgeStage.className = 'stage-badge ' + {
    IDLE: 'stage-idle',
    AWAKENING: 'stage-awakening',
    HANDOFF: 'stage-handoff',
    SPATIAL_UNLOCK: 'stage-spatial',
    COMPLETE: 'stage-complete',
  }[st.currentStage];

  p3ValProgress.textContent = `${(st.masterProgress * 100).toFixed(1)}%`;

  if (!isUserDraggingP3Slider) {
    p3SliderProgress.value = st.masterProgress.toFixed(3);
  }

  // 2. Alignment & Drift Telemetry
  p3TelMax.textContent = `${st.maxDriftPx.toFixed(2)} px`;
  if (st.landmarks.sentinel) p3TelSentinel.textContent = `${st.landmarks.sentinel.drift.toFixed(2)} px`;
  if (st.landmarks.citadelApex) p3TelCitadel.textContent = `${st.landmarks.citadelApex.drift.toFixed(2)} px`;
  if (st.landmarks.needle) p3TelNeedle.textContent = `${st.landmarks.needle.drift.toFixed(2)} px`;
  if (st.landmarks.horizon) p3TelHorizon.textContent = `${st.landmarks.horizon.drift.toFixed(2)} px`;

  p3TelWeights.textContent = `P01: ${Math.round(st.p1Weight * 100)}% | P02: ${Math.round(st.p2Weight * 100)}%`;
  p3TelPerf.textContent = `${st.fps} fps (${st.frameTimeMs.toFixed(1)} ms)`;
}

// ============================================================================
// Event Listeners: Prototype 02 Controls
// ============================================================================
function initPrototype02Events() {
  p2BtnOriginal.addEventListener('click', () => {
    proto02.setComparisonMode('original');
    updateP2ComparisonButtons('original');
  });

  p2BtnProxy.addEventListener('click', () => {
    proto02.setComparisonMode('proxy');
    updateP2ComparisonButtons('proxy');
  });

  p2BtnParallax.addEventListener('click', () => {
    proto02.setComparisonMode('parallax');
    updateP2ComparisonButtons('parallax');
  });

  p2BtnMask.addEventListener('click', () => {
    proto02.setComparisonMode('mask');
    updateP2ComparisonButtons('mask');
  });

  p2BtnMotionPointer.addEventListener('click', () => {
    proto02.config.scriptedSweep = false;
    proto02.config.parallaxEnabled = true;
    p2BtnMotionPointer.classList.add('active');
    p2BtnMotionSweep.classList.remove('active');
    showToast('Motion: Manual Pointer Tracking');
  });

  p2BtnMotionSweep.addEventListener('click', () => {
    proto02.config.scriptedSweep = true;
    proto02.config.parallaxEnabled = true;
    p2BtnMotionSweep.classList.add('active');
    p2BtnMotionPointer.classList.remove('active');
    showToast('Motion: Scripted Left-Right Parallax Sweep');
  });

  p2BtnFlareMode.addEventListener('click', () => {
    const nextMode = proto02.toggleFlareMode();
    p2BtnFlareMode.textContent = nextMode === 'spire'
      ? 'Flare: SPIRE-LOCKED'
      : 'Flare: SKY-LOCKED';
  });

  // Layer toggle buttons
  Object.keys(layerBtns).forEach((key) => {
    const btn = layerBtns[key];
    if (btn) {
      btn.addEventListener('click', () => {
        const isVisible = proto02.toggleLayer(key);
        btn.classList.toggle('active', isVisible);
      });
    }
  });

  // Prototype 02 Sliders
  p2SliderShift.addEventListener('input', (e) => {
    proto02.config.parallaxShift = parseFloat(e.target.value);
    p2ValShift.textContent = proto02.config.parallaxShift.toFixed(3);
  });

  p2SliderPush.addEventListener('input', (e) => {
    proto02.config.cameraPush = parseFloat(e.target.value);
    p2ValPush.textContent = proto02.config.cameraPush.toFixed(3);
  });

  p2SliderSentinelZ.addEventListener('input', (e) => {
    const z = parseFloat(e.target.value);
    proto02.config.depths.sentinel = z;
    p2ValSentinelZ.textContent = z.toFixed(2);
    if (proto02.layerMeshes.sentinel) {
      proto02.layerMeshes.sentinel.position.z = z;
      const size = proto02.canonicalCamPos.z - z;
      proto02.layerMeshes.sentinel.scale.set(size / 2.0, size / 2.0, 1.0);
    }
  });

  p2SliderCitadelZ.addEventListener('input', (e) => {
    const z = parseFloat(e.target.value);
    proto02.config.depths.citadel = z;
    p2ValCitadelZ.textContent = z.toFixed(2);
    if (proto02.layerMeshes.citadel) {
      proto02.layerMeshes.citadel.position.z = z;
      const size = proto02.canonicalCamPos.z - z;
      proto02.layerMeshes.citadel.scale.set(size / 2.0, size / 2.0, 1.0);
    }
  });
}

function updateP2ComparisonButtons(active) {
  p2BtnOriginal.classList.toggle('active', active === 'original');
  p2BtnProxy.classList.toggle('active', active === 'proxy');
  p2BtnParallax.classList.toggle('active', active === 'parallax');
  p2BtnMask.classList.toggle('active', active === 'mask');
}

// ============================================================================
// Event Listeners: Prototype 01 Controls
// ============================================================================
function initPrototype01Events() {
  p1BtnFlat.addEventListener('click', () => {
    proto01.setDisplayMode('flat');
    updateP1ModeButtons('flat');
  });

  p1BtnDepth.addEventListener('click', () => {
    proto01.setDisplayMode('awakened');
    updateP1ModeButtons('awakened');
  });

  p1BtnMap.addEventListener('click', () => {
    proto01.setDisplayMode('map');
    updateP1ModeButtons('map');
  });

  p1BtnTechMesh.addEventListener('click', () => {
    proto01.setTechnique(0);
    p1BtnTechMesh.classList.add('active');
    p1BtnTechPom.classList.remove('active');
  });

  p1BtnTechPom.addEventListener('click', () => {
    proto01.setTechnique(1);
    p1BtnTechPom.classList.add('active');
    p1BtnTechMesh.classList.remove('active');
  });

  p1BtnReawaken.addEventListener('click', () => {
    proto01.replayAwakening();
  });

  p1BtnToggleParallax.addEventListener('click', () => {
    const isParallax = proto01.toggleParallax();
    p1BtnToggleParallax.classList.toggle('active', isParallax);
    p1BtnToggleParallax.textContent = isParallax ? 'Parallax: ON' : 'Parallax: OFF';
  });

  p1SliderDepth.addEventListener('input', (e) => {
    proto01.config.depthStrength = parseFloat(e.target.value);
    p1ValDepth.textContent = proto01.config.depthStrength.toFixed(3);
    if (proto01.depthMaterial) {
      proto01.depthMaterial.uniforms.uDepthStrength.value = proto01.config.depthStrength;
    }
  });

  p1SliderPush.addEventListener('input', (e) => {
    proto01.config.cameraPush = parseFloat(e.target.value);
    p1ValPush.textContent = proto01.config.cameraPush.toFixed(3);
    if (proto01.state.isAwakened) {
      proto01.state.targetCamZ = proto01.state.initialCamZ - proto01.config.cameraPush;
    }
  });

  p1SliderParallax.addEventListener('input', (e) => {
    proto01.config.parallaxStrength = parseFloat(e.target.value);
    p1ValParallax.textContent = proto01.config.parallaxStrength.toFixed(3);
  });

  p1SliderDuration.addEventListener('input', (e) => {
    proto01.config.awakeningDuration = parseFloat(e.target.value);
    p1ValDuration.textContent = `${proto01.config.awakeningDuration.toFixed(1)}s`;
  });
}

function updateP1ModeButtons(mode) {
  p1BtnFlat.classList.toggle('active', mode === 'flat');
  p1BtnDepth.classList.toggle('active', mode === 'awakened');
  p1BtnMap.classList.toggle('active', mode === 'map');
}

// ============================================================================
// Event Listeners: Prototype 04 Controls
// ============================================================================
function updateP4ComparisonButtons(mode) {
  p4BtnPoster.classList.toggle('active', mode === 'poster');
  p4BtnProxy.classList.toggle('active', mode === 'proxy');
  p4BtnVolume.classList.toggle('active', mode === 'volume');
  p4BtnOverlay.classList.toggle('active', mode === 'overlay');
  p4BtnSilhouette.classList.toggle('active', mode === 'silhouette');
  p4BtnWireframe.classList.toggle('active', mode === 'wireframe');
  p4BtnGenerated.classList.toggle('active', mode === 'generated');

  if (mode === 'proxy') {
    p4SliderBlend.value = 0.0;
    p4ValBlend.textContent = '0% (Flat Proxy)';
  } else if (mode === 'volume') {
    p4SliderBlend.value = 1.0;
    p4ValBlend.textContent = '100% Volume';
  } else if (mode === 'overlay') {
    p4SliderBlend.value = 0.5;
    p4ValBlend.textContent = '50% Overlay';
  }
}

function updateP4TelemetryUI() {
  const telem = proto04.state.telemetry;
  p4TelDrift.textContent = `${telem.canonDriftPx.toFixed(2)} px (Exact)`;
  p4TelTriangles.textContent = `${telem.triangles}`;
  p4TelVertices.textContent = `${telem.vertices}`;
  p4TelThickness.textContent = `${(proto04.meshData ? proto04.meshData.bounds.thickness : 0.382).toFixed(3)}`;
  p4TelCam.textContent = `X: ${telem.camX.toFixed(2)} | Y: ${telem.camY.toFixed(2)} | Z: ${telem.camZ.toFixed(2)} | Yaw: ${telem.camYawDeg.toFixed(1)}°`;
  p4TelPerf.textContent = `60 fps (16.6 ms) | ${telem.drawCalls} draw calls`;
}

function initPrototype04Events() {
  p4BtnPoster.addEventListener('click', () => {
    proto04.setComparisonMode('poster');
    updateP4ComparisonButtons('poster');
  });

  p4BtnProxy.addEventListener('click', () => {
    proto04.setComparisonMode('proxy');
    updateP4ComparisonButtons('proxy');
  });

  p4BtnVolume.addEventListener('click', () => {
    proto04.setComparisonMode('volume');
    updateP4ComparisonButtons('volume');
  });

  p4BtnOverlay.addEventListener('click', () => {
    proto04.setComparisonMode('overlay');
    updateP4ComparisonButtons('overlay');
  });

  p4BtnSilhouette.addEventListener('click', () => {
    proto04.setComparisonMode('silhouette');
    updateP4ComparisonButtons('silhouette');
  });

  p4BtnWireframe.addEventListener('click', () => {
    proto04.setComparisonMode('wireframe');
    updateP4ComparisonButtons('wireframe');
  });

  p4BtnGenerated.addEventListener('click', () => {
    proto04.setComparisonMode('generated');
    updateP4ComparisonButtons('generated');
  });

  p4SliderBlend.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    proto04.setVolumeBlend(val);
    if (val <= 0.01) {
      p4ValBlend.textContent = '0% (Flat Proxy)';
      updateP4ComparisonButtons('proxy');
    } else if (val >= 0.99) {
      p4ValBlend.textContent = '100% Volume';
      updateP4ComparisonButtons('volume');
    } else {
      p4ValBlend.textContent = `${Math.round(val * 100)}% Volume`;
      p4BtnProxy.classList.remove('active');
      p4BtnVolume.classList.remove('active');
      p4BtnOverlay.classList.toggle('active', Math.abs(val - 0.5) < 0.05);
    }
  });

  p4BtnMotionPointer.addEventListener('click', () => {
    proto04.config.scriptedSweep = false;
    proto04.config.parallaxEnabled = true;
    p4BtnMotionPointer.classList.add('active');
    p4BtnMotionSweep.classList.remove('active');
    showToast('Motion: Pointer (Manual)');
  });

  p4BtnMotionSweep.addEventListener('click', () => {
    const isSweep = proto04.toggleScriptedSweep();
    p4BtnMotionSweep.classList.toggle('active', isSweep);
    p4BtnMotionPointer.classList.toggle('active', !isSweep);
  });

  p4BtnFlareMode.addEventListener('click', () => {
    const mode = proto04.toggleFlareMode();
    p4BtnFlareMode.textContent = mode === 'spire'
      ? 'Flare: SPIRE-LOCKED'
      : 'Flare: SKY-LOCKED';
  });

  p4SliderShiftX.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    proto04.config.parallaxShiftX = val;
    p4ValShiftX.textContent = val.toFixed(3);
  });

  p4SliderPushZ.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    proto04.config.cameraPush = val;
    p4ValPushZ.textContent = val.toFixed(3);
  });

  p4SliderLighting.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    proto04.config.lightingStrength = val;
    if (proto04.volumeMaterial) {
      proto04.volumeMaterial.uniforms.uLightingStrength.value = val;
    }
    p4ValLighting.textContent = val.toFixed(2);
  });
}

function updateP5ComparisonButtons(mode) {
  p5BtnPoster.classList.toggle('active', mode === 'poster');
  p5BtnCard.classList.toggle('active', mode === 'card');
  p5BtnSlab.classList.toggle('active', mode === 'slab' || mode === 'h1' || mode === 'h2' || mode === 'h3' || mode === 'h4');
  p5BtnStack.classList.toggle('active', mode === 'stack');
  p5BtnOverlay.classList.toggle('active', mode === 'overlay');
  p5BtnWire.classList.toggle('active', mode === 'wireframe');
  p5BtnFootprint.classList.toggle('active', mode === 'footprint');
  p5BtnProj.classList.toggle('active', mode === 'projection');
  p5BtnProfileDbg.classList.toggle('active', mode === 'profile');
  const topo = proto05.config.topology;
  p5BtnTopoBase.classList.toggle('active', topo === 'baseline' && (mode === 'slab' || mode === 'wireframe' || mode === 'footprint' || mode === 'projection' || mode === 'profile' || mode === 'overlay'));
  p5BtnH1.classList.toggle('active', mode === 'h1' || (topo === 'h1' && mode !== 'poster' && mode !== 'card' && mode !== 'stack'));
  p5BtnH2.classList.toggle('active', mode === 'h2' || (topo === 'h2' && mode !== 'poster' && mode !== 'card' && mode !== 'stack'));
  p5BtnH3.classList.toggle('active', mode === 'h3' || (topo === 'h3' && mode !== 'poster' && mode !== 'card' && mode !== 'stack'));
  p5BtnH4.classList.toggle('active', mode === 'h4' || (topo === 'h4' && mode !== 'poster' && mode !== 'card' && mode !== 'stack'));
  if (mode === 'slab') {
    p5BtnH1.classList.remove('active');
    p5BtnH2.classList.remove('active');
    p5BtnH3.classList.remove('active');
    p5BtnH4.classList.remove('active');
    p5BtnTopoBase.classList.add('active');
    p5BtnSlab.classList.add('active');
  }
}

function updateP5SeaSourceButtons(source) {
  const seaOnly = source === 'sea-only';
  p5BtnSeaOriginal.classList.toggle('active', !seaOnly);
  p5BtnSeaOnly.classList.toggle('active', seaOnly);
}

function updateP5FootprintButtons(mode) {
  p5BtnFp0.classList.toggle('active', mode === 0);
  p5BtnFp1.classList.toggle('active', mode === 1);
  p5BtnFp2.classList.toggle('active', mode === 2);
}

function updateP5ProfileButtons(profile) {
  p5BtnProfLinear.classList.toggle('active', profile === 'linear');
  p5BtnProfSmooth.classList.toggle('active', profile === 'smooth');
  p5BtnProfPower.classList.toggle('active', profile === 'power');
  p5BtnProfHermite.classList.toggle('active', profile === 'hermite');
}

function updateP5TelemetryUI() {
  const telem = proto05.state.telemetry;
  p5TelProfile.textContent = String(telem.profile || proto05.config.profile).toUpperCase();
  p5TelTopo.textContent = String(telem.topology || proto05.config.topology).toUpperCase();
  p5TelSeaSource.textContent = String(telem.seaSource || proto05.config.seaSource).toUpperCase();
  p5TelVerts.textContent = `${telem.waterVerts}`;
  p5TelTris.textContent = `${telem.waterTris}`;
  p5TelZh.textContent = Number(telem.zHorizon).toFixed(2);
  p5TelZn.textContent = Number(telem.zNear).toFixed(2);
  p5TelCam.textContent = `X: ${telem.camX.toFixed(2)} | Y: ${telem.camY.toFixed(2)} | Z: ${telem.camZ.toFixed(2)} | Yaw: ${telem.camYawDeg.toFixed(1)}°`;
  const hPy = Number(telem.horizonPy);
  p5TelHorizon.textContent = `${hPy.toFixed(3)}  (${(hPy * 1024).toFixed(1)} px)`;
  p5TelPerf.textContent = `${proto05.state.fps} fps (${proto05.state.frameTimeMs.toFixed(1)} ms) | ${telem.drawCalls} draw calls`;
}

function initPrototype05Events() {
  p5BtnTopoBase.addEventListener('click', () => {
    proto05.setTopology('baseline');
    updateP5ComparisonButtons('slab');
  });
  p5BtnH1.addEventListener('click', () => {
    proto05.setTopology('h1');
    updateP5ComparisonButtons('h1');
    updateP5SeaSourceButtons(proto05.config.seaSource);
  });
  p5BtnH2.addEventListener('click', () => {
    proto05.setTopology('h2');
    updateP5ComparisonButtons('h2');
  });
  p5BtnH3.addEventListener('click', () => {
    proto05.setTopology('h3');
    updateP5ComparisonButtons('h3');
  });
  p5BtnH4.addEventListener('click', () => {
    proto05.setTopology('h4');
    updateP5ComparisonButtons('h4');
  });

  p5BtnSeaOriginal.addEventListener('click', () => {
    proto05.setSeaSource('original');
    updateP5SeaSourceButtons('original');
  });
  p5BtnSeaOnly.addEventListener('click', () => {
    proto05.setSeaSource('sea-only');
    updateP5SeaSourceButtons('sea-only');
  });

  p5BtnFp0.addEventListener('click', () => { proto05.setFootprintMode(0); updateP5FootprintButtons(0); });
  p5BtnFp1.addEventListener('click', () => { proto05.setFootprintMode(1); updateP5FootprintButtons(1); });
  p5BtnFp2.addEventListener('click', () => { proto05.setFootprintMode(2); updateP5FootprintButtons(2); });

  p5SliderH1Far.addEventListener('input', (e) => {
    proto05.config.h1FarZ = parseFloat(e.target.value);
    p5ValH1Far.textContent = proto05.config.h1FarZ.toFixed(2);
    if (proto05.config.topology === 'h1') proto05.rebuildWater();
  });
  p5SliderCoveStart.addEventListener('input', (e) => {
    proto05.config.coveStart = parseFloat(e.target.value);
    p5ValCoveStart.textContent = proto05.config.coveStart.toFixed(2);
    if (proto05.config.topology === 'h2') proto05.rebuildWater();
  });
  p5SliderCoveFar.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    proto05.config.coveFarZ = val;
    proto05.config.h3FarZ = val;
    p5ValCoveFar.textContent = val.toFixed(2);
    if (proto05.config.topology === 'h2' || proto05.config.topology === 'h3') proto05.rebuildWater();
  });
  p5SliderCoveVert.addEventListener('input', (e) => {
    proto05.config.coveVerticality = parseFloat(e.target.value);
    p5ValCoveVert.textContent = proto05.config.coveVerticality.toFixed(2);
    if (proto05.config.topology === 'h2') proto05.rebuildWater();
  });
  p5SliderH3Split.addEventListener('input', (e) => {
    proto05.config.h3Split = parseFloat(e.target.value);
    p5ValH3Split.textContent = proto05.config.h3Split.toFixed(2);
    if (proto05.config.topology === 'h3') proto05.rebuildWater();
  });

  const modeMap = {
    poster: p5BtnPoster,
    card: p5BtnCard,
    slab: p5BtnSlab,
    stack: p5BtnStack,
    overlay: p5BtnOverlay,
    wireframe: p5BtnWire,
    footprint: p5BtnFootprint,
    projection: p5BtnProj,
    profile: p5BtnProfileDbg,
  };
  Object.entries(modeMap).forEach(([mode, btn]) => {
    btn.addEventListener('click', () => {
      proto05.setComparisonMode(mode);
      updateP5ComparisonButtons(mode);
    });
  });

  const profMap = {
    linear: p5BtnProfLinear,
    smooth: p5BtnProfSmooth,
    power: p5BtnProfPower,
    hermite: p5BtnProfHermite,
  };
  Object.entries(profMap).forEach(([id, btn]) => {
    btn.addEventListener('click', () => {
      proto05.setProfile(id);
      updateP5ProfileButtons(id);
    });
  });

  p5BtnDepthWrite.addEventListener('click', () => {
    const on = proto05.toggleDepthWrite();
    p5BtnDepthWrite.classList.toggle('active', on);
    p5BtnDepthWrite.textContent = on ? 'DepthWrite ON' : 'DepthWrite OFF';
  });

  p5BtnFootprintToggle.addEventListener('click', () => {
    proto05.config.footprintOn = !proto05.config.footprintOn;
    proto05.syncWaterUniforms();
    p5BtnFootprintToggle.classList.toggle('active', proto05.config.footprintOn);
    p5BtnFootprintToggle.textContent = proto05.config.footprintOn ? 'Footprint ON' : 'Footprint OFF';
    showToast(proto05.config.footprintOn ? 'Footprint Reject: ON' : 'Footprint Reject: OFF');
  });

  p5BtnAlive.addEventListener('click', () => {
    proto05.config.alive = !proto05.config.alive;
    proto05.syncWaterUniforms();
    p5BtnAlive.classList.toggle('active', proto05.config.alive);
    p5BtnAlive.textContent = proto05.config.alive ? 'Alive ON' : 'Alive OFF';
    showToast(proto05.config.alive ? 'Alive Motion: ON (≤2px warp)' : 'Alive Motion: OFF');
  });

  p5BtnContact.addEventListener('click', () => {
    proto05.config.contactCorrection = !proto05.config.contactCorrection;
    proto05.rebuildWater();
    p5BtnContact.classList.toggle('active', proto05.config.contactCorrection);
    p5BtnContact.textContent = proto05.config.contactCorrection ? 'Contact ON' : 'Contact OFF';
    showToast(proto05.config.contactCorrection ? 'Citadel Waterline Correction: ON' : 'Citadel Waterline Correction: OFF');
  });

  p5BtnMotionPointer.addEventListener('click', () => {
    proto05.config.scriptedSweep = false;
    proto05.config.parallaxEnabled = true;
    proto05.config.freezeCamera = false;
    p5BtnMotionPointer.classList.add('active');
    p5BtnMotionPath.classList.remove('active');
    showToast('Motion: Pointer (Manual)');
  });

  p5BtnMotionPath.addEventListener('click', () => {
    const on = proto05.toggleScriptedSweep();
    p5BtnMotionPath.classList.toggle('active', on);
    p5BtnMotionPointer.classList.toggle('active', !on);
  });

  p5BtnFlareMode.addEventListener('click', () => {
    const mode = proto05.toggleFlareMode();
    p5BtnFlareMode.textContent = mode === 'spire' ? 'Flare: SPIRE-LOCKED' : 'Flare: SKY-LOCKED';
  });

  p5SliderZHorizon.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    proto05.setHorizonNear(val, proto05.config.zNear, true);
    p5ValZHorizon.textContent = val.toFixed(2);
  });

  p5SliderZNear.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    proto05.setHorizonNear(proto05.config.zHorizon, val, true);
    p5ValZNear.textContent = val.toFixed(2);
  });

  p5SliderGamma.addEventListener('input', (e) => {
    proto05.config.gamma = parseFloat(e.target.value);
    p5ValGamma.textContent = proto05.config.gamma.toFixed(2);
    if (proto05.config.profile === 'power') proto05.rebuildWater();
  });

  p5SliderTMid.addEventListener('input', (e) => {
    proto05.config.tMid = parseFloat(e.target.value);
    p5ValTMid.textContent = proto05.config.tMid.toFixed(2);
    if (proto05.config.profile === 'hermite') proto05.rebuildWater();
  });

  p5SliderZMidT.addEventListener('input', (e) => {
    proto05.config.zMidT = parseFloat(e.target.value);
    p5ValZMidT.textContent = proto05.config.zMidT.toFixed(2);
    if (proto05.config.profile === 'hermite') proto05.rebuildWater();
  });

  p5SliderFeather.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    proto05.setFeather(val);
    p5ValFeather.textContent = val.toFixed(1);
  });

  p5SliderShiftX.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    proto05.config.parallaxShiftX = val;
    p5ValShiftX.textContent = val.toFixed(3);
  });

  p5SliderPushZ.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    proto05.config.cameraPush = val;
    p5ValPushZ.textContent = val.toFixed(3);
  });
}

// ============================================================================
// Global Interaction & Keyboard Routing
// ============================================================================
function initGlobalEvents() {
  tabProto01.addEventListener('click', () => switchPrototype('p1'));
  tabProto02.addEventListener('click', () => switchPrototype('p2'));
  tabProto03.addEventListener('click', () => switchPrototype('p3'));
  tabProto04.addEventListener('click', () => switchPrototype('p4'));
  tabProto05.addEventListener('click', () => switchPrototype('p5'));

  devToggleBtn.addEventListener('click', () => {
    devPanel.classList.toggle('dev-panel-collapsed');
    devToggleBtn.textContent = devPanel.classList.contains('dev-panel-collapsed')
      ? '[Settings]'
      : '[Close]';
  });

  window.addEventListener('resize', handleResize);

  window.addEventListener('pointermove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2.0 - 1.0;
    const y = ((e.clientY - rect.top) / rect.height) * 2.0 - 1.0;

    if (activeProtoId === 'p5') {
      proto05.onPointerMove(x, y);
    } else if (activeProtoId === 'p4') {
      proto04.onPointerMove(x, y);
    } else if (activeProtoId === 'p3') {
      proto03.onPointerMove(x, y);
    } else if (activeProtoId === 'p1') {
      proto01.onPointerMove(x, y);
    } else {
      proto02.onPointerMove(x, y);
    }
  });

  window.addEventListener('keydown', (e) => {
    // [1]: Switch to Prototype 01
    if (e.key === '1') {
      switchPrototype('p1');
    }
    // [2]: Switch to Prototype 02
    else if (e.key === '2') {
      switchPrototype('p2');
    }
    // [3]: Switch to Prototype 03
    else if (e.key === '3') {
      switchPrototype('p3');
    }
    // [4]: Switch to Prototype 04
    else if (e.key === '4') {
      switchPrototype('p4');
    }
    else if (e.key === '5') {
      switchPrototype('p5');
    }
    // [Space]: Contextual Action
    else if (e.code === 'Space') {
      e.preventDefault();
      if (activeProtoId === 'p5') {
        const nextMode = proto05.config.comparisonMode === 'card' ? 'slab' : 'card';
        proto05.setComparisonMode(nextMode);
        updateP5ComparisonButtons(nextMode);
      } else if (activeProtoId === 'p4') {
        const nextMode = proto04.config.comparisonMode === 'proxy' ? 'volume' : 'proxy';
        proto04.setComparisonMode(nextMode);
        updateP4ComparisonButtons(nextMode);
      } else if (activeProtoId === 'p3') {
        const isPlaying = proto03.togglePlayPause();
        p3BtnPlaypause.textContent = isPlaying ? 'Pause' : 'Play';
      } else if (activeProtoId === 'p2') {
        const mode = proto02.toggleOriginalProxy();
        updateP2ComparisonButtons(mode);
      } else {
        const mode = proto01.toggleFlatDepth();
        updateP1ModeButtons(mode);
      }
    }
    // [R]: Replay (P03, P01)
    else if (e.key === 'r' || e.key === 'R') {
      if (activeProtoId === 'p3') {
        proto03.replay();
        enterOverlay.classList.remove('overlay-state-visible');
        enterOverlay.classList.add('overlay-state-hidden');
        p3BtnPlaypause.textContent = 'Pause';
      } else if (activeProtoId === 'p1') {
        proto01.replayAwakening();
      }
    }
    // [L]: Toggle Solo Handoff Loop (P03)
    else if (e.key === 'l' || e.key === 'L') {
      if (activeProtoId === 'p3') {
        const isSolo = proto03.toggleSoloMode();
        p3BtnSolo.classList.toggle('active', isSolo);
        p3BtnSolo.textContent = isSolo ? 'Exit Solo' : 'Solo Handoff';
      }
    }
    // [D]: Toggle Diagnostic / Comparison Mode
    else if (e.key === 'd' || e.key === 'D') {
      if (activeProtoId === 'p5') {
        const nextMode = proto05.cycleComparisonMode();
        updateP5ComparisonButtons(nextMode);
      } else if (activeProtoId === 'p4') {
        const modes = ['volume', 'proxy', 'overlay', 'silhouette', 'wireframe', 'generated'];
        const curIdx = modes.indexOf(proto04.config.comparisonMode);
        const nextMode = modes[(curIdx + 1) % modes.length];
        proto04.setComparisonMode(nextMode);
        updateP4ComparisonButtons(nextMode);
      } else if (activeProtoId === 'p3') {
        const nextMode = proto03.cycleDiagnosticMode();
        p3BtnDiagNormal.classList.toggle('active', nextMode === 'normal');
        p3BtnDiagOverlay.classList.toggle('active', nextMode === 'overlay');
        p3BtnDiagDiff.classList.toggle('active', nextMode === 'diff');
        p3BtnDiagP1.classList.toggle('active', nextMode === 'p1');
        p3BtnDiagP2.classList.toggle('active', nextMode === 'p2');
      } else if (activeProtoId === 'p2') {
        const mode = proto02.toggleOriginalProxy();
        updateP2ComparisonButtons(mode);
      } else {
        const mode = proto01.toggleFlatDepth();
        updateP1ModeButtons(mode);
      }
    }
    // [P]: Toggle Parallax
    else if (e.key === 'p' || e.key === 'P') {
      if (activeProtoId === 'p5') {
        proto05.config.parallaxEnabled = !proto05.config.parallaxEnabled;
        showToast(proto05.config.parallaxEnabled ? 'Parallax: ENABLED' : 'Parallax: LOCKED');
      } else if (activeProtoId === 'p4') {
        proto04.config.parallaxEnabled = !proto04.config.parallaxEnabled;
        showToast(proto04.config.parallaxEnabled ? 'Parallax: ENABLED' : 'Parallax: LOCKED');
      } else if (activeProtoId === 'p2') {
        const isParallax = proto02.toggleParallax();
        updateP2ComparisonButtons(isParallax ? 'parallax' : 'proxy');
      } else if (activeProtoId === 'p1') {
        const isParallax = proto01.toggleParallax();
        p1BtnToggleParallax.classList.toggle('active', isParallax);
        p1BtnToggleParallax.textContent = isParallax ? 'Parallax: ON' : 'Parallax: OFF';
      }
    }
    // [S]: Toggle Scripted Sweep
    else if (e.key === 's' || e.key === 'S') {
      if (activeProtoId === 'p5') {
        const isSweep = proto05.toggleScriptedSweep();
        p5BtnMotionPath.classList.toggle('active', isSweep);
        p5BtnMotionPointer.classList.toggle('active', !isSweep);
      } else if (activeProtoId === 'p4') {
        const isSweep = proto04.toggleScriptedSweep();
        p4BtnMotionSweep.classList.toggle('active', isSweep);
        p4BtnMotionPointer.classList.toggle('active', !isSweep);
      } else if (activeProtoId === 'p2') {
        const isSweep = proto02.toggleScriptedSweep();
        p2BtnMotionSweep.classList.toggle('active', isSweep);
        p2BtnMotionPointer.classList.toggle('active', !isSweep);
      }
    }
    // [F]: Toggle Flare Mode
    else if (e.key === 'f' || e.key === 'F') {
      if (activeProtoId === 'p5') {
        const mode = proto05.toggleFlareMode();
        p5BtnFlareMode.textContent = mode === 'spire'
          ? 'Flare: SPIRE-LOCKED'
          : 'Flare: SKY-LOCKED';
      } else if (activeProtoId === 'p4') {
        const mode = proto04.toggleFlareMode();
        p4BtnFlareMode.textContent = mode === 'spire'
          ? 'Flare: SPIRE-LOCKED'
          : 'Flare: SKY-LOCKED';
      } else if (activeProtoId === 'p2') {
        const mode = proto02.toggleFlareMode();
        p2BtnFlareMode.textContent = mode === 'spire'
          ? 'Flare: SPIRE-LOCKED'
          : 'Flare: SKY-LOCKED';
      }
    }
    // [W]: Toggle Wireframe Mode (P04)
    else if (e.key === 'w' || e.key === 'W') {
      if (activeProtoId === 'p5') {
        const nextMode = proto05.config.comparisonMode === 'wireframe' ? 'slab' : 'wireframe';
        proto05.setComparisonMode(nextMode);
        updateP5ComparisonButtons(nextMode);
      } else if (activeProtoId === 'p4') {
        const nextMode = proto04.config.comparisonMode === 'wireframe' ? 'volume' : 'wireframe';
        proto04.setComparisonMode(nextMode);
        updateP4ComparisonButtons(nextMode);
      }
    }
    // [G]: Toggle Generated Surface Debug (P04)
    else if (e.key === 'g' || e.key === 'G') {
      if (activeProtoId === 'p4') {
        const nextMode = proto04.config.comparisonMode === 'generated' ? 'volume' : 'generated';
        proto04.setComparisonMode(nextMode);
        updateP4ComparisonButtons(nextMode);
      }
    }
    // [M]: Toggle Silhouette Debug (P04) / Mask Debug (P02) / Depth Map (P01)
    else if (e.key === 'm' || e.key === 'M') {
      if (activeProtoId === 'p4') {
        const nextMode = proto04.config.comparisonMode === 'silhouette' ? 'volume' : 'silhouette';
        proto04.setComparisonMode(nextMode);
        updateP4ComparisonButtons(nextMode);
      } else if (activeProtoId === 'p2') {
        const mode = proto02.toggleMaskDebug();
        updateP2ComparisonButtons(mode);
      } else if (activeProtoId === 'p1') {
        const mode = proto01.toggleDepthMap();
        updateP1ModeButtons(mode);
      }
    }
    // [H]: Hide / Show Dev Panel
    else if (e.key === 'h' || e.key === 'H') {
      devPanel.classList.toggle('dev-panel-hidden');
    }
  });
}

function handleResize() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  renderer.setSize(width, height, false);
  proto01.onResize(width, height);
  proto02.onResize(width, height);
  proto03.onResize(width, height);
  proto04.onResize(width, height);
  proto05.onResize(width, height);
}

// Initialize all event bindings
initPrototype01Events();
initPrototype02Events();
initPrototype03Events();
initPrototype04Events();
initPrototype05Events();
initGlobalEvents();

// ============================================================================
// Main Application Render Loop
// ============================================================================
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();

  if (activeProtoId === 'p5') {
    proto05.update(now);
    updateP5TelemetryUI();
  } else if (activeProtoId === 'p4') {
    proto04.update(now);
    updateP4TelemetryUI();
  } else if (activeProtoId === 'p3') {
    proto03.update(now);
    updateP3TelemetryUI();
  } else if (activeProtoId === 'p2') {
    proto02.update(now);
  } else {
    proto01.update(now);
  }
}
