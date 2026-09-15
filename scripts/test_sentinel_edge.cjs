const fs = require('fs');
const jpeg = require('jpeg-js');
const orig = jpeg.decode(fs.readFileSync('reference/poster.jpeg'), { useTArray: true });
const W = orig.width, data = orig.data;

console.log('Sampling Sentinel line y = 400 across x from 100 to 200:');
for (let x = 115; x <= 180; x += 5) {
  const p = (400 * W + x) * 4;
  const r = data[p], g = data[p+1], b = data[p+2];
  // Sky around y=400 is mauve/slate: r ~ 50, g ~ 45, b ~ 65
  // Spire is cyan/blue: r ~ 40, g ~ 90, b ~ 150
  const isSpire = (g > r + 6 && b > r + 15) || (b > 150 && g > 130);
  console.log('x=' + x + ': RGB(' + r + ',' + g + ',' + b + ') -> spire=' + isSpire);
}
