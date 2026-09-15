const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

const W = 1024;
const H = 1024;
const Y0 = 855;
const TERRAIN_ALPHA = 32; // layers are binary 0/255; 32 ≈ shader 0.12
const FEATHER_RADIUS = 2;
const OUT_DIR = path.join('reference', 'experimental', 'prototype-05', 'generated');

function loadPng(p) {
  return PNG.sync.read(fs.readFileSync(p));
}

function alpha(img, x, y) {
  return img.data[(y * W + x) * 4 + 3];
}

function setPixel(img, x, y, r, g, b, a = 255) {
  const i = (y * W + x) * 4;
  img.data[i] = r;
  img.data[i + 1] = g;
  img.data[i + 2] = b;
  img.data[i + 3] = a;
}

function writePng(name, img) {
  const dest = path.join(OUT_DIR, name);
  fs.writeFileSync(dest, PNG.sync.write(img));
  console.log('Wrote', dest);
  return dest;
}

function dilateGray(src, radius) {
  const out = new Uint8Array(W * H);
  const r2 = radius * radius;
  for (let y = Y0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (src[y * W + x] < 255) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx * dx + dy * dy > r2) continue;
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || xx >= W || yy < Y0 || yy >= H) continue;
          const d = Math.sqrt(dx * dx + dy * dy);
          const fall = Math.round(255 * (1 - d / (radius + 1)));
          const idx = yy * W + xx;
          if (fall > out[idx]) out[idx] = fall;
        }
      }
    }
  }
  for (let i = 0; i < src.length; i++) {
    if (src[i] > out[i]) out[i] = src[i];
  }
  return out;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const water = loadPng('reference/experimental/prototype-02/layer-f-water.png');
  const citadel = loadPng('reference/experimental/prototype-02/layer-d-citadel.png');
  const sentinel = loadPng('reference/experimental/prototype-02/layer-c-sentinel.png');
  const needles = loadPng('reference/experimental/prototype-02/layer-e-needles.png');
  const poster = jpeg.decode(fs.readFileSync('reference/poster.jpeg'), { useTArray: true });

  const hard = new Uint8Array(W * H);
  const citHit = new Uint8Array(W * H);
  const senHit = new Uint8Array(W * H);
  const ndlHit = new Uint8Array(W * H);

  let nCit = 0;
  let nSen = 0;
  let nNdl = 0;
  let nHard = 0;
  const band = W * (H - Y0);

  for (let y = Y0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = alpha(citadel, x, y) > TERRAIN_ALPHA;
      const s = alpha(sentinel, x, y) > TERRAIN_ALPHA;
      const n = alpha(needles, x, y) > TERRAIN_ALPHA;
      if (c) {
        citHit[y * W + x] = 1;
        nCit++;
      }
      if (s) {
        senHit[y * W + x] = 1;
        nSen++;
      }
      if (n) {
        ndlHit[y * W + x] = 1;
        nNdl++;
      }
      if (c || s || n) {
        hard[y * W + x] = 255;
        nHard++;
      }
    }
  }

  const soft = dilateGray(hard, FEATHER_RADIUS);
  let nSoftCore = 0;
  let nSoftAny = 0;
  for (let i = 0; i < soft.length; i++) {
    if (soft[i] >= 255) nSoftCore++;
    if (soft[i] > 0) nSoftAny++;
  }

  const hardImg = new PNG({ width: W, height: H });
  const softImg = new PNG({ width: W, height: H });
  const preview = new PNG({ width: W, height: H });

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const pi = idx * 4;
      const pr = poster.data[pi];
      const pg = poster.data[pi + 1];
      const pb = poster.data[pi + 2];
      const hv = hard[idx];
      const sv = soft[idx];

      setPixel(hardImg, x, y, hv, hv, hv, 255);
      setPixel(softImg, x, y, sv, sv, sv, 255);

      let r = pr;
      let g = pg;
      let b = pb;
      if (y < Y0) {
        r = Math.round(pr * 0.28);
        g = Math.round(pg * 0.28);
        b = Math.round(pb * 0.28);
      } else if (hv === 255) {
        const c = citHit[idx];
        const s = senHit[idx];
        const n = ndlHit[idx];
        let or = 255;
        let og = 0;
        let ob = 220;
        if (c && !s && !n) {
          or = 255;
          og = 40;
          ob = 80;
        } else if (s && !c && !n) {
          or = 40;
          og = 220;
          ob = 90;
        } else if (n && !c && !s) {
          or = 255;
          og = 220;
          ob = 40;
        }
        r = Math.round(pr * 0.35 + or * 0.65);
        g = Math.round(pg * 0.35 + og * 0.65);
        b = Math.round(pb * 0.35 + ob * 0.65);
      } else if (sv > 0) {
        const t = sv / 255;
        r = Math.round(pr * (1 - 0.45 * t) + 255 * 0.45 * t);
        g = Math.round(pg * (1 - 0.45 * t) + 255 * 0.45 * t);
        b = Math.round(pb * (1 - 0.45 * t) + 40 * 0.45 * t);
      }
      if (y === Y0) {
        r = 255;
        g = 255;
        b = 255;
      }
      setPixel(preview, x, y, r, g, b, 255);
    }
  }

  // Legend in darkened sky (top-left).
  const legend = [
    { y: 16, color: [255, 40, 80], label: 'citadel footing (inpaint)' },
    { y: 36, color: [40, 220, 90], label: 'sentinel footing (inpaint)' },
    { y: 56, color: [255, 220, 40], label: 'needle footing (inpaint)' },
    { y: 76, color: [255, 255, 40], label: 'soft feather ring' },
  ];
  function fillRect(x0, y0, w, hgt, rgb) {
    for (let y = y0; y < y0 + hgt; y++) {
      for (let x = x0; x < x0 + w; x++) {
        setPixel(preview, x, y, rgb[0], rgb[1], rgb[2], 255);
      }
    }
  }
  fillRect(8, 8, 360, 88, [12, 12, 18]);
  legend.forEach((row) => {
    fillRect(16, row.y, 18, 14, row.color);
  });

  writePng('water-missing-mask-hard.png', hardImg);
  writePng('water-missing-mask-soft.png', softImg);
  writePng('water-missing-mask-preview.png', preview);

  const stats = {
    image: { width: W, height: H, waterBandY0: Y0 },
    thresholds: { terrainAlpha: TERRAIN_ALPHA, featherRadiusPx: FEATHER_RADIUS },
    layers: {
      citadel: 'reference/experimental/prototype-02/layer-d-citadel.png',
      sentinel: 'reference/experimental/prototype-02/layer-c-sentinel.png',
      needles: 'reference/experimental/prototype-02/layer-e-needles.png',
      unusedSilhouette: 'reference/experimental/prototype-04/generated/citadel-silhouette-mask.png',
    },
    counts: {
      waterBand: band,
      hard: nHard,
      hardPctOfBand: (nHard / band) * 100,
      hardPctOfImage: (nHard / (W * H)) * 100,
      citadel: nCit,
      sentinel: nSen,
      needles: nNdl,
      softNonZero: nSoftAny,
      softNonZeroPctOfBand: (nSoftAny / band) * 100,
      softCore255: nSoftCore,
      featherRing: nSoftAny - nHard,
    },
    waterLayerNote: 'layer-f-water.png is fully opaque (alpha=255) for every water-band pixel. Valid ocean is therefore band AND NOT terrain, not water alpha.',
  };
  fs.writeFileSync(path.join(OUT_DIR, 'water-missing-mask-stats.json'), JSON.stringify(stats, null, 2));
  console.log(JSON.stringify(stats, null, 2));
}

main();
