const fs = require('fs');
const jpeg = require('jpeg-js');

const rawJpeg = fs.readFileSync('reference/poster.jpeg');
const poster = jpeg.decode(rawJpeg, { useTArray: true });
const W = poster.width;
const H = poster.height;
const data = poster.data;

function getRGB(x, y) {
  if (x < 0 || x >= W || y < 0 || y >= H) return [0, 0, 0];
  const idx = (y * W + x) * 4;
  return [data[idx], data[idx + 1], data[idx + 2]];
}

// Find apex of Western Sentinel around x in [130, 160], y in [350, 380]
console.log('Scanning Sentinel Apex (x: 130..155, y: 360..375):');
for (let y = 360; y <= 372; y++) {
  let row = `y=${y}: `;
  for (let x = 138; x <= 146; x++) {
    const [r, g, b] = getRGB(x, y);
    row += `(${r},${g},${b}) `;
  }
  console.log(row);
}

// Find apex of Solar Citadel around x in [830, 850], y in [170, 210]
console.log('\nScanning Citadel Apex (x: 834..842, y: 170..185):');
for (let y = 170; y <= 185; y++) {
  let row = `y=${y}: `;
  for (let x = 834; x <= 842; x++) {
    const [r, g, b] = getRGB(x, y);
    row += `(${r},${g},${b}) `;
  }
  console.log(row);
}
