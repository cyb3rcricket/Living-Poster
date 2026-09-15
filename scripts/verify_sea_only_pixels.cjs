#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'reference/experimental/prototype-02/layer-f-water.png');
const SEA = path.join(ROOT, 'reference/experimental/prototype-05/generated/layer-f-water-sea-only.png');
const HARD = path.join(ROOT, 'reference/experimental/prototype-05/generated/water-missing-mask-hard.png');
const Y0 = 855;

function load(p) {
  return PNG.sync.read(fs.readFileSync(p));
}

function main() {
  const src = load(SRC);
  const sea = load(SEA);
  const hard = load(HARD);
  if (src.width !== 1024 || src.height !== 1024 || sea.width !== 1024 || sea.height !== 1024) {
    throw new Error(`size mismatch src ${src.width}x${src.height} sea ${sea.width}x${sea.height}`);
  }

  let protDiff = 0;
  let aboveDiff = 0;
  let hardWhite = 0;
  let hardWhiteOpaque = 0;
  let hardWhiteChanged = 0;
  let fillAMin = 255;
  let fillAMax = 0;
  let bandOpaque = 0;
  let bandCount = 0;
  let aboveZero = 0;
  let aboveCount = 0;

  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const i = (y * 1024 + x) * 4;
      const isHard = hard.data[i] > 127;
      const same =
        sea.data[i] === src.data[i]
        && sea.data[i + 1] === src.data[i + 1]
        && sea.data[i + 2] === src.data[i + 2]
        && sea.data[i + 3] === src.data[i + 3];
      if (y < Y0) {
        aboveCount++;
        if (sea.data[i + 3] === 0 && sea.data[i] === 0 && sea.data[i + 1] === 0 && sea.data[i + 2] === 0) aboveZero++;
        if (!same) {
          aboveDiff++;
          protDiff++;
        }
      } else {
        bandCount++;
        if (sea.data[i + 3] === 255) bandOpaque++;
        if (isHard) {
          hardWhite++;
          if (sea.data[i + 3] === 255) hardWhiteOpaque++;
          fillAMin = Math.min(fillAMin, sea.data[i + 3]);
          fillAMax = Math.max(fillAMax, sea.data[i + 3]);
          if (!same) hardWhiteChanged++;
        } else if (!same) {
          protDiff++;
        }
      }
    }
  }

  const report = {
    src: path.relative(ROOT, SRC),
    sea: path.relative(ROOT, SEA),
    hard: path.relative(ROOT, HARD),
    size: '1024x1024',
    protectedDiffPixels: protDiff,
    aboveBandDiffPixels: aboveDiff,
    aboveBandTransparentBlack: aboveZero,
    aboveBandPixels: aboveCount,
    waterBandPixels: bandCount,
    waterBandOpaque: bandOpaque,
    hardMaskPixels: hardWhite,
    hardMaskChanged: hardWhiteChanged,
    hardMaskUnchanged: hardWhite - hardWhiteChanged,
    reconstructedAlphaMin: hardWhite ? fillAMin : null,
    reconstructedAlphaMax: hardWhite ? fillAMax : null,
    reconstructedOpaque: hardWhiteOpaque,
    pass: protDiff === 0 && aboveDiff === 0 && hardWhiteOpaque === hardWhite && fillAMin === 255,
  };
  const dest = path.join(ROOT, 'scripts/p05b-sea-only-verification/pixel-preservation.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}

main();
