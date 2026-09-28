const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');

const OUT_DIR = path.join(__dirname, '../reference/experimental/living-poster-v1');
fs.mkdirSync(OUT_DIR, { recursive: true });

const p2Dir = path.join(__dirname, '../reference/experimental/prototype-02');
const rawPoster = fs.readFileSync(path.join(__dirname, '../reference/poster.jpeg'));
const poster = jpeg.decode(rawPoster, { useTArray: true });
const W = poster.width;
const H = poster.height;

const loadPng = (file) => PNG.sync.read(fs.readFileSync(file));

const ribbons = loadPng(path.join(p2Dir, 'layer-b-ribbons.png'));
const sentinel = loadPng(path.join(p2Dir, 'layer-c-sentinel.png'));
const citadel = loadPng(path.join(p2Dir, 'layer-d-citadel.png'));
const needles = loadPng(path.join(p2Dir, 'layer-e-needles.png'));
const water = loadPng(path.join(p2Dir, 'layer-f-water.png'));
const flare = loadPng(path.join(p2Dir, 'layer-g-flare.png'));

const depthRaw = fs.readFileSync(path.join(__dirname, '../reference/experimental/poster-depth-v1.png'));
const depthPng = PNG.sync.read(depthRaw);

const outPng = new PNG({ width: W, height: H });

// Depths in world units (0 to 2.0)
const Z_SKY = 0.00;
const Z_RIBBONS = 0.42;
const Z_NEEDLES = 0.65;
const Z_CITADEL = 0.95;
const Z_SENTINEL = 1.25;
const Z_WATER_HORIZON = 0.68;
const Z_WATER_NEAR = 1.52;

for (let y = 0; y < H; y++) {
  const v = y / H;
  for (let x = 0; x < W; x++) {
    const u = x / W;
    const idx = (y * W + x) * 4;

    const aRibbons = ribbons.data[idx + 3] / 255;
    const aSentinel = sentinel.data[idx + 3] / 255;
    const aCitadel = citadel.data[idx + 3] / 255;
    const aNeedles = needles.data[idx + 3] / 255;
    const aWater = water.data[idx + 3] / 255;
    const aFlare = flare.data[idx + 3] / 255;
    const dVal = depthPng.data[idx] / 255;

    const pr = poster.data[idx] / 255;
    const pg = poster.data[idx + 1] / 255;
    const pb = poster.data[idx + 2] / 255;
    const lum = 0.299 * pr + 0.587 * pg + 0.114 * pb;

    // Layer determination with proper depth precedence:
    // Sentinel is closest, then water in foreground, then citadel, needles, ribbons, sky
    let layerId = 0; // Sky
    let targetZ = Z_SKY;
    let waterParam = 0;

    // Water: v runs from horizon ~0.83 to 1.0
    // Water param t in [0, 1]
    const waterT = Math.max(0, Math.min(1, (v - 0.835) / 0.165));

    if (aSentinel > 0.3) {
      layerId = 4; // Sentinel
      // Micro-relief from monocular depth
      targetZ = Z_SENTINEL + (dVal - 0.78) * 0.15;
    } else if (aWater > 0.3) {
      layerId = 5; // Water
      waterParam = waterT;
      // Water slopes smoothly from horizon to foreground
      targetZ = Z_WATER_HORIZON + waterT * (Z_WATER_NEAR - Z_WATER_HORIZON) + (dVal - 0.62) * 0.06;
    } else if (aCitadel > 0.3) {
      layerId = 3; // Citadel
      targetZ = Z_CITADEL + (dVal - 0.22) * 0.18;
    } else if (aNeedles > 0.3) {
      layerId = 2; // Needles
      targetZ = Z_NEEDLES + (dVal - 0.3) * 0.08;
    } else if (aRibbons > 0.25) {
      layerId = 1; // Ribbons
      targetZ = Z_RIBBONS + Math.sin(u * 15.0) * 0.04;
    } else {
      layerId = 0; // Sky
      targetZ = Z_SKY;
    }

    // Highlighting & particle emitter mask (A channel)
    // Flare apex: around (0.648, 0.435) in UV
    const dFlare = Math.hypot(u - 0.648, v - 0.435);
    const flareIntensity = Math.max(0, 1 - dFlare / 0.12) * aFlare;

    // Cyan highlight: high blue & green, lower red
    const isCyan = (pb > 0.5 && pg > 0.45 && pr < 0.4) ? (pb + pg) * 0.5 : 0.0;
    // Spire specular
    const isCitadelPeak = (layerId === 3 && v < 0.55 && lum > 0.6) ? lum : 0.0;
    // Water foam crest
    const isWaterFoam = (layerId === 5 && lum > 0.55) ? lum * 0.7 : 0.0;

    const emitterScore = Math.min(1, Math.max(
      flareIntensity * 1.5,
      isCyan * 0.9,
      isCitadelPeak * 0.8,
      isWaterFoam * 0.7,
      (lum > 0.85 ? 0.6 : 0.0)
    ));

    // Encode into RGBA:
    // R: normalized depth (0 to 2.0 world units -> 0 to 255)
    // G: layer ID (0 to 6 mapped to 0..255)
    // B: water parameter / fluid factor (0 to 255)
    // A: emitter & highlight score (0 to 255)
    const rEnc = Math.max(0, Math.min(255, Math.round((targetZ / 2.0) * 255)));
    const gEnc = Math.round((layerId / 6.0) * 255);
    const bEnc = Math.round(waterParam * 255);
    const aEnc = Math.round(emitterScore * 255);

    outPng.data[idx] = rEnc;
    outPng.data[idx + 1] = gEnc;
    outPng.data[idx + 2] = bEnc;
    outPng.data[idx + 3] = aEnc;
  }
}

const outPath = path.join(OUT_DIR, 'melt-semantic-map.png');
fs.writeFileSync(outPath, PNG.sync.write(outPng));
console.log('Saved melt semantic map to:', outPath);
