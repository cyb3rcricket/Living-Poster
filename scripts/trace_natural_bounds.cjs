const fs = require('fs');
const jpeg = require('jpeg-js');
const orig = jpeg.decode(fs.readFileSync('reference/poster.jpeg'), { useTArray: true });
const W = orig.width, H = orig.height, data = orig.data;

function getRGB(x, y) {
  const p = (y * W + x) * 4;
  return [data[p], data[p+1], data[p+2]];
}

// Trace Sentinel left and right boundaries naturally per scanline
console.log('Tracing natural Sentinel boundary:');
for (let y = 366; y <= 855; y += 40) {
  // Find left edge: scan right from x=20 until crystal is hit
  let leftEdge = -1;
  for (let x = 20; x <= 220; x++) {
    const [r, g, b] = getRGB(x, y);
    // Crystal indicator: blue/cyan dominance or bright crest
    const isCrystal = (b > r + 16 && g >= r - 2) || (g > r + 8 && b > r + 10) || (b > 130 && g > 110 && r < 140);
    if (isCrystal) {
      leftEdge = x;
      break;
    }
  }

  // Find right edge: scan left from x=320 until crystal is hit
  let rightEdge = -1;
  for (let x = 320; x >= 120; x--) {
    const [r, g, b] = getRGB(x, y);
    const isCrystal = (b > r + 16 && g >= r - 2) || (g > r + 8 && b > r + 10) || (b > 130 && g > 110 && r < 140);
    if (isCrystal) {
      rightEdge = x;
      break;
    }
  }

  console.log(`y=${y}: leftEdge=${leftEdge}, rightEdge=${rightEdge}, width=${rightEdge - leftEdge}`);
}
