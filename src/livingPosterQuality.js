/**
 * Living Poster V0 — quality / resolution knobs.
 *
 * Parent owns UI (P-key HUD), world expansion, and the rAF loop.
 * This module only: cap DPR, pick an internal render scale, expose feature
 * flags, and accumulate drawCalls/triangles across a frame.
 *
 * =============================================================================
 * P06 extra render passes to DROP in WORLD mode (do not rewrite P06)
 * =============================================================================
 *
 * P06 today pays for journey *ownership* compositing. WORLD (HOLD / JOURNEY /
 * REST once water is owned) must stay a single P05 H1 present. Parent should
 * not revive these passes:
 *
 * 1. Dual-RT ownership crossfade (`Prototype06._blend.rtA` / `rtB` + fullscreen
 *    composite). CITADEL renders P03 p02Scene + P05 card; WATER renders P05
 *    card + P05 H1. Three GPU submits per frame. WORLD already calls
 *    `_renderP05To(null)` only — leave blend RTs unallocated or 1×1.
 *
 * 2. P03 dual-scene composite (`rtP01` + `rtP02` + composite quad). Used in
 *    POSTER / AWAKENING / HANDOFF via `Prototype03.renderPasses()`. After
 *    handoff P06 must not call it; WORLD must not re-enable diagnostic modes
 *    that force the three-pass path (overlay / difference).
 *
 * 3. P05 diagnostic / extra geometry: overlay, wireframe, footprint, projection,
 *    profile, stack, H2–H4, original-sea footprint discard. WORLD: H1 SEA-ONLY,
 *    `alive` off, `contactCorrection` off, footprint off. Those are extra
 *    fragment / CPU costs, not identity.
 *
 * 4. Blend / P03 RT sizing at `Math.min(devicePixelRatio, 2)`. WORLD leftovers
 *    must follow this controller: `pixelRatio * renderScale`, never 2×/3×.
 *
 * 5. P03 spatial-unlock landmark reproject (`allowDrift` false on LOW). Rest
 *    already has no parallax; do not add a drift sampling pass in WORLD.
 *
 * 6. Additive flare / volumetric debug overlays (silhouette, generated,
 *    wireframe citadel). WORLD keeps the production volume citadel + H1 water
 *    only. Extra particle / ribbon *passes* are gated by `flags` below — this
 *    file does not spawn them.
 *
 * Targets (parent policy): 60 fps ideal, 45+ acceptable, stop world expansion
 * below 30. This module only reports knobs + `info.stopExpansion`.
 *
 * Parent rAF (required for frame totals — Three.js r186 resets
 * `info.render` at the start of every `renderer.render()` when
 * `info.autoReset` is true, so multi-pass P06 would report only the last pass):
 *   quality.beginFrame(now)  // autoReset=false; info.reset() once
 *   proto.update(now)        // any number of renderer.render() calls
 *   quality.endFrame()       // snapshot calls + triangles; AUTO may step
 *   const s = quality.getStats()
 * Do not call `renderer.info.reset()` between begin/end. Next beginFrame
 * resets. `dispose()` restores `autoReset`.
 */

export const QUALITY_LEVELS = Object.freeze(['auto', 'high', 'medium', 'low']);

const PIXEL_RATIO_CAP = 1.25;

const RENDER_SCALE = Object.freeze({
  high: 1.0,
  medium: 0.8,
  low: 0.65,
});

const FLAGS = Object.freeze({
  high: Object.freeze({
    ribbonCount: 3,
    allowDrift: true,
    allowMinorParticles: true,
  }),
  medium: Object.freeze({
    ribbonCount: 2,
    allowDrift: true,
    allowMinorParticles: false,
  }),
  low: Object.freeze({
    ribbonCount: 1,
    allowDrift: false,
    allowMinorParticles: false,
  }),
});

const FRAME_DROP_MS = 28;
const FRAME_COMFORT_MS = 18;
const STOP_EXPANSION_FPS = 30;
const TARGET_FPS = 60;
const ACCEPTABLE_FPS = 45;

const AUTO_WARMUP_FRAMES = 20;
const AUTO_EVAL_MS = 500;
const EMA_ALPHA = 0.12;

const HIGH_PIXEL_BUDGET = 1920 * 1080 * PIXEL_RATIO_CAP;

function isTier(value) {
  return value === 'high' || value === 'medium' || value === 'low';
}

function isLevel(value) {
  return value === 'auto' || isTier(value);
}

function nativeDpr() {
  if (typeof window === 'undefined') return 1;
  const dpr = Number(window.devicePixelRatio);
  return Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
}

function cappedPixelRatio() {
  return Math.min(nativeDpr(), PIXEL_RATIO_CAP);
}

function copyFlags(tier) {
  const src = FLAGS[tier] || FLAGS.medium;
  return {
    ribbonCount: src.ribbonCount,
    allowDrift: src.allowDrift,
    allowMinorParticles: src.allowMinorParticles,
  };
}

function stepToward(from, to) {
  const order = ['low', 'medium', 'high'];
  const i = order.indexOf(from);
  const j = order.indexOf(to);
  if (i < 0) return to;
  if (j < 0 || i === j) return from;
  return order[i + (j > i ? 1 : -1)];
}

/**
 * @param {{ renderer: { info?: any, setPixelRatio?: Function, setSize?: Function }, container: { clientWidth?: number, clientHeight?: number } }} opts
 */
export function createQualityController({ renderer, container }) {
  if (!renderer) {
    throw new Error('createQualityController: renderer is required');
  }

  let requestedLevel = 'auto';
  let appliedTier = 'medium';
  let pixelRatio = cappedPixelRatio();
  let renderScale = RENDER_SCALE.medium;
  let enabled = true;

  let sampleCount = 0;
  let avgFrameTime = 1000 / TARGET_FPS;
  let lastBegin = 0;
  let lastEvalAt = 0;
  let lastDrawCalls = 0;
  let lastTriangles = 0;
  let autoResetRestore = renderer.info ? renderer.info.autoReset !== false : true;
  let disposed = false;

  let resizeObserver = null;
  if (typeof ResizeObserver === 'function' && container && typeof container === 'object') {
    resizeObserver = new ResizeObserver(() => {
      if (!disposed) apply();
    });
    try {
      resizeObserver.observe(container);
    } catch {
      resizeObserver = null;
    }
  }

  function viewportAllowsHigh() {
    const w = (container && container.clientWidth) || 1;
    const h = (container && container.clientHeight) || 1;
    const highPixels = w * h * pixelRatio * RENDER_SCALE.high;
    if (highPixels > HIGH_PIXEL_BUDGET) return false;
    if (nativeDpr() >= 2 && w * h >= 1280 * 1280) return false;
    return true;
  }

  function pickAutoTarget() {
    if (sampleCount < AUTO_WARMUP_FRAMES) return 'medium';
    if (avgFrameTime > FRAME_DROP_MS) return 'low';
    if (avgFrameTime < FRAME_COMFORT_MS && viewportAllowsHigh()) return 'high';
    return 'medium';
  }

  function apply() {
    if (disposed || !enabled) return;
    pixelRatio = cappedPixelRatio();
    renderScale = RENDER_SCALE[appliedTier] ?? RENDER_SCALE.medium;
    const effective = pixelRatio * renderScale;
    if (typeof renderer.setPixelRatio === 'function') {
      renderer.setPixelRatio(effective);
    }
    if (typeof renderer.setSize === 'function' && container) {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
    }
  }

  function setEnabled(on) {
    enabled = !!on;
    if (enabled) apply();
    return controller;
  }

  function setLevel(level) {
    if (!isLevel(level) || disposed) return controller;
    requestedLevel = level;
    if (isTier(level)) {
      appliedTier = level;
    } else if (sampleCount < AUTO_WARMUP_FRAMES) {
      appliedTier = 'medium';
    } else {
      appliedTier = pickAutoTarget();
    }
    apply();
    return controller;
  }

  function beginFrame(now) {
    if (disposed) return;
    const t = now == null ? (typeof performance !== 'undefined' ? performance.now() : 0) : now;

    if (renderer.info) {
      renderer.info.autoReset = false;
      if (typeof renderer.info.reset === 'function') renderer.info.reset();
    }

    if (lastBegin > 0) {
      const dt = t - lastBegin;
      if (dt > 0 && dt < 250) {
        sampleCount += 1;
        avgFrameTime = avgFrameTime * (1 - EMA_ALPHA) + dt * EMA_ALPHA;
      }
    }
    lastBegin = t;
  }

  function maybeAutoStep(now) {
    if (requestedLevel !== 'auto') return;
    if (sampleCount < AUTO_WARMUP_FRAMES) return;
    if (now - lastEvalAt < AUTO_EVAL_MS) return;
    lastEvalAt = now;
    const next = stepToward(appliedTier, pickAutoTarget());
    if (next !== appliedTier) {
      appliedTier = next;
      apply();
    }
  }

  function endFrame() {
    if (disposed) return;
    if (renderer.info && renderer.info.render) {
      lastDrawCalls = renderer.info.render.calls || 0;
      lastTriangles = renderer.info.render.triangles || 0;
    }
    // Clock from beginFrame(now) so AUTO does not mix rAF timestamps with
    // performance.now(), and so a HUD can call getStats() after endFrame
    // without a second reset.
    maybeAutoStep(lastBegin);
  }

  function getFlags() {
    return copyFlags(appliedTier);
  }

  function getStats() {
    const measured = sampleCount > 0;
    const frameTime = measured ? avgFrameTime : 0;
    const fps = measured && frameTime > 0 ? 1000 / frameTime : 0;
    const flags = getFlags();
    return {
      fps,
      frameTime,
      drawCalls: lastDrawCalls,
      triangles: lastTriangles,
      pixelRatio,
      renderScale,
      level: requestedLevel,
      flags,
      info: {
        appliedLevel: appliedTier,
        nativeDpr: nativeDpr(),
        pixelRatioCap: PIXEL_RATIO_CAP,
        effectivePixelRatio: pixelRatio * renderScale,
        sampleCount,
        autoReady: sampleCount >= AUTO_WARMUP_FRAMES,
        stopExpansion: fps < STOP_EXPANSION_FPS,
        belowAcceptable: fps < ACCEPTABLE_FPS,
        targetFps: TARGET_FPS,
        acceptableFps: ACCEPTABLE_FPS,
        stopExpansionFps: STOP_EXPANSION_FPS,
        dropMs: FRAME_DROP_MS,
        comfortMs: FRAME_COMFORT_MS,
        flags,
      },
    };
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (resizeObserver) {
      try {
        resizeObserver.disconnect();
      } catch {
        /* ignore */
      }
      resizeObserver = null;
    }
    if (renderer.info) {
      renderer.info.autoReset = autoResetRestore;
    }
  }

  apply();

  const controller = {
    get level() {
      return requestedLevel;
    },
    get pixelRatio() {
      return pixelRatio;
    },
    get renderScale() {
      return renderScale;
    },
    setLevel,
    setEnabled,
    apply,
    beginFrame,
    endFrame,
    getStats,
    getFlags,
    dispose,
  };

  return controller;
}

export { PIXEL_RATIO_CAP, RENDER_SCALE };
