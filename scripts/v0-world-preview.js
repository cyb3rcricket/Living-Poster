import * as THREE from 'three';
import { createLivingPosterWorld } from '../src/livingPosterWorld.js';

const canvas = document.getElementById('c');
const w = 1024;
const h = 1024;
canvas.width = w;
canvas.height = h;
canvas.style.width = `${w}px`;
canvas.style.height = `${h}px`;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(1);
renderer.setSize(w, h, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x0b1020, 1);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(53.130102, 1, 0.1, 200);
camera.position.set(-0.020, 0.003, 1.892);
camera.rotation.set(-0.004, 0.0175, 0);

const world = createLivingPosterWorld({ THREE, renderer, container: canvas, camera, scene });
scene.add(world.group);

const POSES = {
  canonical: { x: 0, y: 0, z: 2, rx: 0, ry: 0 },
  rest: { x: -0.020, y: 0.003, z: 1.892, rx: -0.004, ry: 0.0175 },
  lookLeft: { x: -0.020, y: 0.003, z: 1.892, rx: -0.004, ry: 0.087 },
  lookRight: { x: -0.020, y: 0.003, z: 1.892, rx: -0.004, ry: -0.052 },
  forward: { x: -0.020, y: 0.003, z: 1.780, rx: -0.01, ry: 0.0175 },
  leftChannel: { x: -0.085, y: 0.003, z: 1.850, rx: -0.004, ry: 0.06 },
  rightChannel: { x: 0.030, y: 0.003, z: 1.850, rx: -0.004, ry: -0.04 },
  lookDown: { x: -0.020, y: 0.003, z: 1.820, rx: -0.04, ry: 0.0175 },
};

function applyPose(name) {
  const p = POSES[name] || POSES.rest;
  camera.position.set(p.x, p.y, p.z);
  camera.rotation.set(p.rx, p.ry, 0);
  camera.updateMatrixWorld(true);
  world.update(0, camera);
  renderer.render(scene, camera);
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  world.update(dt, camera);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

window.__lpv0 = {
  world,
  camera,
  scene,
  renderer,
  poses: POSES,
  applyPose,
  getPose() {
    return {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      rx: camera.rotation.x,
      ry: camera.rotation.y,
    };
  },
};

world.loadAssets().then(() => {
  applyPose('rest');
  requestAnimationFrame(tick);
  console.log('V0 world preview ready', world.bounds, world.colliders);
});
