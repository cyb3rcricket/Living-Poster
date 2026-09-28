import * as THREE from 'three';
import { createPaintMeltMaterial } from '../shaders/paintMeltShader.js';
import { BrushstrokeParticles } from './brushstrokeParticles.js';

// ============================================================================
// Living Poster V1 — Paint Melt Controller
// Owns the 320x320 subdivided plane, melt shader, and brushstroke particles.
// Seamlessly unprojects the flat painting into 3D space.
// ============================================================================

export class PaintMeltEffect {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'lp-paint-melt-group';

    this.mesh = null;
    this.material = null;
    this.particles = null;
    this.isLoaded = false;
    this.isDisposed = false;

    this.subdivisions = 320;
  }

  async loadAssets(textureLoader) {
    const loader = textureLoader || new THREE.TextureLoader();

    const [texPoster, texSemantic] = await Promise.all([
      loader.loadAsync('/reference/poster.jpeg'),
      loader.loadAsync('/reference/experimental/living-poster-v1/melt-semantic-map.png'),
    ]);

    texPoster.colorSpace = THREE.SRGBColorSpace;
    texSemantic.colorSpace = THREE.NoColorSpace; // Data texture

    // Subdivided canvas plane
    // At canonical camera Z=2.0 and FOV=53.130102°, plane of size 2.0x2.0 at Z=0.0
    // fills the exact canonical frustum.
    const geo = new THREE.PlaneGeometry(2.0, 2.0, this.subdivisions, this.subdivisions);
    this.material = createPaintMeltMaterial({
      posterTexture: texPoster,
      semanticTexture: texSemantic,
    });

    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.set(0, 0, 0);
    this.mesh.name = 'lp-paint-melt-mesh';
    this.mesh.renderOrder = 2;
    this.group.add(this.mesh);

    // Brushstroke particles
    this.particles = new BrushstrokeParticles(450);
    this.group.add(this.particles.group);

    this.isLoaded = true;
    console.log('PaintMeltEffect initialized with 320x320 grid & 450 brushstroke particles.');
  }

  update(elapsed, camera) {
    if (!this.isLoaded || this.isDisposed) return;

    const timeSec = elapsed;

    // 0–1s: Untouched flat painting
    // 1–4s: Paint awakening (uAwaken: 0 -> 1)
    // 4–8s: GPU Paint melt (uMelt: 0 -> 1)
    // 7.8–8.5s: Threshold dissolve (uThresholdFade: 0 -> 1)
    const awaken = Math.min(1.0, Math.max(0.0, (timeSec - 1.0) / 3.0));
    const melt = Math.min(1.0, Math.max(0.0, (timeSec - 4.0) / 4.0));
    const thresholdFade = Math.min(1.0, Math.max(0.0, (timeSec - 7.6) / 0.8));

    if (this.material) {
      const u = this.material.uniforms;
      u.uTime.value = timeSec;
      u.uAwaken.value = awaken;
      u.uMelt.value = melt;
      u.uThresholdFade.value = thresholdFade;
      if (camera) {
        u.uCameraPos.value.copy(camera.position);
      }

      // Hide mesh completely once threshold cross is complete
      if (thresholdFade >= 0.999) {
        this.mesh.visible = false;
      } else {
        this.mesh.visible = true;
      }
    }

    if (this.particles) {
      this.particles.update(timeSec, camera);
    }
  }

  reset() {
    if (this.material) {
      const u = this.material.uniforms;
      u.uTime.value = 0.0;
      u.uAwaken.value = 0.0;
      u.uMelt.value = 0.0;
      u.uThresholdFade.value = 0.0;
    }
    if (this.mesh) {
      this.mesh.visible = true;
    }
  }

  dispose() {
    if (this.isDisposed) return;
    this.isDisposed = true;

    if (this.mesh) {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
      this.group.remove(this.mesh);
      this.mesh = null;
    }

    if (this.particles) {
      this.particles.dispose();
      this.group.remove(this.particles.group);
      this.particles = null;
    }

    this.group.clear();
    this.isLoaded = false;
  }
}
