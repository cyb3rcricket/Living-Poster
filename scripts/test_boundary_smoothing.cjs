const fs = require('fs');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

const rawJpeg = fs.readFileSync('reference/poster.jpeg');
const poster = jpeg.decode(rawJpeg, { useTArray: true });
const W = poster.width;
const H = poster.height;
const data = poster.data;

function getRGB(x, y) {
  const cx = Math.max(0, Math.min(W - 1, Math.floor(x)));
  const cy = Math.max(0, Math.min(H - 1, Math.floor(y)));
  const idx = (cy * W + cx) * 4;
  return [data[idx], data[idx + 1], data[idx + 2]];
}

// ----------------------------------------------------------------------------
// Natural Silhouette Boundary Detection
// ----------------------------------------------------------------------------
const sentinelLeft = new Int32Array(H);
const sentinelRight = new Int32Array(H);
const citadelLeft = new Int32Array(H);

for (let y = 0; y < H; y++) {
  sentinelLeft[y] = -1;
  sentinelRight[y] = -1;
  citadelLeft[y] = -1;

  // 1. Western Sentinel (y in [366, 920])
  if (y >= 366 && y <= 920) {
    const dy = y - 366;
    // Bounding search window around Sentinel
    const maxHalfWidth = 20 + dy * 0.35;
    const minSearchX = Math.max(10, Math.floor(142 - maxHalfWidth));
    const maxSearchX = Math.min(320, Math.ceil(142 + maxHalfWidth));

    let minX = 999, maxX = -1;
    for (let x = minSearchX; x <= maxSearchX; x++) {
      const [r, g, b] = getRGB(x, y);
      const isRibbon = (r > g + 16) && (b > g + 6) && (r > 80);
      const isCrystal = !isRibbon && (
        (b > r + 15 && g >= r - 4) ||
        (b > 110 && g > 100 && r < 140) ||
        (dy < 20 && b > 100 && Math.abs(x - 142) <= 15) ||
        (y >= 750 && b >= r - 6 && x >= 40 && x <= 270)
      );
      if (isCrystal) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    if (minX <= maxX) {
      sentinelLeft[y] = minX;
      sentinelRight[y] = maxX;
    }
  }

  // 2. Solar Citadel (y in [175, 960])
  if (y >= 175 && y <= 960) {
    const dy = y - 175;
    let minSearchX = 600;
    if (y < 230) minSearchX = 800;
    else if (y < 450) minSearchX = 680;
    else if (y < 650) minSearchX = 630;

    let minX = 999;
    for (let x = minSearchX; x <= 950; x++) {
      const [r, g, b] = getRGB(x, y);
      const isPinnacle = (y < 230 && Math.abs(x - 838) <= (dy * 0.45 + 12));
      const isCrystal = (b > r + 5 && g >= r - 4) || (g > r + 2 && b > 40) || (b > 110 && g > 95);
      const isDarkMass = (y > 450 && x > 650 && b >= r - 6);
      const isWaterline = (y > 750 && x > 585);

      if (isPinnacle || isCrystal || isDarkMass || isWaterline) {
        minX = x;
        break;
      }
    }
    if (minX <= 950) {
      citadelLeft[y] = minX;
    }
  }
}

// Smooth boundary arrays along y to prevent single-pixel notches
function smoothBoundary(arr, startY, endY) {
  const smoothed = new Int32Array(H);
  for (let y = 0; y < H; y++) smoothed[y] = arr[y];

  for (let y = startY + 2; y <= endY - 2; y++) {
    if (arr[y] === -1) continue;
    let sum = 0, count = 0;
    for (let dy = -2; dy <= 2; dy++) {
      const v = arr[y + dy];
      if (v !== -1) {
        sum += v;
        count++;
      }
    }
    if (count > 0) smoothed[y] = Math.round(sum / count);
  }
  return smoothed;
}

const sLeftSmooth = smoothBoundary(sentinelLeft, 366, 920);
const sRightSmooth = smoothBoundary(sentinelRight, 366, 920);
const cLeftSmooth = smoothBoundary(citadelLeft, 175, 960);

console.log('Smoothed boundaries verified:');
console.log('Sentinel y=400: left=' + sLeftSmooth[400] + ', right=' + sRightSmooth[400]);
console.log('Sentinel y=450: left=' + sLeftSmooth[450] + ', right=' + sRightSmooth[450]);
console.log('Citadel y=200: left=' + cLeftSmooth[200]);
console.log('Citadel y=450: left=' + cLeftSmooth[450]);
