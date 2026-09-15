const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const GEN_DIR = 'reference/experimental/prototype-04/generated';

console.log('=== Building High-Fidelity Sculptural Mesh for Prototype 04 ===');

const maskPng = PNG.sync.read(fs.readFileSync(path.join(GEN_DIR, 'citadel-silhouette-mask.png')));
const W = maskPng.width;
const H = maskPng.height;

// Find left silhouette contour per scanline
const contourLeft = [];
for (let y = 175; y <= 960; y++) {
  let leftX = -1;
  for (let x = 0; x < W; x++) {
    if (maskPng.data[(y * W + x) * 4] > 128) {
      leftX = x;
      break;
    }
  }
  if (leftX !== -1) {
    contourLeft.push({ y, x: leftX });
  }
}

function getLeftXForY(yTarget) {
  let best = contourLeft[0];
  let bestDist = 9999;
  for (const c of contourLeft) {
    const d = Math.abs(c.y - yTarget);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best.x;
}

// Canonical perspective unprojection:
// Guarantees that at canonical camera (0, 0, 2.0) with fov=53.130102 deg,
// the point projects to exactly (u, v) in screen space!
function unprojectCanon(u, v, z) {
  const dist = 2.0 - z;
  return [
    (u - 0.5) * dist,
    (0.5 - v) * dist,
    z
  ];
}

// Sculptural Front Depth Profile:
// Models the true anatomical relief of the Solar Citadel:
// - Apex pinnacle: Z = 0.965 (proud forward peak)
// - Spire shaft: Z = 0.955
// - Left shoulder buttress: Z = 0.948 (forward shelf)
// - Deep central crevasse: Z = 0.890 (sunken chasm)
// - Lower seaward ramparts: Z = 0.962 (jutting seawall)
// - Waterline footing: Z = 1.012 (steps forward to meet the sea surf)
// - Right massif: Z = 0.910 - 0.930
function getFrontZ(u, v) {
  const yPx = v * 1024;
  const xPx = u * 1024;

  if (yPx < 225) {
    // Apex needle
    return 0.965;
  } else if (yPx < 470) {
    // Spire shaft
    const spineDist = Math.abs(xPx - 815);
    return 0.955 - Math.min(0.035, spineDist * 0.00055);
  } else if (yPx < 750) {
    // Shoulder, Crevasse, Massif
    if (xPx < 695) {
      // Left shoulder crest
      return 0.948;
    } else if (xPx < 775) {
      // Deep Central Crevasse (sinks back!)
      const crevasseDepth = 1.0 - Math.abs(xPx - 745) / 40.0;
      return 0.948 - 0.058 * Math.max(0, crevasseDepth); // sinks to 0.890
    } else {
      // Central massif spine and right flank
      return 0.935 - (xPx - 775) * 0.00018;
    }
  } else if (yPx < 860) {
    // Seaward rampart
    if (xPx < 650) {
      return 0.962; // Forward seawall
    } else if (xPx < 755) {
      return 0.920; // Lower crevasse basin
    } else {
      return 0.930;
    }
  } else {
    // Waterline footing
    const waterT = Math.min(1.0, (yPx - 860) / 100.0);
    return 0.962 + 0.050 * waterT; // up to 1.012
  }
}

// 33 Key Elevation Rings from y=175 to y=960
const keyY = [];
for (let y = 175; y <= 960; y += 25) {
  keyY.push(y);
}
if (keyY[keyY.length - 1] !== 960) keyY.push(960);

console.log(`Generated ${keyY.length} elevation rings.`);

const vertices = [];
const normals = [];
const uvs = [];
const canonUvs = [];
const surfTypes = [];
const indices = [];

const rings = [];

for (let rIdx = 0; rIdx < keyY.length; rIdx++) {
  const y = keyY[rIdx];
  const v = y / 1024.0;
  const leftX = getLeftXForY(y);
  const leftU = leftX / 1024.0;
  const rightU = 1.0;

  const ringVertIndices = {
    front: [],
    side: [],
    rear: [],
  };

  // 1. FRONT SURFACE VERTICES
  const frontXPoints = [leftX];

  if (y <= 230) {
    const midX = Math.round((leftX + 1024) * 0.5);
    if (midX > leftX + 12) frontXPoints.push(midX);
    frontXPoints.push(1024);
  } else if (y < 470) {
    const spineX = Math.round(Math.min(860, Math.max(leftX + 30, 815)));
    frontXPoints.push(spineX);
    frontXPoints.push(Math.round((spineX + 1024) * 0.5));
    frontXPoints.push(1024);
  } else if (y < 750) {
    const shoulderCrestX = Math.round(leftX + (735 - leftX) * 0.45);
    const crevasseX = Math.round(745);
    const spineX = Math.round(820);
    const rightMidX = Math.round(920);

    frontXPoints.push(shoulderCrestX);
    frontXPoints.push(crevasseX);
    frontXPoints.push(spineX);
    frontXPoints.push(rightMidX);
    frontXPoints.push(1024);
  } else {
    const rampartX = Math.round(leftX + (730 - leftX) * 0.40);
    const basinX = Math.round(725);
    const spineX = Math.round(815);
    const rightMidX = Math.round(920);

    frontXPoints.push(rampartX);
    frontXPoints.push(basinX);
    frontXPoints.push(spineX);
    frontXPoints.push(rightMidX);
    frontXPoints.push(1024);
  }

  // Create front vertices
  for (let i = 0; i < frontXPoints.length; i++) {
    const x = frontXPoints[i];
    const u = x / 1024.0;
    const z = getFrontZ(u, v);
    const pos = unprojectCanon(u, v, z);

    const vIdx = vertices.length / 3;
    vertices.push(pos[0], pos[1], pos[2]);
    normals.push(0, 0, 1);
    canonUvs.push(u, 1.0 - v);
    uvs.push((z - 0.65) / 0.40, 1.0 - v);
    surfTypes.push(0.0); // Front surface
    ringVertIndices.front.push(vIdx);
  }

  // 2. WESTERN FLANK (SIDE) FACETS
  // 3 distinct sculptural crystal columns stepping into depth:
  // - Tier 1: Outer chiseled bevel facet (angled at ~35-40 deg)
  // - Tier 2: Mid-cliff terrace facet (with subtle facet stagger)
  // - Tier 3: Deep buttress wall facet
  const frontLeftZ = vertices[ringVertIndices.front[0] * 3 + 2];

  let rearZ = 0.64;
  if (y < 230) rearZ = 0.74;
  else if (y < 470) rearZ = 0.69;
  else if (y < 750) rearZ = 0.65;
  else rearZ = 0.63;

  // Tier 1: Outer fracture facet
  const t1Z = frontLeftZ * 0.70 + rearZ * 0.30;
  const t1Dist = 2.0 - t1Z;
  // Offset U inward to form a diagonal crystal chisel angle
  const facetBevelOffset = (rIdx % 2 === 0 ? 0.032 : 0.026);
  const t1U = Math.min(0.98, leftU + (y < 470 ? 0.020 : facetBevelOffset));
  const t1Pos = [(t1U - 0.5) * t1Dist, (0.5 - v) * t1Dist, t1Z];

  const s1Idx = vertices.length / 3;
  vertices.push(t1Pos[0], t1Pos[1], t1Pos[2]);
  normals.push(-0.85, 0.15, -0.45);
  canonUvs.push(t1U, 1.0 - v);
  uvs.push(0.30, 1.0 - v);
  surfTypes.push(1.0); // Side surface
  ringVertIndices.side.push(s1Idx);

  // Tier 2: Mid-cliff terrace facet
  const t2Z = frontLeftZ * 0.38 + rearZ * 0.62;
  const t2Dist = 2.0 - t2Z;
  const t2U = Math.min(0.98, leftU + (y < 470 ? 0.045 : 0.065));
  const t2Pos = [(t2U - 0.5) * t2Dist, (0.5 - v) * t2Dist, t2Z];

  const s2Idx = vertices.length / 3;
  vertices.push(t2Pos[0], t2Pos[1], t2Pos[2]);
  normals.push(-0.90, 0.05, -0.35);
  canonUvs.push(t2U, 1.0 - v);
  uvs.push(0.60, 1.0 - v);
  surfTypes.push(1.0);
  ringVertIndices.side.push(s2Idx);

  // Tier 3: Deep buttress wall facet
  const t3Z = frontLeftZ * 0.15 + rearZ * 0.85;
  const t3Dist = 2.0 - t3Z;
  const t3U = Math.min(0.98, leftU + (y < 470 ? 0.070 : 0.100));
  const t3Pos = [(t3U - 0.5) * t3Dist, (0.5 - v) * t3Dist, t3Z];

  const s3Idx = vertices.length / 3;
  vertices.push(t3Pos[0], t3Pos[1], t3Pos[2]);
  normals.push(-0.80, -0.10, -0.55);
  canonUvs.push(t3U, 1.0 - v);
  uvs.push(0.80, 1.0 - v);
  surfTypes.push(1.0);
  ringVertIndices.side.push(s3Idx);

  // 3. REAR HULL VERTICES
  // Backside mountain spine and right frame corner
  const rearDist = 2.0 - rearZ;
  const rearMidU = Math.min(0.98, (t3U + rightU) * 0.5);
  const rearMidPos = [(rearMidU - 0.5) * rearDist, (0.5 - v) * rearDist, rearZ];

  const rMidIdx = vertices.length / 3;
  vertices.push(rearMidPos[0], rearMidPos[1], rearMidPos[2]);
  normals.push(0.0, 0.0, -1.0);
  canonUvs.push(rearMidU, 1.0 - v);
  uvs.push(0.90, 1.0 - v);
  surfTypes.push(1.0);
  ringVertIndices.rear.push(rMidIdx);

  const rearRightPos = [(rightU - 0.5) * rearDist, (0.5 - v) * rearDist, rearZ];
  const rRightIdx = vertices.length / 3;
  vertices.push(rearRightPos[0], rearRightPos[1], rearRightPos[2]);
  normals.push(0.65, 0.0, -0.75);
  canonUvs.push(rightU, 1.0 - v);
  uvs.push(1.0, 1.0 - v);
  surfTypes.push(1.0);
  ringVertIndices.rear.push(rRightIdx);

  rings.push(ringVertIndices);
}

console.log(`Vertices created: ${vertices.length / 3}`);

// Helper functions for triangulation
function addTri(a, b, c) {
  indices.push(a, b, c);
}
function addQuad(a, b, c, d) {
  addTri(a, b, c);
  addTri(a, c, d);
}

// 1. Front Facets Triangulation
for (let r = 0; r < rings.length - 1; r++) {
  const r0 = rings[r].front;
  const r1 = rings[r + 1].front;
  const n0 = r0.length;
  const n1 = r1.length;

  let i0 = 0, i1 = 0;
  while (i0 < n0 - 1 || i1 < n1 - 1) {
    if (i0 < n0 - 1 && i1 < n1 - 1) {
      const p00 = [vertices[r0[i0]*3], vertices[r0[i0]*3+1], vertices[r0[i0]*3+2]];
      const p01 = [vertices[r0[i0+1]*3], vertices[r0[i0+1]*3+1], vertices[r0[i0+1]*3+2]];
      const p10 = [vertices[r1[i1]*3], vertices[r1[i1]*3+1], vertices[r1[i1]*3+2]];
      const p11 = [vertices[r1[i1+1]*3], vertices[r1[i1+1]*3+1], vertices[r1[i1+1]*3+2]];

      const d1 = Math.hypot(p00[0]-p11[0], p00[1]-p11[1], p00[2]-p11[2]);
      const d2 = Math.hypot(p01[0]-p10[0], p01[1]-p10[1], p01[2]-p10[2]);

      if (d1 < d2) {
        addTri(r0[i0], r1[i1], r1[i1+1]);
        addTri(r0[i0], r1[i1+1], r0[i0+1]);
      } else {
        addTri(r0[i0], r1[i1], r0[i0+1]);
        addTri(r0[i0+1], r1[i1], r1[i1+1]);
      }
      i0++;
      i1++;
    } else if (i0 < n0 - 1) {
      addTri(r0[i0], r1[i1], r0[i0+1]);
      i0++;
    } else {
      addTri(r0[i0], r1[i1], r1[i1+1]);
      i1++;
    }
  }
}

// 2. Western Flank (Side) Facets Triangulation
// Connects: front[0] -> side[0] -> side[1] -> side[2] -> rear[0]
for (let r = 0; r < rings.length - 1; r++) {
  const cur = rings[r];
  const next = rings[r + 1];

  // Facet tier 1: front silhouette to side[0]
  addQuad(cur.front[0], next.front[0], next.side[0], cur.side[0]);

  // Facet tier 2: side[0] to side[1]
  addQuad(cur.side[0], next.side[0], next.side[1], cur.side[1]);

  // Facet tier 3: side[1] to side[2]
  addQuad(cur.side[1], next.side[1], next.side[2], cur.side[2]);

  // Facet tier 4: side[2] to rear[0]
  addQuad(cur.side[2], next.side[2], next.rear[0], cur.rear[0]);
}

// 3. Rear Hull Facets Triangulation
for (let r = 0; r < rings.length - 1; r++) {
  const cur = rings[r];
  const next = rings[r + 1];
  addQuad(cur.rear[0], next.rear[0], next.rear[1], cur.rear[1]);
}

// 4. Right Perimeter Frame Seal
for (let r = 0; r < rings.length - 1; r++) {
  const cur = rings[r];
  const next = rings[r + 1];
  const curFrontRight = cur.front[cur.front.length - 1];
  const nextFrontRight = next.front[next.front.length - 1];
  const curRearRight = cur.rear[cur.rear.length - 1];
  const nextRearRight = next.rear[next.rear.length - 1];

  addQuad(curFrontRight, curRearRight, nextRearRight, nextFrontRight);
}

// 5. Apex Top Seal (Pinnacle cap)
const apexRing = rings[0];
const apexTipIdx = apexRing.front[0];
for (let i = 1; i < apexRing.front.length - 1; i++) {
  addTri(apexTipIdx, apexRing.front[i+1], apexRing.front[i]);
}
addTri(apexTipIdx, apexRing.side[0], apexRing.front[1]);
addTri(apexTipIdx, apexRing.side[1], apexRing.side[0]);
addTri(apexTipIdx, apexRing.side[2], apexRing.side[1]);
addTri(apexTipIdx, apexRing.rear[0], apexRing.side[2]);
addTri(apexTipIdx, apexRing.rear[1], apexRing.rear[0]);

// 6. Waterline Bottom Base Seal (Ring 32: y=960)
const baseRing = rings[rings.length - 1];
const baseFront = baseRing.front;
const baseSide = baseRing.side;
const baseRear = baseRing.rear;
const baseCenterIdx = baseRear[0];

for (let i = 0; i < baseFront.length - 1; i++) {
  addTri(baseCenterIdx, baseFront[i], baseFront[i+1]);
}
addTri(baseCenterIdx, baseSide[2], baseSide[1]);
addTri(baseCenterIdx, baseSide[1], baseSide[0]);
addTri(baseCenterIdx, baseSide[0], baseFront[0]);
addTri(baseCenterIdx, baseRear[1], baseFront[baseFront.length - 1]);

console.log(`Total Triangles: ${indices.length / 3}`);

// Compute smooth vertex normals
const vNormals = new Float32Array(vertices.length);
for (let i = 0; i < indices.length; i += 3) {
  const ia = indices[i], ib = indices[i + 1], ic = indices[i + 2];
  const ax = vertices[ia * 3], ay = vertices[ia * 3 + 1], az = vertices[ia * 3 + 2];
  const bx = vertices[ib * 3], by = vertices[ib * 3 + 1], bz = vertices[ib * 3 + 2];
  const cx = vertices[ic * 3], cy = vertices[ic * 3 + 1], cz = vertices[ic * 3 + 2];

  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;

  const nx = aby * acz - abz * acy;
  const ny = abz * acx - abx * acz;
  const nz = abx * acy - aby * acx;

  vNormals[ia * 3] += nx; vNormals[ia * 3 + 1] += ny; vNormals[ia * 3 + 2] += nz;
  vNormals[ib * 3] += nx; vNormals[ib * 3 + 1] += ny; vNormals[ib * 3 + 2] += nz;
  vNormals[ic * 3] += nx; vNormals[ic * 3 + 1] += ny; vNormals[ic * 3 + 2] += nz;
}

for (let i = 0; i < vNormals.length; i += 3) {
  const len = Math.hypot(vNormals[i], vNormals[i + 1], vNormals[i + 2]);
  if (len > 0.00001) {
    normals[i] = vNormals[i] / len;
    normals[i + 1] = vNormals[i + 1] / len;
    normals[i + 2] = vNormals[i + 2] / len;
  } else {
    normals[i] = 0; normals[i + 1] = 0; normals[i + 2] = 1;
  }
}

// Bounding box
let minX = 999, maxX = -999, minY = 999, maxY = -999, minZ = 999, maxZ = -999;
for (let i = 0; i < vertices.length; i += 3) {
  const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
  if (x < minX) minX = x; if (x > maxX) maxX = x;
  if (y < minY) minY = y; if (y > maxY) maxY = y;
  if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
}

console.log('Mesh Bounding Box:');
console.log(`X: [${minX.toFixed(3)}, ${maxX.toFixed(3)}] (Span: ${(maxX - minX).toFixed(3)})`);
console.log(`Y: [${minY.toFixed(3)}, ${maxY.toFixed(3)}] (Span: ${(maxY - minY).toFixed(3)})`);
console.log(`Z: [${minZ.toFixed(3)}, ${maxZ.toFixed(3)}] (Thickness: ${(maxZ - minZ).toFixed(3)})`);

// Validate Canonical Screen Projection of Front Vertices
let maxDriftPixels = 0;
for (let r = 0; r < rings.length; r++) {
  const fVerts = rings[r].front;
  for (const vIdx of fVerts) {
    const x3d = vertices[vIdx * 3];
    const y3d = vertices[vIdx * 3 + 1];
    const z3d = vertices[vIdx * 3 + 2];
    const dist = 2.0 - z3d;

    const ndcX = x3d / (dist * 0.5);
    const ndcY = y3d / (dist * 0.5);

    const screenU = ndcX * 0.5 + 0.5;
    const screenV = 0.5 - ndcY * 0.5;

    const origU = canonUvs[vIdx * 2];
    const origV = 1.0 - canonUvs[vIdx * 2 + 1];

    const drift = Math.hypot((screenU - origU) * 1024, (screenV - origV) * 1024);
    if (drift > maxDriftPixels) maxDriftPixels = drift;
  }
}
console.log(`Canonical Camera Front Vertex Projection Drift: ${maxDriftPixels.toFixed(5)} px`);

// Save Mesh Data
const meshData = {
  numVertices: vertices.length / 3,
  numTriangles: indices.length / 3,
  bounds: { minX, maxX, minY, maxY, minZ, maxZ, thickness: maxZ - minZ },
  maxCanonDriftPx: maxDriftPixels,
  positions: vertices,
  normals: normals,
  uvs: uvs,
  canonUvs: canonUvs,
  surfaceTypes: surfTypes,
  indices: indices
};

fs.writeFileSync(
  path.join(GEN_DIR, 'citadel-mesh-data.json'),
  JSON.stringify(meshData)
);
console.log(`Saved: citadel-mesh-data.json (${(JSON.stringify(meshData).length / 1024).toFixed(1)} KB)`);
