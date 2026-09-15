const fs = require('fs');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

// 1. Load original poster
const rawJpeg = fs.readFileSync('reference/poster.jpeg');
const origPoster = jpeg.decode(rawJpeg, { useTArray: true });
const W = origPoster.width;
const H = origPoster.height;
const origData = origPoster.data;

// 2. Load layers
function loadPng(path) {
  const buf = fs.readFileSync(path);
  return PNG.sync.read(buf);
}

const layerA = loadPng('reference/experimental/prototype-02/layer-a-deep-sky.png');
const layerB = loadPng('reference/experimental/prototype-02/layer-b-ribbons.png');
const layerC = loadPng('reference/experimental/prototype-02/layer-c-sentinel.png');
const layerD = loadPng('reference/experimental/prototype-02/layer-d-citadel.png');
const layerE = loadPng('reference/experimental/prototype-02/layer-e-needles.png');
const layerF = loadPng('reference/experimental/prototype-02/layer-f-water.png');
const layerG = loadPng('reference/experimental/prototype-02/layer-g-flare.png');

console.log('Compositing layers in canonical painterly order:');
console.log('Layer A (Deep Sky) -> Layer B (Ribbons) -> Layer E (Needles) -> Layer D (Citadel) -> Layer C (Sentinel) -> Layer F (Water) -> Layer G (Flare)');

// Composite buffer
const comp = new Uint8Array(W * H * 4);

// Initialize with Layer A
for (let i = 0; i < W * H * 4; i++) {
  comp[i] = layerA.data[i];
}

// Porter-Duff Over blend helper
function blendOver(layer) {
  for (let i = 0; i < W * H; i++) {
    const pIdx = i * 4;
    const a = layer.data[pIdx + 3] / 255.0;
    if (a <= 0) continue;

    const r = layer.data[pIdx];
    const g = layer.data[pIdx + 1];
    const b = layer.data[pIdx + 2];

    comp[pIdx] = Math.round(r * a + comp[pIdx] * (1 - a));
    comp[pIdx + 1] = Math.round(g * a + comp[pIdx + 1] * (1 - a));
    comp[pIdx + 2] = Math.round(b * a + comp[pIdx + 2] * (1 - a));
    comp[pIdx + 3] = 255;
  }
}

// Flare additive blend helper
function blendAdditive(layer) {
  for (let i = 0; i < W * H; i++) {
    const pIdx = i * 4;
    const a = layer.data[pIdx + 3] / 255.0;
    if (a <= 0) continue;

    const r = layer.data[pIdx];
    const g = layer.data[pIdx + 1];
    const b = layer.data[pIdx + 2];

    comp[pIdx] = Math.min(255, Math.round(comp[pIdx] + r * a * 0.5));
    comp[pIdx + 1] = Math.min(255, Math.round(comp[pIdx + 1] + g * a * 0.5));
    comp[pIdx + 2] = Math.min(255, Math.round(comp[pIdx + 2] + b * a * 0.5));
  }
}

blendOver(layerB);
blendOver(layerE);
blendOver(layerD);
blendOver(layerC);
blendOver(layerF);

// Compute difference vs original poster
let sumSqDiff = 0;
let maxDiff = 0;
let diffCount = 0;

for (let i = 0; i < W * H; i++) {
  const pIdx = i * 4;
  const dr = Math.abs(comp[pIdx] - origData[pIdx]);
  const dg = Math.abs(comp[pIdx + 1] - origData[pIdx + 1]);
  const db = Math.abs(comp[pIdx + 2] - origData[pIdx + 2]);

  const diff = (dr + dg + db) / 3.0;
  if (diff > 5) diffCount++;
  if (diff > maxDiff) maxDiff = diff;

  sumSqDiff += (dr * dr + dg * dg + db * db) / 3.0;
}

const mse = sumSqDiff / (W * H);
const psnr = 10 * Math.log10((255 * 255) / mse);

console.log(`Reconstruction Metrics vs poster.jpeg:`);
console.log(`- MSE:  ${mse.toFixed(2)}`);
console.log(`- PSNR: ${psnr.toFixed(2)} dB`);
console.log(`- Pixels with diff > 5/255: ${((diffCount / (W * H)) * 100).toFixed(2)}%`);
console.log(`- Max pixel difference: ${maxDiff.toFixed(1)} / 255`);
