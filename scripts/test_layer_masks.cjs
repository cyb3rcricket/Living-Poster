const fs = require('fs');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

const rawJpeg = fs.readFileSync('reference/poster.jpeg');
const poster = jpeg.decode(rawJpeg, { useTArray: true });
const W = poster.width;
const H = poster.height;
const data = poster.data;

console.log(`Analyzing poster layers ${W}x${H}...`);

// Segmentation arrays: 0 to 1 alpha float per pixel for each layer
const maskSky = new Float32Array(W * H);
const maskRibbons = new Float32Array(W * H);
const maskSentinel = new Float32Array(W * H);
const maskCitadel = new Float32Array(W * H);
const maskNeedles = new Float32Array(W * H);
const maskWater = new Float32Array(W * H);
const maskFlare = new Float32Array(W * H);

// Mask of hidden regions to inpaint on the Sky layer
const maskSkyOccluded = new Float32Array(W * H);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    const pIdx = idx * 4;
    const r = data[pIdx], g = data[pIdx + 1], b = data[pIdx + 2];

    // -------------------------------------------------------------
    // 1. Solstice Flare: Bright starburst & horizontal anamorphic streak
    // Center at (838, 175)
    // -------------------------------------------------------------
    const dxFlare = x - 838;
    const dyFlare = y - 175;
    const distFlare = Math.sqrt(dxFlare * dxFlare + dyFlare * dyFlare);
    const lum = (r * 0.299 + g * 0.587 + b * 0.114);
    
    // Core flare
    let flareAlpha = 0;
    if (distFlare < 40 && lum > 220) {
      flareAlpha = Math.min(1.0, (255 - distFlare * 5) / 255.0);
    }
    // Horizontal streak: y in [170, 180], x across
    if (Math.abs(y - 175) <= 5 && lum > 180 && x > 200 && x < 950) {
      const streakAlpha = Math.max(0, (1.0 - Math.abs(y - 175) / 5.0) * ((lum - 180) / 75.0));
      flareAlpha = Math.max(flareAlpha, streakAlpha * 0.85);
    }
    maskFlare[idx] = flareAlpha;

    // -------------------------------------------------------------
    // 2. Foreground Water: y >= 855
    // -------------------------------------------------------------
    let waterAlpha = 0;
    if (y >= 855) {
      const edge = (y - 855) / 6.0;
      waterAlpha = Math.min(1.0, Math.max(0, edge));
    }
    maskWater[idx] = waterAlpha;

    // -------------------------------------------------------------
    // 3. Western Sentinel (Major Left Formation)
    // Apex at (142, 366), base to y=925
    // -------------------------------------------------------------
    let sentinelAlpha = 0;
    if (y >= 366 && y <= 930) {
      const dy = y - 366;
      // Sloping bounds
      const coneLeft = 142 - dy * 0.16;
      const coneRight = 142 + dy * 0.25;

      if (x >= coneLeft - 6 && x <= coneRight + 6) {
        const isApex = (dy < 15 && Math.abs(x - 142) <= 3);
        const isBody = (b > r + 4) || (b > 35 && g > 30 && r < 120);
        const isBase = (y >= 750 && b >= r - 8 && x >= coneLeft && x <= coneRight);

        if (isApex || isBody || isBase) {
          // Soft boundary antialiasing
          const midX = (coneLeft + coneRight) * 0.5;
          const halfSpan = (coneRight - coneLeft) * 0.5;
          const distNorm = Math.abs(x - midX) / Math.max(1, halfSpan);
          if (distNorm <= 1.0) {
            sentinelAlpha = 1.0;
          } else if (distNorm <= 1.15) {
            sentinelAlpha = Math.max(0, 1.0 - (distNorm - 1.0) / 0.15);
          }
          // Apex fade
          if (dy < 6) {
            sentinelAlpha *= (dy / 6.0);
          }
          // Waterline transition
          if (y > 880) {
            const wFade = 1.0 - Math.min(1.0, (y - 880) / 45.0);
            sentinelAlpha *= (0.35 + 0.65 * wFade);
          }
        }
      }
    }
    maskSentinel[idx] = sentinelAlpha;

    // -------------------------------------------------------------
    // 4. Solar Citadel (Major Right Formation)
    // Apex at (838, 175), base to y=960, right edge of frame
    // -------------------------------------------------------------
    let citadelAlpha = 0;
    if (y >= 175 && y <= 960) {
      const dy = y - 175;
      let leftBound = 838;
      let rightBound = W - 1;

      if (y < 230) {
        leftBound = 838 - dy * 0.40;
        rightBound = 838 + dy * 0.40;
      } else if (y < 471) {
        leftBound = 838 - 55 * 0.40 - (y - 230) * 0.48;
      } else if (y < 650) {
        leftBound = 707 - (y - 471) * 0.20;
      } else {
        leftBound = 707 - 179 * 0.20 - (y - 650) * 0.30;
      }

      if (x >= leftBound - 6 && x <= rightBound) {
        const isApex = (dy < 20 && Math.abs(x - 838) <= 6);
        const isCrystal = (b > r + 4) || (g > r && b > 45) || (b > 40 && g > 40 && r < 160);
        const isMass = (y > 450 && x > 670);
        const isWaterline = (y > 750 && x > 585);

        if (isApex || isCrystal || isMass || isWaterline) {
          const distToLeft = x - leftBound;
          if (distToLeft >= 0) {
            citadelAlpha = 1.0;
          } else {
            citadelAlpha = Math.max(0, 1.0 + distToLeft / 6.0);
          }
          if (dy < 8) {
            citadelAlpha *= (dy / 8.0);
          }
          if (y > 880) {
            const wFade = 1.0 - Math.min(1.0, (y - 880) / 75.0);
            citadelAlpha *= (0.4 + 0.6 * wFade);
          }
        }
      }
    }
    maskCitadel[idx] = citadelAlpha;

    // -------------------------------------------------------------
    // 5. Mid / Distant Formations (Needles)
    // -------------------------------------------------------------
    let needleAlpha = 0;
    // Central Midnight Needle (x ~ 556, y: 675..860)
    if (y >= 675 && y <= 860) {
      const needleCenter = 556 + (y - 675) * 0.08;
      const halfWidth = 0.6 + (y - 675) * 0.095;
      const dist = Math.abs(x - needleCenter);
      if (dist <= halfWidth + 1.2) {
        needleAlpha = Math.min(1.0, Math.max(0, (halfWidth + 1.2 - dist) / 1.2));
      }
    }
    // Periphery needle (x ~ 10, y: 730..860)
    if (y >= 730 && y <= 860) {
      const needleCenter = 10 + (y - 730) * 0.04;
      const halfWidth = 0.6 + (y - 730) * 0.05;
      const dist = Math.abs(x - needleCenter);
      if (dist <= halfWidth + 1.0) {
        needleAlpha = Math.max(needleAlpha, Math.min(1.0, Math.max(0, (halfWidth + 1.0 - dist) / 1.0)));
      }
    }
    maskNeedles[idx] = needleAlpha;

    // -------------------------------------------------------------
    // 6. Magenta Ribbons (Aurora Veil)
    // Sits in mid-sky, excluded by foreground spires
    // -------------------------------------------------------------
    let ribbonAlpha = 0;
    if (y >= 180 && y <= 580 && x >= 80 && x <= 920) {
      const isMagenta = (r > 75) && (b > 70) && ((r - g) > 16) && ((b - g) > 6);
      if (isMagenta) {
        const strength = Math.min(1.0, Math.max(0, ((r - g) - 16) / 32.0));
        ribbonAlpha = strength;
      }
    }
    maskRibbons[idx] = ribbonAlpha;

    // Occlusion mask: areas where Sky is hidden behind foreground objects
    if (sentinelAlpha > 0.1 || citadelAlpha > 0.1 || needleAlpha > 0.1 || waterAlpha > 0.5) {
      maskSkyOccluded[idx] = Math.max(sentinelAlpha, Math.max(citadelAlpha, Math.max(needleAlpha, waterAlpha)));
    }
  }
}

// Summary statistics
console.log('Layer Segmentation Statistics (coverage % of canvas):');
const countCovered = (arr) => (arr.reduce((acc, v) => acc + (v > 0.05 ? 1 : 0), 0) / (W * H) * 100).toFixed(2);
console.log(`- Water (Layer F):    ${countCovered(maskWater)}%`);
console.log(`- Sentinel (Layer C): ${countCovered(maskSentinel)}%`);
console.log(`- Citadel (Layer D):  ${countCovered(maskCitadel)}%`);
console.log(`- Needles (Layer E):  ${countCovered(maskNeedles)}%`);
console.log(`- Ribbons (Layer B):  ${countCovered(maskRibbons)}%`);
console.log(`- Flare (Card G):     ${countCovered(maskFlare)}%`);
console.log(`- Sky Occluded:       ${countCovered(maskSkyOccluded)}%`);
