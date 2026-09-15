import * as THREE from 'three';
import { createDepthMaterial } from './shaders/depthShader.js';

export class Prototype01 {
  constructor(renderer, container, showToast) {
    this.renderer = renderer;
    this.container = container;
    this.showToast = showToast;

    this.config = {
      depthStrength: 0.080,
      cameraPush: 0.120,
      parallaxStrength: 0.035,
      awakeningDuration: 5.0,
      technique: 0,           // 0 = Subdivided Mesh, 1 = POM
      displayMode: 0,         // 0 = Awakened, 1 = Flat, 2 = Depth Map
      parallaxEnabled: true,
      meshSubdivisions: 320,
    };

    this.state = {
      isAwakened: false,
      isTransitioning: false,
      transitionStartTime: 0,
      transitionProgress: 0.0,
      initialCamZ: 2.0,
      targetCamZ: 2.0,
      mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
      activeMode: 'awakened', // 'flat' | 'awakened' | 'map'
    };

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(53.130102, 1.0, 0.1, 100.0);
    this.camera.position.set(0, 0, this.state.initialCamZ);

    this.depthMesh = null;
    this.depthMaterial = null;
    this.isLoaded = false;
  }

  async loadAssets() {
    const textureLoader = new THREE.TextureLoader();
    const [posterTexture, depthTexture] = await Promise.all([
      textureLoader.loadAsync('/reference/poster.jpeg'),
      textureLoader.loadAsync('/reference/experimental/poster-depth-v1.png'),
    ]);

    const planeGeo = new THREE.PlaneGeometry(
      2.0, 2.0,
      this.config.meshSubdivisions,
      this.config.meshSubdivisions
    );

    this.depthMaterial = createDepthMaterial(posterTexture, depthTexture);
    this.depthMaterial.uniforms.uDepthStrength.value = this.config.depthStrength;
    this.depthMaterial.uniforms.uTechnique.value = this.config.technique;
    this.depthMaterial.uniforms.uTransition.value = 0.0;
    this.depthMaterial.uniforms.uDisplayMode.value = 0;

    this.depthMesh = new THREE.Mesh(planeGeo, this.depthMaterial);
    this.scene.add(this.depthMesh);
    this.isLoaded = true;
  }

  startAwakening() {
    if (this.state.isTransitioning) return;
    this.state.isTransitioning = true;
    this.state.transitionStartTime = performance.now();
    this.state.targetCamZ = this.state.initialCamZ - this.config.cameraPush;
    this.showToast('Awakening Painting...');
  }

  replayAwakening() {
    this.state.isAwakened = false;
    this.state.isTransitioning = true;
    this.state.transitionStartTime = performance.now();
    this.state.transitionProgress = 0.0;
    this.camera.position.set(0, 0, this.state.initialCamZ);
    this.camera.rotation.set(0, 0, 0);

    if (this.depthMaterial) {
      this.depthMaterial.uniforms.uTransition.value = 0.0;
    }

    this.setDisplayMode('awakened');
    this.showToast('Replaying Awakening (5.0s)...');
  }

  setDisplayMode(mode) {
    this.state.activeMode = mode;
    if (!this.depthMaterial) return;

    if (mode === 'flat') {
      this.depthMaterial.uniforms.uDisplayMode.value = 1;
      this.showToast('Mode: Original Flat Poster');
    } else if (mode === 'awakened') {
      this.depthMaterial.uniforms.uDisplayMode.value = 0;
      this.showToast('Mode: Awakened 3D Depth');
    } else if (mode === 'map') {
      this.depthMaterial.uniforms.uDisplayMode.value = 2;
      this.showToast('Mode: Depth Map Inspector');
    }
  }

  toggleFlatDepth() {
    if (this.state.activeMode === 'flat') {
      this.setDisplayMode('awakened');
    } else {
      this.setDisplayMode('flat');
    }
    return this.state.activeMode;
  }

  toggleDepthMap() {
    if (this.state.activeMode === 'map') {
      this.setDisplayMode('awakened');
    } else {
      this.setDisplayMode('map');
    }
    return this.state.activeMode;
  }

  toggleParallax() {
    this.config.parallaxEnabled = !this.config.parallaxEnabled;
    if (!this.config.parallaxEnabled) {
      this.state.mouse.targetX = 0;
      this.state.mouse.targetY = 0;
    }
    this.showToast(this.config.parallaxEnabled ? 'Parallax Enabled' : 'Parallax Disabled');
    return this.config.parallaxEnabled;
  }

  setTechnique(techIndex) {
    this.config.technique = techIndex;
    if (this.depthMaterial) {
      this.depthMaterial.uniforms.uTechnique.value = techIndex;
    }
    this.showToast(techIndex === 0 ? 'Technique: Subdivided Mesh' : 'Technique: Parallax Occlusion');
  }

  onPointerMove(normX, normY) {
    if (!this.state.isAwakened || !this.config.parallaxEnabled) return;
    this.state.mouse.targetX = Math.max(-1.5, Math.min(1.5, normX));
    this.state.mouse.targetY = Math.max(-1.5, Math.min(1.5, normY));
  }

  onResize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(now) {
    if (!this.isLoaded) return;

    // 1. Process Awakening Transition
    if (this.state.isTransitioning) {
      const elapsed = (now - this.state.transitionStartTime) / 1000.0;
      const t = Math.min(1.0, elapsed / this.config.awakeningDuration);
      const smoothT = t * t * (3.0 - 2.0 * t);
      this.state.transitionProgress = smoothT;

      if (this.depthMaterial) {
        this.depthMaterial.uniforms.uTransition.value = smoothT;
      }

      const currentCamZ = THREE.MathUtils.lerp(
        this.state.initialCamZ,
        this.state.initialCamZ - this.config.cameraPush,
        smoothT
      );
      this.camera.position.z = currentCamZ;

      if (t >= 1.0) {
        this.state.isTransitioning = false;
        this.state.isAwakened = true;
        this.state.targetCamZ = this.state.initialCamZ - this.config.cameraPush;
        this.showToast('Awakening Complete • Depth Active');
      }
    }

    // 2. Cursor Parallax
    if (this.state.isAwakened && this.config.parallaxEnabled && this.state.activeMode !== 'flat') {
      this.state.mouse.x = THREE.MathUtils.lerp(this.state.mouse.x, this.state.mouse.targetX, 0.05);
      this.state.mouse.y = THREE.MathUtils.lerp(this.state.mouse.y, this.state.mouse.targetY, 0.05);

      const maxShift = this.config.parallaxStrength;
      const maxTilt = this.config.parallaxStrength * 0.8;

      const targetX = -this.state.mouse.x * maxShift;
      const targetY = this.state.mouse.y * maxShift;
      const targetZ = this.state.targetCamZ;

      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetX, 0.06);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetY, 0.06);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetZ, 0.06);

      const targetRotX = -this.state.mouse.y * maxTilt;
      const targetRotY = -this.state.mouse.x * maxTilt;

      this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, targetRotX, 0.06);
      this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, targetRotY, 0.06);
    } else if (!this.state.isTransitioning) {
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, 0, 0.08);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, 0, 0.08);
      const zTarget = this.state.isAwakened && this.state.activeMode !== 'flat'
        ? this.state.initialCamZ - this.config.cameraPush
        : this.state.initialCamZ;
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, zTarget, 0.08);

      this.camera.rotation.x = THREE.MathUtils.lerp(this.camera.rotation.x, 0, 0.08);
      this.camera.rotation.y = THREE.MathUtils.lerp(this.camera.rotation.y, 0, 0.08);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
