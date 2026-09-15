const fs = require('fs');
const path = require('path');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

const GEN_DIR = 'reference/experimental/prototype-04/generated';
fs.mkdirSync(GEN_DIR, { recursive: true });

console.log('=== Generating Prototype 04 Visual Assets ===');

// Load reference poster
const posterData = jpeg.decode(fs.readFileSync('reference/poster.jpeg'), { useTArray: true });
const W = posterData.width;
const H = posterData.height;
const poster = posterData.data;

// Load Prototype 02 layer-d-citadel.png as the baseline contour
const p2Citadel = PNG.sync.read(fs.readFileSync('reference/experimental/prototype-02/layer-d-citadel.png'));

// ----------------------------------------------------------------------------
// 1. Trace Complete, Pristine Solar Citadel Silhouette
// ----------------------------------------------------------------------------
console.log('Tracing pristine Solar Citadel silhouette from authenticated layer mask...');

const citadelLeft = new Int32Array(H).fill(-1);

// Extract boundary from layer-d-citadel.png
for (let y = 175; y <= 960; y++) {
  for (let x = 0; x < W; x++) {
    if (p2Citadel.data[(y * W + x) * 4 + 3] > 30) {
      citadelLeft[y] = x;
      break;
    }
  }
}

// Bridge the known search gap at 418..462 using smooth cubic interpolation
const yGapStart = 417;
const yGapEnd = 463;
const xGapStart = citadelLeft[yGapStart]; // 770
const xGapEnd = citadelLeft[yGapEnd];     // 712

for (let y = yGapStart + 1; y < yGapEnd; y++) {
  const t = (y - yGapStart) / (yGapEnd - yGapStart);
  // Smoothstep ease
  const ease = t * t * (3.0 - 2.0 * t);
  citadelLeft[y] = Math.round(xGapStart * (1.0 - ease) + xGapEnd * ease);
}

// Smooth boundary along Y with a 5-tap moving window
const cLeftSmooth = new Int32Array(H);
for (let y = 0; y < H; y++) cLeftSmooth[y] = citadelLeft[y];

for (let y = 177; y <= 958; y++) {
  if (citadelLeft[y] === -1) continue;
  let sum = 0, count = 0;
  for (let dy = -2; dy <= 2; dy++) {
    const v = citadelLeft[y + dy];
    if (v !== -1) {
      sum += v;
      count++;
    }
  }
  if (count > 0) cLeftSmooth[y] = Math.round(sum / count);
}

// Create binary silhouette mask
const maskCitadel = new Uint8Array(W * H);
for (let y = 175; y <= 960; y++) {
  const leftX = cLeftSmooth[y];
  if (leftX !== -1) {
    for (let x = leftX; x < W; x++) {
      maskCitadel[y * W + x] = 255;
    }
  }
}

// Save Diagnostic Silhouette Mask
const maskPng = new PNG({ width: W, height: H });
for (let i = 0; i < W * H; i++) {
  const idx = i * 4;
  const v = maskCitadel[i];
  maskPng.data[idx] = v;
  maskPng.data[idx + 1] = v;
  maskPng.data[idx + 2] = v;
  maskPng.data[idx + 3] = 255;
}
fs.writeFileSync(
  path.join(GEN_DIR, 'citadel-silhouette-mask.png'),
  PNG.sync.write(maskPng)
);
console.log('Saved: citadel-silhouette-mask.png');

// ----------------------------------------------------------------------------
// 2. Generate Complete, Color-Dilated Citadel Front Texture for P04
// ----------------------------------------------------------------------------
console.log('Generating complete color-dilated Citadel front texture...');

const citadelFrontPng = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const pIdx = i * 4;
  if (maskCitadel[i] > 0) {
    citadelFrontPng[pIdx] = poster[pIdx];
    citadelFrontPng[pIdx + 1] = poster[pIdx + 1];
    citadelFrontPng[pIdx + 2] = poster[pIdx + 2];
    citadelFrontPng[pIdx + 3] = 255;
  }
}

// Color dilation (2 iterations) to prevent dark edge fringing
function dilateColors(rgba, width, height, iterations = 2) {
  for (let it = 0; it < iterations; it++) {
    const nextRGB = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const pIdx = idx * 4;
        const outIdx = idx * 3;
        if (rgba[pIdx + 3] > 0) {
          nextRGB[outIdx] = rgba[pIdx];
          nextRGB[outIdx + 1] = rgba[pIdx + 1];
          nextRGB[outIdx + 2] = rgba[pIdx + 2];
        } else {
          let rSum = 0, gSum = 0, bSum = 0, count = 0;
          for (let dy = -1; dy <= 1; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;
              const nIdx = (ny * width + nx) * 4;
              if (rgba[nIdx + 3] > 0) {
                rSum += rgba[nIdx];
                gSum += rgba[nIdx + 1];
                bSum += rgba[nIdx + 2];
                count++;
              }
            }
          }
          if (count > 0) {
            nextRGB[outIdx] = Math.round(rSum / count);
            nextRGB[outIdx + 1] = Math.round(gSum / count);
            nextRGB[outIdx + 2] = Math.round(bSum / count);
          } else {
            nextRGB[outIdx] = rgba[pIdx];
            nextRGB[outIdx + 1] = rgba[pIdx + 1];
            nextRGB[outIdx + 2] = rgba[pIdx + 2];
          }
        }
      }
    }
    for (let i = 0; i < width * height; i++) {
      const pIdx = i * 4;
      const rgbIdx = i * 3;
      citadelFrontPng[pIdx] = nextRGB[rgbIdx];
      citadelFrontPng[pIdx + 1] = nextRGB[rgbIdx + 1];
      citadelFrontPng[pIdx + 2] = nextRGB[rgbIdx + 2];
    }
  }
}

dilateColors(citadelFrontPng, W, H, 2);

const frontPngObj = new PNG({ width: W, height: H });
frontPngObj.data = Buffer.from(citadelFrontPng);
fs.writeFileSync(
  path.join(GEN_DIR, 'layer-d-citadel-p4.png'),
  PNG.sync.write(frontPngObj)
);
console.log('Saved: layer-d-citadel-p4.png');

// ----------------------------------------------------------------------------
// 3. Generate High-Fidelity Painted Crystal Side Texture
// ----------------------------------------------------------------------------
console.log('Synthesizing painterly crystalline side texture (1024x1024)...');

const TEX_SIZE = 1024;
const sidePng = new PNG({ width: TEX_SIZE, height: TEX_SIZE });

function hash2d(x, y) {
  let h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

function smoothNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3.0 - 2.0 * fx);
  const uy = fy * fy * (3.0 - 2.0 * fy);

  const a = hash2d(ix, iy);
  const b = hash2d(ix + 1, iy);
  const c = hash2d(ix, iy + 1);
  const d = hash2d(ix + 1, iy + 1);

  return a * (1 - ux) * (1 - uy) +
         b * ux * (1 - uy) +
         c * (1 - ux) * uy +
         d * ux * uy;
}

function fbm(x, y, octaves = 5) {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    val += amp * smoothNoise(x * freq, y * freq);
    amp *= 0.5;
    freq *= 2.02;
  }
  return val;
}

for (let y = 0; y < TEX_SIZE; y++) {
  const v = y / (TEX_SIZE - 1);

  for (let x = 0; x < TEX_SIZE; x++) {
    const u = x / (TEX_SIZE - 1);

    const angle1 = 0.72;
    const rotX1 = x * Math.cos(angle1) - y * Math.sin(angle1);
    const rotY1 = x * Math.sin(angle1) + y * Math.cos(angle1);

    const angle2 = -0.52;
    const rotX2 = x * Math.cos(angle2) - y * Math.sin(angle2);
    const rotY2 = x * Math.sin(angle2) + y * Math.cos(angle2);

    const shelfNoise = fbm(x * 0.006, y * 0.003, 3);
    const shelfTier = Math.sin(y * 0.025 + shelfNoise * 4.0);

    const cleavage = fbm(rotX1 * 0.015, rotY1 * 0.004, 4);
    const crossChisel = fbm(rotX2 * 0.020, rotY2 * 0.005, 3);
    const strokeDetail = fbm(x * 0.08 + cleavage * 2.0, y * 0.08, 3) * 0.15;

    let facetVal = cleavage * 0.55 + crossChisel * 0.30 + shelfTier * 0.15 + strokeDetail;
    facetVal = Math.max(0.0, Math.min(1.0, facetVal));

    let r, g, b;
    if (facetVal < 0.40) {
      const t = facetVal / 0.40;
      r = 10 + t * 16;
      g = 22 + t * 60;
      b = 42 + t * 85;
    } else if (facetVal < 0.80) {
      const t = (facetVal - 0.40) / 0.40;
      r = 26 + t * 45;
      g = 82 + t * 105;
      b = 127 + t * 90;
    } else {
      const t = (facetVal - 0.80) / 0.20;
      r = 71 + t * 95;
      g = 187 + t * 50;
      b = 217 + t * 35;
    }

    if (v < 0.28) {
      const amberT = Math.pow(1.0 - v / 0.28, 1.4) * (0.45 + facetVal * 0.45);
      r = r * (1.0 - amberT) + 235 * amberT;
      g = g * (1.0 - amberT) + 185 * amberT;
      b = b * (1.0 - amberT) + 115 * amberT;
    }

    if (v > 0.82) {
      const oceanT = ((v - 0.82) / 0.18) * 0.40;
      r = r * (1.0 - oceanT) + 35 * oceanT;
      g = g * (1.0 - oceanT) + 175 * oceanT;
      b = b * (1.0 - oceanT) + 195 * oceanT;
    }

    const crevasseFissure = Math.pow(Math.abs(Math.sin(u * 6.28 * 2.0 + cleavage * 2.5)), 6.0);
    if (crevasseFissure > 0.6) {
      const darkFactor = (crevasseFissure - 0.6) * 1.8;
      r *= (1.0 - darkFactor * 0.65);
      g *= (1.0 - darkFactor * 0.65);
      b *= (1.0 - darkFactor * 0.50);
    }

    const idx = (y * TEX_SIZE + x) * 4;
    sidePng.data[idx] = Math.min(255, Math.max(0, Math.round(r)));
    sidePng.data[idx + 1] = Math.min(255, Math.max(0, Math.round(g)));
    sidePng.data[idx + 2] = Math.min(255, Math.max(0, Math.round(b)));
    sidePng.data[idx + 3] = 255;
  }
}

fs.writeFileSync(
  path.join(GEN_DIR, 'citadel-side-texture.png'),
  PNG.sync.write(sidePng)
);
console.log('Saved: citadel-side-texture.png');

console.log('All Prototype 04 visual assets generated successfully.');
