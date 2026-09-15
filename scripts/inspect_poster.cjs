const fs = require('fs');
const jpeg = require('jpeg-js');

const rawJpeg = fs.readFileSync('reference/poster.jpeg');
const poster = jpeg.decode(rawJpeg, { useTArray: true });
const W = poster.width;
const H = poster.height;
const data = poster.data;

console.log(`Poster loaded: ${W}x${H}`);

function getPixel(x, y) {
  const idx = (Math.floor(y) * W + Math.floor(x)) * 4;
  return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
}

// Sample key landmark positions
const samples = [
  { name: 'Cosmic void top-left', x: 50, y: 50 },
  { name: 'Ember Moon center', x: 353, y: 26 },
  { name: 'Umbral Giant center', x: 594, y: 225 },
  { name: 'Umbral Giant dark band', x: 600, y: 350 },
  { name: 'Solstice Flare center', x: 838, y: 175 },
  { name: 'Flare horizontal beam', x: 600, y: 175 },
  { name: 'Western Sentinel apex', x: 142, y: 366 },
  { name: 'Western Sentinel body', x: 150, y: 550 },
  { name: 'Western Sentinel cyan edge', x: 175, y: 550 },
  { name: 'Solar Citadel peak', x: 838, y: 200 },
  { name: 'Solar Citadel cyan shoulder', x: 740, y: 350 },
  { name: 'Solar Citadel dark mass', x: 850, y: 550 },
  { name: 'Midnight Needle apex', x: 556, y: 675 },
  { name: 'Midnight Needle base', x: 556, y: 840 },
  { name: 'Aurora ribbon mid-left', x: 250, y: 400 },
  { name: 'Aurora ribbon center', x: 500, y: 280 },
  { name: 'Water horizon center', x: 500, y: 860 },
  { name: 'Water foreground center', x: 500, y: 980 },
  { name: 'Citadel waterline froth', x: 700, y: 880 },
];

for (const s of samples) {
  const p = getPixel(s.x, s.y);
  console.log(`${s.name.padEnd(28)} (${s.x}, ${s.y}): RGBA(${p[0]}, ${p[1]}, ${p[2]}, ${p[3]})`);
}
