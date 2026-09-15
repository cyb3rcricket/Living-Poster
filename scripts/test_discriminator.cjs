const fs = require('fs');
const jpeg = require('jpeg-js');
const orig = jpeg.decode(fs.readFileSync('reference/poster.jpeg'), { useTArray: true });
const W = orig.width, H = orig.height, data = orig.data;

function getRGB(x, y) {
  const p = (y * W + x) * 4;
  return [data[p], data[p+1], data[p+2]];
}

console.log('Testing refined crystal discriminator:');
for (let y = 366; y <= 855; y += 40) {
  let leftEdge = -1, rightEdge = -1;
  // Sentinel is centered roughly around x = 142 at top, expanding to x in [50, 260] at bottom
  const maxSpan = 15 + (y - 366) * 0.35;
  const xMin = Math.max(10, Math.floor(142 - maxSpan * 0.9));
  const xMax = Math.min(350, Math.ceil(142 + maxSpan * 1.1));

  for (let x = xMin; x <= xMax; x++) {
    const [r, g, b] = getRGB(x, y);
    // Is authentic crystal: blue/cyan dominance, NOT magenta ribbon
    const isRibbon = (r > g + 16) && (b > g + 6) && (r > 80);
    const isCrystal = !isRibbon && ((b > r + 16 && g >= r - 4) || (b > 110 && g > 100 && r < 140) || (y < 420 && b > 100 && Math.abs(x - 142) < 25));
    if (isCrystal) {
      if (leftEdge === -1) leftEdge = x;
      rightEdge = x;
    }
  }
  console.log(`y=${y}: span=[${xMin}..${xMax}] -> left=${leftEdge}, right=${rightEdge}, width=${rightEdge - leftEdge}`);
}
