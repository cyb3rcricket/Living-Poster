const fs = require('fs');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

// Load reference poster
const rawJpeg = fs.readFileSync('reference/poster.jpeg');
const poster = jpeg.decode(rawJpeg, { useTArray: true });
const W = poster.width;
const H = poster.height;
const data = poster.data;

console.log(`Generating high-fidelity artistic depth map ${W}x${H}...`);

const depth = new Float32Array(W * H);

// 1. Cosmic Void & Deep Starfield (0.025)
for (let i = 0; i < W * H; i++) {
  depth[i] = 0.025;
}

// 2. Umbral Giant (Colossal celestial body)
const planetCx = 594;
const planetCy = 225;
const planetR = 405;

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = x - planetCx;
    const dy = y - planetCy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= planetR) {
      const normDist = dist / planetR;
      const bulge = Math.sqrt(Math.max(0, 1.0 - normDist * normDist));
      const planetDepth = 0.17 + 0.06 * bulge;
      
      let alpha = 1.0;
      if (planetR - dist < 12) {
        alpha = Math.max(0, (planetR - dist) / 12);
      }
      const idx = y * W + x;
      depth[idx] = depth[idx] * (1 - alpha) + planetDepth * alpha;
    }
  }
}

// Ember Moon (upper left: 353, 26, r ~ 21px)
const moonCx = 353;
const moonCy = 26;
const moonR = 21;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = x - moonCx;
    const dy = y - moonCy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= moonR) {
      const alpha = Math.min(1.0, Math.max(0, (moonR - dist + 2) / 3));
      const idx = y * W + x;
      depth[idx] = depth[idx] * (1 - alpha) + 0.08 * alpha;
    }
  }
}

// 3. Aurora Veil Ribbons (Neon Magenta atmospheric ribbons)
for (let y = 180; y < 580; y++) {
  for (let x = 100; x < 900; x++) {
    const pIdx = (y * W + x) * 4;
    const r = data[pIdx], g = data[pIdx + 1], b = data[pIdx + 2];
    
    const isMagenta = (r > 75) && (b > 70) && ((r - g) > 16) && ((b - g) > 6);
    if (isMagenta) {
      const strength = Math.min(1.0, Math.max(0, ((r - g) - 16) / 35.0));
      const ribbonDepth = 0.31 + 0.05 * strength;
      const idx = y * W + x;
      if (depth[idx] < ribbonDepth) {
        depth[idx] = depth[idx] * (1 - strength * 0.85) + ribbonDepth * (strength * 0.85);
      }
    }
  }
}

// 4. Horizon Distant Formations & Needle
for (let y = 675; y <= 860; y++) {
  const needleCenter = 556 + (y - 675) * 0.08;
  const halfWidth = 0.6 + (y - 675) * 0.095;
  for (let x = Math.floor(needleCenter - halfWidth - 2); x <= Math.ceil(needleCenter + halfWidth + 2); x++) {
    if (x >= 0 && x < W) {
      const dist = Math.abs(x - needleCenter);
      if (dist <= halfWidth + 1.2) {
        const alpha = Math.min(1.0, Math.max(0, (halfWidth + 1.2 - dist) / 1.2));
        const needleDepth = 0.46 + 0.04 * ((y - 675) / 185);
        const idx = y * W + x;
        depth[idx] = depth[idx] * (1 - alpha) + needleDepth * alpha;
      }
    }
  }
}

// Tiny periphery needle (far left: x ~ 10, y: 730..860)
for (let y = 730; y <= 860; y++) {
  const needleCenter = 10 + (y - 730) * 0.04;
  const halfWidth = 0.6 + (y - 730) * 0.05;
  for (let x = Math.floor(needleCenter - halfWidth - 1); x <= Math.ceil(needleCenter + halfWidth + 1); x++) {
    if (x >= 0 && x < W) {
      const dist = Math.abs(x - needleCenter);
      if (dist <= halfWidth + 1) {
        const alpha = Math.min(1.0, Math.max(0, (halfWidth + 1 - dist) / 1.0));
        const idx = y * W + x;
        depth[idx] = depth[idx] * (1 - alpha) + 0.44 * alpha;
      }
    }
  }
}

// 5. Ocean Water (y: 855 to 1024)
const horizonY = 855;
for (let y = horizonY; y < H; y++) {
  const t = (y - horizonY) / (H - 1 - horizonY);
  const waterDepth = 0.48 + 0.50 * Math.pow(t, 1.35);
  for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    depth[idx] = waterDepth;
  }
}

// 6. Western Sentinel (Spire Left)
for (let y = 366; y <= 940; y++) {
  const dy = y - 366;
  const coneLeft = 142 - dy * 0.16;
  const coneRight = 142 + dy * 0.25;
  
  for (let x = Math.floor(coneLeft - 4); x <= Math.ceil(coneRight + 4); x++) {
    if (x < 0 || x >= W) continue;
    const pIdx = (y * W + x) * 4;
    const r = data[pIdx], g = data[pIdx + 1], b = data[pIdx + 2];
    
    const isApex = (dy < 25);
    const isBody = (b > r + 6) || (b > 35 && g > 30 && r < 110);
    const isDarkBase = (y >= 750) && (b >= r - 8);
    
    if (isApex || isBody || isDarkBase) {
      const vertT = dy / (915 - 366);
      const span = Math.max(2, coneRight - coneLeft);
      const midX = (coneLeft + coneRight) * 0.5;
      const lateralDist = Math.abs(x - midX) / (span * 0.5);
      const bulge = Math.max(0, 1.0 - Math.min(1.0, lateralDist * lateralDist));
      
      // Facet detail from luminance
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
      const facetMod = (lum - 0.4) * 0.03;
      
      let spireDepth = 0.70 + 0.14 * Math.min(1.0, vertT) + 0.03 * bulge + facetMod;
      
      // Seamless waterline blend between y=880 and y=935
      if (y > 880) {
        const waterT = Math.min(1.0, (y - 880) / 55.0);
        const wDepth = depth[y * W + x];
        spireDepth = spireDepth * (1.0 - waterT * 0.6) + wDepth * (waterT * 0.6);
      }
      
      const idx = y * W + x;
      depth[idx] = Math.max(depth[idx], spireDepth);
    }
  }
}

// 7. Solar Citadel (Spire Right)
for (let y = 175; y <= 970; y++) {
  const dy = y - 175;
  let leftBound = 838;
  let rightBound = 838;
  
  if (y < 230) {
    leftBound = 838 - dy * 0.40;
    rightBound = 838 + dy * 0.40;
  } else if (y < 471) {
    leftBound = 838 - 55 * 0.40 - (y - 230) * 0.48;
    rightBound = 838 + 55 * 0.40 + (y - 230) * 0.35;
  } else if (y < 650) {
    leftBound = 707 - (y - 471) * 0.20;
    rightBound = Math.min(W - 1, 838 + 55 * 0.40 + 241 * 0.35 + (y - 471) * 0.5);
  } else {
    leftBound = 707 - 179 * 0.20 - (y - 650) * 0.30;
    rightBound = W - 1;
  }
  
  for (let x = Math.floor(leftBound - 4); x <= Math.min(W - 1, Math.ceil(rightBound + 4)); x++) {
    const pIdx = (y * W + x) * 4;
    const r = data[pIdx], g = data[pIdx + 1], b = data[pIdx + 2];
    
    const isPinnacle = (y < 230);
    const isCrystal = (b > r + 4) || (g > r && b > 45) || (b > 40 && g > 40 && r < 160);
    const isMass = (y > 450 && x > 670);
    const isWaterline = (y > 750 && x > 585);
    
    if (isPinnacle || isCrystal || isMass || isWaterline) {
      const vertT = dy / (960 - 175);
      const span = Math.max(2, rightBound - leftBound);
      const midX = (leftBound + rightBound) * 0.5;
      const lateralDist = Math.abs(x - midX) / (span * 0.5);
      const bulge = Math.max(0, 1.0 - Math.min(1.0, lateralDist * lateralDist));
      
      const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;
      const facetMod = (lum - 0.5) * 0.03;
      
      let citadelDepth = 0.56 + 0.14 * Math.min(1.0, vertT) + 0.03 * bulge + facetMod;
      
      // Seamless waterline blend
      if (y > 870) {
        const waterT = Math.min(1.0, (y - 870) / 90.0);
        const wDepth = depth[y * W + x];
        citadelDepth = citadelDepth * (1.0 - waterT * 0.5) + wDepth * (waterT * 0.5);
      }
      
      const idx = y * W + x;
      depth[idx] = Math.max(depth[idx], citadelDepth);
    }
  }
}

// 8. Edge-Preserving Bilateral Smoothing
const smoothed = new Float32Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const centerVal = depth[y * W + x];
    let sum = 0, weightSum = 0;
    
    for (let dy = -2; dy <= 2; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= H) continue;
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        if (nx < 0 || nx >= W) continue;
        const val = depth[ny * W + nx];
        const spatialDist = dx * dx + dy * dy;
        const depthDiff = Math.abs(val - centerVal);
        
        const wSpatial = Math.exp(-spatialDist / 4.0);
        const wDepth = Math.exp(-depthDiff * depthDiff / 0.003);
        const weight = wSpatial * wDepth;
        
        sum += val * weight;
        weightSum += weight;
      }
    }
    smoothed[y * W + x] = weightSum > 0 ? sum / weightSum : centerVal;
  }
}

// 9. Write RGBA PNG output
const png = new PNG({ width: W, height: H });
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    const byteVal = Math.round(Math.min(255, Math.max(0, smoothed[idx] * 255)));
    const pIdx = idx * 4;
    png.data[pIdx] = byteVal;
    png.data[pIdx + 1] = byteVal;
    png.data[pIdx + 2] = byteVal;
    png.data[pIdx + 3] = 255;
  }
}

const outPath = 'reference/experimental/poster-depth-v1.png';
const buffer = PNG.sync.write(png);
fs.writeFileSync(outPath, buffer);
console.log(`Saved high-fidelity depth map to ${outPath} (${buffer.length} bytes)`);
