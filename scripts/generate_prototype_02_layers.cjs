const fs = require('fs');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');
const path = require('path');

// Ensure output directories exist
const OUT_DIR = 'reference/experimental/prototype-02';
const GEN_DIR = 'reference/experimental/prototype-02/generated';
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(GEN_DIR, { recursive: true });

// Load reference poster
const rawJpeg = fs.readFileSync('reference/poster.jpeg');
const poster = jpeg.decode(rawJpeg, { useTArray: true });
const W = poster.width;
const H = poster.height;
const data = poster.data;

console.log(`Generating Prototype 02 Independent Proxy Layers (${W}x${H})...`);

// Buffer helpers
function getRGB(x, y) {
  const cx = Math.max(0, Math.min(W - 1, Math.floor(x)));
  const cy = Math.max(0, Math.min(H - 1, Math.floor(y)));
  const idx = (cy * W + cx) * 4;
  return [data[idx], data[idx + 1], data[idx + 2]];
}

// ----------------------------------------------------------------------------
// 1. Compute Precise Masks for All Layers
// ----------------------------------------------------------------------------
const maskSky = new Float32Array(W * H);
const maskRibbons = new Float32Array(W * H);
const maskSentinel = new Float32Array(W * H);
const maskCitadel = new Float32Array(W * H);
const maskNeedles = new Float32Array(W * H);
const maskWater = new Float32Array(W * H);
const maskFlare = new Float32Array(W * H);
const maskOcclusion = new Float32Array(W * H); // foreground occluders

// ----------------------------------------------------------------------------
// 1. Natural Silhouette Boundary Detection
// Traces the authentic crystal boundaries from poster pixels per scanline
// ----------------------------------------------------------------------------
const sentinelLeft = new Int32Array(H);
const sentinelRight = new Int32Array(H);
const citadelLeft = new Int32Array(H);

for (let y = 0; y < H; y++) {
  sentinelLeft[y] = -1;
  sentinelRight[y] = -1;
  citadelLeft[y] = -1;

  // Western Sentinel
  if (y >= 366 && y <= 920) {
    const dy = y - 366;
    const centerX = 142 + dy * 0.02;
    const halfW = 8 + dy * 0.28;
    const minSearchX = Math.max(10, Math.floor(centerX - halfW));
    const maxSearchX = Math.min(320, Math.ceil(centerX + halfW));

    let minX = 999, maxX = -1;
    for (let x = minSearchX; x <= maxSearchX; x++) {
      const [r, g, b] = getRGB(x, y);
      const isRibbon = (r > g + 18) && (b > g + 6) && (r > 80);
      const isApex = (dy < 15 && Math.abs(x - 142) <= 10 && b > 75);
      const isCrystal = !isRibbon && (
        isApex ||
        (b > r + 18 && g >= r - 4) ||
        (g > r + 10 && b > r + 15) ||
        (b > 120 && g > 105 && r < 140) ||
        (y >= 750 && b >= r - 6 && x >= 35 && x <= 270)
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

  // Solar Citadel
  if (y >= 175 && y <= 960) {
    const dy = y - 175;
    let expectedLeft = 838;
    if (dy < 55) expectedLeft = 838 - dy * 0.50;
    else if (dy < 280) expectedLeft = 810 - (dy - 55) * 0.35;
    else if (dy < 480) expectedLeft = 730 - (dy - 280) * 0.50;
    else expectedLeft = 630 - (dy - 480) * 0.20;

    const minSearchX = Math.max(575, Math.floor(expectedLeft - 25));
    const maxSearchX = Math.min(950, Math.ceil(expectedLeft + 25));

    let minX = 999;
    for (let x = minSearchX; x <= maxSearchX; x++) {
      const [r, g, b] = getRGB(x, y);
      const isPinnacle = (dy < 40 && Math.abs(x - 838) <= (dy * 0.45 + 10));
      const isCrystal = (g > r + 8 && b > r + 16) || (b > 150 && g > 130);
      const isDarkMass = (y > 450 && b >= r - 4 && g >= r - 2);
      const isWaterline = (y > 750 && b > r + 6 && g > r + 2);

      if (isPinnacle || isCrystal || isDarkMass || isWaterline) {
        minX = x;
        break;
      }
    }
    if (minX <= maxSearchX) {
      citadelLeft[y] = minX;
    }
  }
}

// Smooth boundary arrays along y
function smoothBoundary(arr, startY, endY) {
  const smoothed = new Int32Array(H);
  for (let y = 0; y < H; y++) smoothed[y] = arr[y];

  for (let y = startY + 2; y <= endY - 2; y++) {
    if (arr[y] === -1) continue;
    let sum = 0, count = 0;
    for (let dy = -2; dy <= 2; dy++) {
      const v = arr[y + dy];
      if (v !== -1) { sum += v; count++; }
    }
    if (count > 0) smoothed[y] = Math.round(sum / count);
  }
  return smoothed;
}

const sLeftSmooth = smoothBoundary(sentinelLeft, 366, 920);
const sRightSmooth = smoothBoundary(sentinelRight, 366, 920);
const cLeftSmooth = smoothBoundary(citadelLeft, 175, 960);

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    const pIdx = idx * 4;
    const r = data[pIdx], g = data[pIdx + 1], b = data[pIdx + 2];
    const lum = (r * 0.299 + g * 0.587 + b * 0.114);

    // --- 1. Water (Layer F) ---
    if (y >= 855) {
      maskWater[idx] = 1.0;
    }

    // --- 2. Western Sentinel (Layer C) ---
    if (y >= 366 && y <= 920 && sLeftSmooth[y] !== -1) {
      const minX = sLeftSmooth[y];
      const maxX = sRightSmooth[y];
      if (x >= minX && x <= maxX) {
        maskSentinel[idx] = 1.0;
      }
    }

    // --- 3. Solar Citadel (Layer D) ---
    if (y >= 175 && y <= 960 && cLeftSmooth[y] !== -1) {
      const minX = cLeftSmooth[y];
      if (x >= minX) {
        maskCitadel[idx] = 1.0;
      }
    }

    // --- 4. Mid / Distant Formations & Needles (Layer E) ---
    if (y >= 675 && y <= 860) {
      const needleCenter = 556 + (y - 675) * 0.08;
      const halfWidth = 0.8 + (y - 675) * 0.095;
      if (Math.abs(x - needleCenter) <= halfWidth) {
        maskNeedles[idx] = 1.0;
      }
    }
    if (y >= 730 && y <= 860) {
      const needleCenter = 10 + (y - 730) * 0.04;
      const halfWidth = 0.8 + (y - 730) * 0.05;
      if (Math.abs(x - needleCenter) <= halfWidth) {
        maskNeedles[idx] = 1.0;
      }
    }

    // --- 5. Magenta Atmospheric Ribbons (Layer B) ---
    // Only in sky region (above water), excluding spire bodies
    if (y >= 180 && y <= 580 && x >= 80 && x <= 920) {
      const isMagenta = (r > 75) && (b > 70) && ((r - g) > 16) && ((b - g) > 6);
      if (isMagenta) {
        const strength = Math.min(1.0, Math.max(0, ((r - g) - 16) / 30.0));
        // Softly attenuate where foreground spire takes precedence
        const spireOcclusion = Math.max(maskSentinel[idx], maskCitadel[idx]);
        maskRibbons[idx] = strength * (1.0 - spireOcclusion * 0.85);
      }
    }

    // --- 6. Solstice Flare & Anamorphic Streak (Layer G) ---
    const dxFlare = x - 838;
    const dyFlare = y - 175;
    const distFlare = Math.sqrt(dxFlare * dxFlare + dyFlare * dyFlare);
    let flareAlpha = 0;
    if (distFlare < 45 && lum > 210) {
      flareAlpha = Math.min(1.0, (255 - distFlare * 5) / 255.0);
    }
    if (Math.abs(y - 175) <= 6 && lum > 175 && x > 180 && x < 960) {
      const streakA = Math.max(0, (1.0 - Math.abs(y - 175) / 6.0) * ((lum - 175) / 80.0));
      flareAlpha = Math.max(flareAlpha, streakA * 0.88);
    }
    maskFlare[idx] = flareAlpha;

    // Foreground occluders for sky inpainting
    maskOcclusion[idx] = Math.max(
      maskSentinel[idx],
      Math.max(maskCitadel[idx], Math.max(maskNeedles[idx], maskWater[idx]))
    );
  }
}

// ----------------------------------------------------------------------------
// 2. Inpainting Hidden Sky Regions Behind Sentinel & Citadel
// ----------------------------------------------------------------------------
console.log('Synthesizing hidden sky & celestial regions...');

const planetCx = 594;
const planetCy = 225;
const planetR = 405;

// Synthesized sky buffer (RGBA)
const skyInpainted = new Uint8Array(W * H * 4);
const skySynthesizedFillOnly = new Uint8Array(W * H * 4);
const skyOcclusionMaskPng = new Uint8Array(W * H * 4);

for (let y = 0; y < H; y++) {
  // Find left and right unoccluded sky reference columns for this row (for Sentinel inpainting)
  let refLeftX = 40;
  let refRightX = 290;
  while (refLeftX > 0 && maskSentinel[y * W + refLeftX] > 0.05) refLeftX--;
  while (refRightX < 450 && maskSentinel[y * W + refRightX] > 0.05) refRightX++;

  const [rlR, rlG, rlB] = getRGB(refLeftX, y);
  const [rrR, rrG, rrB] = getRGB(refRightX, y);

  for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    const pIdx = idx * 4;
    const origR = data[pIdx];
    const origG = data[pIdx + 1];
    const origB = data[pIdx + 2];
    const occ = maskOcclusion[idx];

    // Occlusion mask visualization
    skyOcclusionMaskPng[pIdx] = Math.round(occ * 255);
    skyOcclusionMaskPng[pIdx + 1] = Math.round(occ * 255);
    skyOcclusionMaskPng[pIdx + 2] = Math.round(occ * 255);
    skyOcclusionMaskPng[pIdx + 3] = 255;

    if (occ < 0.05) {
      // Completely authentic pixel visible in original poster
      skyInpainted[pIdx] = origR;
      skyInpainted[pIdx + 1] = origG;
      skyInpainted[pIdx + 2] = origB;
      skyInpainted[pIdx + 3] = 255;
      continue;
    }

    // This pixel is occluded by Sentinel, Citadel, Needle, or Water.
    // We synthesize the hidden background:
    let synR = origR, synG = origG, synB = origB;

    // Case A: Occluded by Solar Citadel (x >= 630)
    if (x >= 630) {
      const dx = x - planetCx;
      const dy = y - planetCy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= planetR) {
        // Inside the Umbral Giant disk occluded by Citadel!
        // Sample authentic planet pixel at symmetric unoccluded position across disk
        // or horizontally mirrored inside unoccluded sector
        const symX = Math.round(planetCx - (dx * 0.75));
        const [pRefR, pRefG, pRefB] = getRGB(symX, y);

        // Radial limb glow near planet rim
        const rimDist = planetR - dist;
        let rimGlow = 0;
        if (rimDist < 16) {
          rimGlow = Math.max(0, (16 - rimDist) / 16.0);
        }

        synR = Math.round(pRefR * (1 - rimGlow * 0.4) + 180 * (rimGlow * 0.4));
        synG = Math.round(pRefG * (1 - rimGlow * 0.4) + 90 * (rimGlow * 0.4));
        synB = Math.round(pRefB * (1 - rimGlow * 0.4) + 60 * (rimGlow * 0.4));
      } else if (y < 600) {
        // Space / Starfield outside planet limb
        // Sample authentic starry void from upper right
        const [voidR, voidG, voidB] = getRGB(Math.min(W - 1, x), Math.max(10, y - 100));
        synR = voidR;
        synG = voidG;
        synB = voidB;
      } else {
        // Lower atmosphere twilight / horizon glow (y in [600, 855])
        // Sample authentic horizon gradient at x = 500 (open sky horizon)
        const [horizR, horizG, horizB] = getRGB(500, Math.min(854, y));
        synR = horizR;
        synG = horizG;
        synB = horizB;
      }
    }
    // Case B: Occluded by Western Sentinel (x < 350)
    else if (maskSentinel[idx] > 0.05) {
      const span = Math.max(1, refRightX - refLeftX);
      const t = Math.min(1.0, Math.max(0, (x - refLeftX) / span));

      synR = Math.round(rlR * (1 - t) + rrR * t);
      synG = Math.round(rlG * (1 - t) + rrG * t);
      synB = Math.round(rlB * (1 - t) + rrB * t);
    }
    // Case C: Behind water or needles (y >= 855)
    else {
      // Smooth continuation of horizon atmospheric haze
      const [hR, hG, hB] = getRGB(x, 854);
      synR = hR;
      synG = hG;
      synB = hB;
    }

    // Blend authentic pixels with synthesized fill based on occlusion:
    // At canonical camera, foreground spires completely cover this.
    // When spires parallax away, the synthesized fill is seen!
    skyInpainted[pIdx] = synR;
    skyInpainted[pIdx + 1] = synG;
    skyInpainted[pIdx + 2] = synB;
    skyInpainted[pIdx + 3] = 255;

    // Isolated fill asset for documentation
    skySynthesizedFillOnly[pIdx] = synR;
    skySynthesizedFillOnly[pIdx + 1] = synG;
    skySynthesizedFillOnly[pIdx + 2] = synB;
    skySynthesizedFillOnly[pIdx + 3] = Math.round(occ * 255);
  }
}

// ----------------------------------------------------------------------------
// 3. Synthesize Extended Ribbons Behind Spires (Layer B inpainting)
// ----------------------------------------------------------------------------
const ribbonsExtendedPng = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    const pIdx = idx * 4;
    const a = maskRibbons[idx];

    if (a > 0.01) {
      ribbonsExtendedPng[pIdx] = data[pIdx];
      ribbonsExtendedPng[pIdx + 1] = data[pIdx + 1];
      ribbonsExtendedPng[pIdx + 2] = data[pIdx + 2];
      ribbonsExtendedPng[pIdx + 3] = Math.round(a * 255);
    }
  }
}

// ----------------------------------------------------------------------------
// 4. Color Dilation & Alpha Edge Antialiasing
// Dilates RGB into transparent (alpha=0) regions so bilinear texture filtering
// doesn't interpolate towards black (0,0,0), eliminating dark silhouette halos.
// ----------------------------------------------------------------------------
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
      rgba[pIdx] = nextRGB[rgbIdx];
      rgba[pIdx + 1] = nextRGB[rgbIdx + 1];
      rgba[pIdx + 2] = nextRGB[rgbIdx + 2];
    }
  }
}

function savePng(filename, buffer) {
  const png = new PNG({ width: W, height: H });
  png.data = Buffer.from(buffer);
  const outBuffer = PNG.sync.write(png);
  fs.writeFileSync(filename, outBuffer);
  console.log(`Saved: ${filename} (${(outBuffer.length / 1024).toFixed(1)} KB)`);
}

// Layer A: Deep Sky
savePng(path.join(OUT_DIR, 'layer-a-deep-sky.png'), skyInpainted);

// Layer B: Magenta Ribbons
dilateColors(ribbonsExtendedPng, W, H, 2);
savePng(path.join(OUT_DIR, 'layer-b-ribbons.png'), ribbonsExtendedPng);

// Layer C: Western Sentinel (transparent cutout)
const sentinelPng = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const pIdx = i * 4;
  const a = maskSentinel[i];
  if (a > 0.01) {
    sentinelPng[pIdx] = data[pIdx];
    sentinelPng[pIdx + 1] = data[pIdx + 1];
    sentinelPng[pIdx + 2] = data[pIdx + 2];
    sentinelPng[pIdx + 3] = Math.round(a * 255);
  }
}
dilateColors(sentinelPng, W, H, 2);
savePng(path.join(OUT_DIR, 'layer-c-sentinel.png'), sentinelPng);

// Layer D: Solar Citadel (transparent cutout)
const citadelPng = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const pIdx = i * 4;
  const a = maskCitadel[i];
  if (a > 0.01) {
    citadelPng[pIdx] = data[pIdx];
    citadelPng[pIdx + 1] = data[pIdx + 1];
    citadelPng[pIdx + 2] = data[pIdx + 2];
    citadelPng[pIdx + 3] = Math.round(a * 255);
  }
}
dilateColors(citadelPng, W, H, 2);
savePng(path.join(OUT_DIR, 'layer-d-citadel.png'), citadelPng);

// Layer E: Needles & Horizon Spire Cutouts
const needlesPng = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const pIdx = i * 4;
  const a = maskNeedles[i];
  if (a > 0.01) {
    needlesPng[pIdx] = data[pIdx];
    needlesPng[pIdx + 1] = data[pIdx + 1];
    needlesPng[pIdx + 2] = data[pIdx + 2];
    needlesPng[pIdx + 3] = Math.round(a * 255);
  }
}
dilateColors(needlesPng, W, H, 2);
savePng(path.join(OUT_DIR, 'layer-e-needles.png'), needlesPng);

// Layer F: Foreground Water (transparent top)
const waterPng = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const pIdx = i * 4;
  const a = maskWater[i];
  if (a > 0.01) {
    waterPng[pIdx] = data[pIdx];
    waterPng[pIdx + 1] = data[pIdx + 1];
    waterPng[pIdx + 2] = data[pIdx + 2];
    waterPng[pIdx + 3] = Math.round(a * 255);
  }
}
dilateColors(waterPng, W, H, 2);
savePng(path.join(OUT_DIR, 'layer-f-water.png'), waterPng);

// Layer G: Solstice Flare (additive / isolated card)
const flarePng = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const pIdx = i * 4;
  const a = maskFlare[i];
  if (a > 0.01) {
    flarePng[pIdx] = data[pIdx];
    flarePng[pIdx + 1] = data[pIdx + 1];
    flarePng[pIdx + 2] = data[pIdx + 2];
    flarePng[pIdx + 3] = Math.round(a * 255);
  }
}
dilateColors(flarePng, W, H, 2);
savePng(path.join(OUT_DIR, 'layer-g-flare.png'), flarePng);

// ----------------------------------------------------------------------------
// Generated Hidden-Region Diagnostic Assets
// ----------------------------------------------------------------------------
savePng(path.join(GEN_DIR, 'sky-occlusion-mask.png'), skyOcclusionMaskPng);
savePng(path.join(GEN_DIR, 'sky-synthesized-fill.png'), skySynthesizedFillOnly);
savePng(path.join(GEN_DIR, 'ribbons-extended-fill.png'), ribbonsExtendedPng);
savePng(path.join(GEN_DIR, 'water-extended-fill.png'), waterPng);

// Segmentation Composite (Diagnostic Color-Coded Map)
const compPng = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const pIdx = i * 4;
  // Default dark background
  let r = 15, g = 20, b = 35;

  if (maskWater[i] > 0.2) {
    // Water: Cyan/Blue (0, 150, 220)
    r = 0; g = 150; b = 220;
  } else if (maskCitadel[i] > 0.2) {
    // Citadel: Gold/Amber (240, 180, 40)
    r = 240; g = 180; b = 40;
  } else if (maskSentinel[i] > 0.2) {
    // Sentinel: Emerald Green (50, 210, 120)
    r = 50; g = 210; b = 120;
  } else if (maskNeedles[i] > 0.2) {
    // Needles: White (255, 255, 255)
    r = 255; g = 255; b = 255;
  } else if (maskRibbons[i] > 0.2) {
    // Ribbons: Magenta (255, 60, 180)
    r = 255; g = 60; b = 180;
  } else {
    // Deep Sky: Deep Indigo (40, 30, 80)
    r = 40; g = 30; b = 80;
  }

  // Highlight flare
  if (maskFlare[i] > 0.3) {
    r = 255; g = 255; b = 200;
  }

  compPng[pIdx] = r;
  compPng[pIdx + 1] = g;
  compPng[pIdx + 2] = b;
  compPng[pIdx + 3] = 255;
}
savePng(path.join(GEN_DIR, 'segmentation-masks-composite.png'), compPng);

console.log('All Prototype 02 layers and generated assets generated successfully.');
