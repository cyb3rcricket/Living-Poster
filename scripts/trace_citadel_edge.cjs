const fs = require('fs');
const jpeg = require('jpeg-js');
const orig = jpeg.decode(fs.readFileSync('reference/poster.jpeg'), { useTArray: true });
const W = orig.width, H = orig.height, data = orig.data;

function getRGB(x, y) {
  const p = (y * W + x) * 4;
  return [data[p], data[p+1], data[p+2]];
}

console.log('Testing Solar Citadel left edge detection:');
for (let y = 175; y <= 855; y += 40) {
  let leftEdge = -1;
  for (let x = 550; x <= 950; x++) {
    const [r, g, b] = getRGB(x, y);
    // Is crystal/citadel pixel:
    // Notice: at peak (y < 230), bright white/gold flare surrounds the spire apex
    const isPinnacle = (y < 230 && Math.abs(x - 838) <= (y - 175) * 0.45 + 10);
    const isCrystal = (b > r + 4) || (g > r && b > 40) || (b > 110 && g > 90);
    const isDarkMass = (y > 450 && x > 650 && b >= r - 5);

    if (isPinnacle || isCrystal || isDarkMass) {
      leftEdge = x;
      break;
    }
  }
  console.log(`y=${y}: leftEdge=${leftEdge}`);
}
