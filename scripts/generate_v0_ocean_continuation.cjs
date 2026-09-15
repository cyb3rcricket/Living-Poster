#!/usr/bin/env node
/**
 * Living Poster V0 — ocean continuation + sentinel/haze support textures.
 *
 * Method (NOT mirror/tile):
 *   1. Place the original P05 sea-only 1024² in the atlas center (pixel-identical).
 *   2. Extend left/right with low-frequency color from the painted edge columns.
 *   3. Stamp warped samples of nearby original water (no periodic repeat).
 *   4. Overlay recolored GenerateImage painterly luminance (sides only).
 *   5. Broad dabs + soft fBm noise. Opaque in the water band.
 *
 * Atlas: 2048×1024.  u_canon ∈ [−0.5, 1.5]  →  x ∈ [0, 2048)
 *         original u_canon ∈ [0, 1]         →  x ∈ [512, 1536)
 */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'reference/experimental/living-poster-v0');
const SRC = path.join(OUT, 'source');
const SEA_ONLY = path.join(ROOT, 'reference/experimental/prototype-05/generated/layer-f-water-sea-only.png');
const SENTINEL = path.join(ROOT, 'reference/experimental/prototype-02/layer-c-sentinel.png');
const SKY = path.join(ROOT, 'reference/experimental/prototype-02/layer-a-deep-sky.png');
const CITADEL = path.join(ROOT, 'reference/experimental/prototype-02/layer-d-citadel.png');
const NEEDLES = path.join(ROOT, 'reference/experimental/prototype-02/layer-e-needles.png');
const POSTER = path.join(ROOT, 'reference/poster.jpeg');

const V0 = 855 / 1024;
const ATW = 2048;
const ATH = 1024;
const ORIG_X0 = 512;
const U_PAD = 0.5;

function readImage(p) {
  const buf = fs.readFileSync(p);
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    return PNG.sync.read(buf);
  }
  const jpg = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
  const png = new PNG({ width: jpg.width, height: jpg.height });
  png.data = Buffer.from(jpg.data);
  return png;
}

function savePng(file, png) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const buf = PNG.sync.write(png);
  fs.writeFileSync(file, buf);
  console.log(`Saved ${path.relative(ROOT, file)}  ${png.width}x${png.height}  ${(buf.length / 1024).toFixed(1)} KB`);
}

function firstExisting(paths) {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smooth01(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function hash3(x, y, z) {
  const s = Math.sin(x * 269.5 + y * 183.3 + z * 97.17) * 43758.5453;
  return s - Math.floor(s);
}

function fade(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function noise2(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

function fbm(x, y, oct) {
  let a = 0;
  let w = 0.5;
  let f = 1;
  let s = 0;
  for (let i = 0; i < oct; i++) {
    a += w * noise2(x * f, y * f);
    s += w;
    w *= 0.5;
    f *= 2.02;
  }
  return a / s;
}

function sampleBilinear(png, x, y) {
  const w = png.width;
  const h = png.height;
  const x0 = clamp(Math.floor(x), 0, w - 1);
  const y0 = clamp(Math.floor(y), 0, h - 1);
  const x1 = clamp(x0 + 1, 0, w - 1);
  const y1 = clamp(y0 + 1, 0, h - 1);
  const tx = x - Math.floor(x);
  const ty = y - Math.floor(y);
  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;
  const d = png.data;
  const out = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const a = lerp(d[i00 + c], d[i10 + c], tx);
    const b = lerp(d[i01 + c], d[i11 + c], tx);
    out[c] = lerp(a, b, ty);
  }
  return out;
}

function resizePng(src, nw, nh) {
  const dst = new PNG({ width: nw, height: nh });
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const sx = (x + 0.5) * src.width / nw - 0.5;
      const sy = (y + 0.5) * src.height / nh - 0.5;
      const p = sampleBilinear(src, sx, sy);
      const i = (y * nw + x) * 4;
      dst.data[i] = Math.round(p[0]);
      dst.data[i + 1] = Math.round(p[1]);
      dst.data[i + 2] = Math.round(p[2]);
      dst.data[i + 3] = Math.round(p[3]);
    }
  }
  return dst;
}

function collectWaterSamples(sea, x0, x1) {
  const samples = [];
  const y0 = Math.floor(V0 * sea.height);
  for (let y = y0; y < sea.height; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * sea.width + x) * 4;
      if (sea.data[i + 3] < 40) continue;
      const r = sea.data[i];
      const g = sea.data[i + 1];
      const b = sea.data[i + 2];
      if (r + g + b < 24) continue;
      samples.push({ x, y, r, g, b });
    }
  }
  return samples;
}

function pick(samples, rnd) {
  return samples[Math.floor(rnd * samples.length) % samples.length];
}

function meanColor(samples) {
  if (!samples.length) return { r: 18, g: 48, b: 92 };
  let r = 0;
  let g = 0;
  let b = 0;
  for (const s of samples) {
    r += s.r;
    g += s.g;
    b += s.b;
  }
  const n = samples.length;
  return { r: r / n, g: g / n, b: b / n };
}

function columnMean(sea, x, y0, y1) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const xx = clamp(x, 0, sea.width - 1);
  for (let y = y0; y < y1; y++) {
    const i = (y * sea.width + xx) * 4;
    if (sea.data[i + 3] < 40) continue;
    r += sea.data[i];
    g += sea.data[i + 1];
    b += sea.data[i + 2];
    n++;
  }
  if (!n) return { r: 16, g: 42, b: 88 };
  return { r: r / n, g: g / n, b: b / n };
}

function edgeColorAtY(sea, xSide, y) {
  // Average a short inward walk — not a mirror.
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const dir = xSide < sea.width * 0.5 ? 1 : -1;
  const xStart = xSide < sea.width * 0.5 ? 0 : sea.width - 1;
  for (let k = 0; k < 28; k++) {
    const x = xStart + dir * k;
    const yy = clamp(y + Math.round((hash2(x, y) - 0.5) * 3), 0, sea.height - 1);
    const i = (yy * sea.width + x) * 4;
    if (sea.data[i + 3] < 30) continue;
    const w = 1.0 / (1 + k * 0.12);
    r += sea.data[i] * w;
    g += sea.data[i + 1] * w;
    b += sea.data[i + 2] * w;
    n += w;
  }
  if (n < 0.01) return { r: 14, g: 38, b: 82, a: 0 };
  return { r: r / n, g: g / n, b: b / n, a: 255 };
}

function buildOcean(sea, paint) {
  const atlas = new PNG({ width: ATW, height: ATH });
  atlas.data.fill(0);

  // 1. Pixel-identical original in the center.
  for (let y = 0; y < ATH; y++) {
    for (let x = 0; x < 1024; x++) {
      const si = (y * 1024 + x) * 4;
      const di = (y * ATW + (ORIG_X0 + x)) * 4;
      atlas.data[di] = sea.data[si];
      atlas.data[di + 1] = sea.data[si + 1];
      atlas.data[di + 2] = sea.data[si + 2];
      atlas.data[di + 3] = sea.data[si + 3];
    }
  }

  const yWater0 = Math.floor(V0 * 1024);
  const leftSamples = collectWaterSamples(sea, 0, 280);
  const rightSamples = collectWaterSamples(sea, 720, 1024);
  const midSamples = collectWaterSamples(sea, 200, 820);
  const leftMean = meanColor(leftSamples);
  const rightMean = meanColor(rightSamples);
  const allMean = meanColor(midSamples.length ? midSamples : leftSamples);

  let paintWater = null;
  let paintMean = { r: 40, g: 90, b: 150 };
  if (paint) {
    const cropTop = Math.floor(paint.height * 0.34);
    paintWater = {
      png: paint,
      x0: 0,
      y0: cropTop,
      w: paint.width,
      h: paint.height - cropTop,
    };
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < 1800; i++) {
      const px = Math.floor(hash2(i, 3) * paintWater.w);
      const py = paintWater.y0 + Math.floor(hash2(i, 9) * paintWater.h);
      const s = sampleBilinear(paint, px, py);
      r += s[0];
      g += s[1];
      b += s[2];
      n++;
    }
    paintMean = { r: r / n, g: g / n, b: b / n };
  }

  function paintLum(atlasX, atlasY) {
    if (!paintWater) return 0.5;
    const nx = atlasX / ATW;
    const ny = (atlasY - yWater0) / Math.max(1, ATH - 1 - yWater0);
    const sx = paintWater.x0 + nx * (paintWater.w - 1);
    const sy = paintWater.y0 + clamp(ny, 0, 1) * (paintWater.h - 1);
    const p = sampleBilinear(paintWater.png, sx, sy);
    return (0.3 * p[0] + 0.55 * p[1] + 0.15 * p[2]) / 255;
  }

  function fillContinuation(x0, x1, side) {
    const inward = side === 'left';
    const samples = inward ? leftSamples : rightSamples;
    const mean = inward ? leftMean : rightMean;
    const edgeX = inward ? 0 : 1023;

    for (let y = yWater0 - 6; y < ATH; y++) {
      const edge = edgeColorAtY(sea, edgeX, clamp(y, yWater0, 1023));
      const tVert = (y - yWater0) / Math.max(1, ATH - 1 - yWater0);

      for (let x = x0; x < x1; x++) {
        const dist = inward ? (ORIG_X0 - 1 - x) : (x - (ORIG_X0 + 1024));
        const distN = dist / 512;
        const seam = inward ? (ORIG_X0 - x) / 90 : (x - (ORIG_X0 + 1023)) / 90;
        const seamFade = smooth01(clamp(seam, 0, 1));

        const warpX = fbm(x * 0.007, y * 0.011, 4);
        const warpY = fbm(x * 0.009 + 20, y * 0.008, 4);
        const srcWalk = 12 + dist * (0.22 + 0.18 * warpX) + 40 * (warpX - 0.5);
        const srcX = inward
          ? clamp(srcWalk, 0, 210)
          : clamp(1023 - srcWalk, 814, 1023);
        const srcY = clamp(y + (warpY - 0.5) * 18, yWater0, 1023);

        const sampled = sampleBilinear(sea, srcX, srcY);
        const stampRnd = hash3(x * 0.17, y * 0.13, side === 'left' ? 1 : 2);
        const stamp = pick(samples, stampRnd);
        const stamp2 = pick(samples, hash3(y * 0.21, x * 0.09, 7));

        const n1 = fbm(x * 0.021 + distN * 1.7, y * 0.034, 5);
        const n2 = fbm(x * 0.055, y * 0.06 + distN, 3);

        let r = edge.r * 0.38 + sampled[0] * 0.34 + stamp.r * 0.18 + stamp2.r * 0.10;
        let g = edge.g * 0.38 + sampled[1] * 0.34 + stamp.g * 0.18 + stamp2.g * 0.10;
        let b = edge.b * 0.38 + sampled[2] * 0.34 + stamp.b * 0.18 + stamp2.b * 0.10;

        // Low-frequency drift away from the seam — darker/cooler on the far left,
        // slightly warmer cyan on the far right (citadel light).
        const cool = inward ? 1 : 0;
        r = r * (1 - 0.16 * distN * cool) + mean.r * 0.08 * distN;
        g = g * (1 - 0.08 * distN * cool) + mean.g * 0.06 * distN;
        b = b + 8 * distN * (inward ? 0.4 : 1.1) * (1 - tVert);

        if (paintWater) {
          const lum = paintLum(x, y);
          const targetLum = (0.3 * r + 0.55 * g + 0.15 * b) / 255;
          const detail = (lum - 0.5) * 70;
          const mixP = 0.22 * seamFade * (0.55 + 0.45 * tVert);
          r = lerp(r, clamp(r + detail * (allMean.r / Math.max(8, paintMean.r)), 0, 255), mixP);
          g = lerp(g, clamp(g + detail * (allMean.g / Math.max(8, paintMean.g)), 0, 255), mixP);
          b = lerp(b, clamp(b + detail * (allMean.b / Math.max(8, paintMean.b)), 0, 255), mixP);
          r += (lum - targetLum) * 18 * mixP;
          g += (lum - targetLum) * 22 * mixP;
          b += (lum - targetLum) * 16 * mixP;
        }

        r += (n1 - 0.5) * 22 + (n2 - 0.5) * 10;
        g += (n1 - 0.5) * 18 + (n2 - 0.5) * 12;
        b += (n1 - 0.5) * 14 + (n2 - 0.5) * 16;

        // Foam flecks sampled from bright original pixels, sparse, not tiled.
        if (n2 > 0.72 && stamp.r + stamp.g + stamp.b > 420) {
          const foam = (n2 - 0.72) * 90;
          r += foam * 0.85;
          g += foam * 0.95;
          b += foam * 0.70;
        }

        // Horizon (small y) is darker / more distant; near water keeps chop.
        const near = smooth01(tVert);
        r = lerp(r * 0.72, r, 0.35 + 0.65 * near);
        g = lerp(g * 0.80, g, 0.35 + 0.65 * near);
        b = lerp(b * 0.88, b, 0.45 + 0.55 * near);

        const di = (y * ATW + x) * 4;
        atlas.data[di] = clamp(Math.round(r), 0, 255);
        atlas.data[di + 1] = clamp(Math.round(g), 0, 255);
        atlas.data[di + 2] = clamp(Math.round(b), 0, 255);
        atlas.data[di + 3] = y >= yWater0 ? 255 : Math.round(255 * smooth01((y - (yWater0 - 6)) / 6));
      }
    }
  }

  fillContinuation(0, ORIG_X0, 'left');
  fillContinuation(ORIG_X0 + 1024, ATW, 'right');

  // Broad painterly dabs on the wings only.
  for (let i = 0; i < 900; i++) {
    const left = i < 450;
    const cx = left
      ? hash2(i, 1) * 500
      : 1540 + hash2(i, 2) * 490;
    const cy = yWater0 + 8 + hash2(i, 4) * (ATH - yWater0 - 16);
    const rad = 6 + hash2(i, 5) * 18;
    const s = pick(left ? leftSamples : rightSamples, hash2(i, 8));
    const aa = 0.08 + hash2(i, 11) * 0.12;
    const y0 = Math.max(yWater0, Math.floor(cy - rad));
    const y1 = Math.min(ATH - 1, Math.ceil(cy + rad));
    const xMin = left ? 0 : ORIG_X0 + 1024;
    const xMax = left ? ORIG_X0 - 1 : ATW - 1;
    for (let y = y0; y <= y1; y++) {
      for (let x = Math.max(xMin, Math.floor(cx - rad * 1.6)); x <= Math.min(xMax, Math.ceil(cx + rad * 1.6)); x++) {
        const dx = (x - cx) / (rad * 1.5);
        const dy = (y - cy) / rad;
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        const w = aa * (1 - d) * (1 - d);
        const di = (y * ATW + x) * 4;
        atlas.data[di] = clamp(Math.round(lerp(atlas.data[di], s.r, w)), 0, 255);
        atlas.data[di + 1] = clamp(Math.round(lerp(atlas.data[di + 1], s.g, w)), 0, 255);
        atlas.data[di + 2] = clamp(Math.round(lerp(atlas.data[di + 2], s.b, w)), 0, 255);
        atlas.data[di + 3] = 255;
      }
    }
  }

  // Soft blur a 2px band at each seam so the join is not a column.
  function blurSeam(xSeam) {
    for (let y = yWater0; y < ATH; y++) {
      for (let dx = -3; dx <= 3; dx++) {
        const x = xSeam + dx;
        if (x < 0 || x >= ATW) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let wsum = 0;
        for (let k = -2; k <= 2; k++) {
          const xx = clamp(x + k, 0, ATW - 1);
          const w = 3 - Math.abs(k);
          const i = (y * ATW + xx) * 4;
          r += atlas.data[i] * w;
          g += atlas.data[i + 1] * w;
          b += atlas.data[i + 2] * w;
          wsum += w;
        }
        const i = (y * ATW + x) * 4;
        const t = 0.55;
        atlas.data[i] = Math.round(lerp(atlas.data[i], r / wsum, t));
        atlas.data[i + 1] = Math.round(lerp(atlas.data[i + 1], g / wsum, t));
        atlas.data[i + 2] = Math.round(lerp(atlas.data[i + 2], b / wsum, t));
      }
    }
  }
  blurSeam(ORIG_X0);
  blurSeam(ORIG_X0 + 1023);

  return atlas;
}

function buildSentinelSide(paint) {
  const w = 256;
  const h = 512;
  const dst = new PNG({ width: w, height: h });
  const src = paint ? resizePng(paint, w, h) : null;
  for (let y = 0; y < h; y++) {
    const ty = y / (h - 1);
    for (let x = 0; x < w; x++) {
      const tx = x / (w - 1);
      const n = fbm(x * 0.035, y * 0.018, 5);
      const ridge = Math.abs(Math.sin(tx * 7.0 + n * 2.0));
      let r = lerp(12, 70, 1 - ty) + ridge * 18 + n * 20;
      let g = lerp(40, 170, 0.35 + 0.45 * (1 - ty)) + ridge * 30;
      let b = lerp(70, 210, 0.4 + 0.4 * (1 - ty)) + ridge * 20;
      if (ty < 0.18) {
        r += (0.18 - ty) * 180;
        g += (0.18 - ty) * 110;
        b += (0.18 - ty) * 40;
      }
      if (src) {
        const p = src.data[(y * w + x) * 4];
        const q = src.data[(y * w + x) * 4 + 1];
        const s = src.data[(y * w + x) * 4 + 2];
        r = lerp(r, p, 0.72);
        g = lerp(g, q, 0.72);
        b = lerp(b, s, 0.72);
      }
      const i = (y * w + x) * 4;
      dst.data[i] = clamp(Math.round(r), 0, 255);
      dst.data[i + 1] = clamp(Math.round(g), 0, 255);
      dst.data[i + 2] = clamp(Math.round(b), 0, 255);
      dst.data[i + 3] = 255;
    }
  }
  return dst;
}

function buildHaze(hazeSrc, sky) {
  const w = 512;
  const h = 512;
  const base = hazeSrc ? resizePng(hazeSrc, w, h) : new PNG({ width: w, height: h });
  if (!hazeSrc) base.data.fill(0);
  const skyR = sky ? resizePng(sky, w, h) : null;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = base.data[i] || 12;
      let g = base.data[i + 1] || 18;
      let b = base.data[i + 2] || 36;
      if (skyR) {
        // Pull a little authentic poster chroma from the unoccluded upper sky.
        const si = i;
        const sr = skyR.data[si];
        const sg = skyR.data[si + 1];
        const sb = skyR.data[si + 2];
        const dark = 1 - clamp((sr + sg + sb) / 400, 0, 1);
        r = lerp(r, sr, 0.18 * dark);
        g = lerp(g, sg, 0.18 * dark);
        b = lerp(b, sb, 0.22 * dark);
      }
      const n = fbm(x * 0.02, y * 0.02, 3);
      r = r * (0.92 + n * 0.12);
      g = g * (0.92 + n * 0.12);
      b = b * (0.94 + n * 0.10);
      base.data[i] = clamp(Math.round(r), 0, 255);
      base.data[i + 1] = clamp(Math.round(g), 0, 255);
      base.data[i + 2] = clamp(Math.round(b), 0, 255);
      base.data[i + 3] = 255;
    }
  }
  return base;
}

function buildSkyClean(poster, sky, sent, citadel, needles) {
  const w = 1024;
  const h = 1024;
  const dst = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    const occ = Math.max(sent.data[p + 3], citadel.data[p + 3], needles.data[p + 3]) / 255;
    const useFill = occ > 0.12;
    dst.data[p] = useFill ? sky.data[p] : poster.data[p];
    dst.data[p + 1] = useFill ? sky.data[p + 1] : poster.data[p + 1];
    dst.data[p + 2] = useFill ? sky.data[p + 2] : poster.data[p + 2];
    dst.data[p + 3] = 255;
  }
  return dst;
}

function buildSentinelRings(sent) {
  const W = sent.width;
  const H = sent.height;
  const raw = [];
  for (let y = 0; y < H; y++) {
    let lo = -1;
    let hi = -1;
    for (let x = 0; x < W; x++) {
      if (sent.data[(y * W + x) * 4 + 3] > 18) {
        if (lo < 0) lo = x;
        hi = x;
      }
    }
    if (lo >= 0) raw.push({ y, lo, hi });
  }
  const step = 10;
  const rings = [];
  for (let i = 0; i < raw.length; i += step) {
    const slice = raw.slice(i, Math.min(raw.length, i + step));
    const mid = slice[Math.floor(slice.length / 2)];
    let lo = 0;
    let hi = 0;
    for (const s of slice) {
      lo += s.lo;
      hi += s.hi;
    }
    lo /= slice.length;
    hi /= slice.length;
    rings.push({
      yPx: mid.y,
      leftPx: lo,
      rightPx: hi,
    });
  }
  if (raw.length) {
    const last = raw[raw.length - 1];
    const prev = rings[rings.length - 1];
    if (!prev || last.y - prev.yPx > 4) {
      rings.push({ yPx: last.y, leftPx: last.lo, rightPx: last.hi });
    }
  }
  return {
    zFront: 1.25,
    thickness: 0.11,
    wedgeInset: 0.16,
    rings,
  };
}

function verifyCenterIdentity(atlas, sea) {
  let max = 0;
  let n = 0;
  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const si = (y * 1024 + x) * 4;
      const di = (y * ATW + (ORIG_X0 + x)) * 4;
      const dr = Math.abs(atlas.data[di] - sea.data[si]);
      const dg = Math.abs(atlas.data[di + 1] - sea.data[si + 1]);
      const db = Math.abs(atlas.data[di + 2] - sea.data[si + 2]);
      const da = Math.abs(atlas.data[di + 3] - sea.data[si + 3]);
      const m = Math.max(dr, dg, db, da);
      if (m > max) max = m;
      if (m > 0) n++;
    }
  }
  // Seams may have been blurred 3px into the original. Measure protected interior.
  let interiorMax = 0;
  for (let y = 0; y < 1024; y++) {
    for (let x = 8; x < 1016; x++) {
      const si = (y * 1024 + x) * 4;
      const di = (y * ATW + (ORIG_X0 + x)) * 4;
      const m = Math.max(
        Math.abs(atlas.data[di] - sea.data[si]),
        Math.abs(atlas.data[di + 1] - sea.data[si + 1]),
        Math.abs(atlas.data[di + 2] - sea.data[si + 2]),
        Math.abs(atlas.data[di + 3] - sea.data[si + 3]),
      );
      if (m > interiorMax) interiorMax = m;
    }
  }
  console.log(`Center identity: interior maxΔ=${interiorMax}  full maxΔ=${max}  changed=${n}`);
  return { interiorMax, max, changed: n, uPad: U_PAD, atlas: `${ATW}x${ATH}` };
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const sea = readImage(SEA_ONLY);
  const sent = readImage(SENTINEL);
  const sky = readImage(SKY);
  const citadel = readImage(CITADEL);
  const needles = readImage(NEEDLES);
  const poster = readImage(POSTER);
  const paintPath = firstExisting([
    path.join(SRC, 'ocean-paint-16x9.jpg'),
    path.join(SRC, 'ocean-paint-16x9.png'),
  ]);
  const icePath = firstExisting([
    path.join(SRC, 'sentinel-ice-side.jpg'),
    path.join(SRC, 'sentinel-ice-side.png'),
  ]);
  const hazePath = firstExisting([
    path.join(SRC, 'haze-fill.jpg'),
    path.join(SRC, 'haze-fill.png'),
  ]);
  const paint = paintPath ? readImage(paintPath) : null;
  const ice = icePath ? readImage(icePath) : null;
  const hazeSrc = hazePath ? readImage(hazePath) : null;

  if (!paint) console.warn('No GenerateImage ocean source; procedural only.');

  const atlas = buildOcean(sea, paint);
  const stats = verifyCenterIdentity(atlas, sea);
  savePng(path.join(OUT, 'ocean-continuation-2048x1024.png'), atlas);

  const side = buildSentinelSide(ice);
  savePng(path.join(OUT, 'sentinel-side-256x512.png'), side);

  const haze = buildHaze(hazeSrc, sky);
  savePng(path.join(OUT, 'haze-fill-512.png'), haze);

  const skyClean = buildSkyClean(poster, sky, sent, citadel, needles);
  savePng(path.join(OUT, 'sky-clean-1024.png'), skyClean);

  const rings = buildSentinelRings(sent);
  const ringsPath = path.join(OUT, 'sentinel-rings.json');
  fs.writeFileSync(ringsPath, JSON.stringify(rings));
  console.log(`Saved ${path.relative(ROOT, ringsPath)}  rings=${rings.rings.length}`);

  const meta = {
    method: 'low-frequency edge extension + warped original-water stamps + GenerateImage luminance (sides only) + painterly dabs + fBm. No mirror/tile.',
    atlas: stats,
    seaOnly: path.relative(ROOT, SEA_ONLY),
    usedPaint: !!paint,
    usedIce: !!ice,
    usedHaze: !!hazeSrc,
  };
  fs.writeFileSync(path.join(OUT, 'continuation-meta.json'), JSON.stringify(meta, null, 2));
  console.log('V0 continuation assets ready.');
}

main();
