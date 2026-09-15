import * as THREE from 'three';

// ============================================================================
// Prototype 03 — Invisible Handoff
// Technical Experiment: Seamless transition from monocular depth awakening
// (Prototype 01) into independent spatial proxy reconstruction (Prototype 02)
// before rubber-sheet / curtain stretching becomes perceptible.
// ============================================================================

export class Prototype03 {
  constructor(renderer, container, showToast) {
    this.renderer = renderer;
    this.container = container;
    this.showToast = showToast;

    // Canonical Camera Baseline
    this.canonicalCamPos = new THREE.Vector3(0, 0, 2.0);
    this.canonicalFov = 53.130102; // At Z=2, plane of height 2 fills viewport

    // Tunable Configuration Parameters
    this.config = {
      totalDuration: 7.0,          // Total awakening sequence duration (seconds)
      p1MaxDepth: 0.025,           // Maximum depth displacement in P01 before handoff (calibrated for subpixel alignment)
      cameraPush: 0.080,           // Maximum camera push along Z
      handoffStart: 0.30,          // Master progress where P02 starts phasing in
      handoffEnd: 0.70,            // Master progress where P01 is completely phased out
      spatialUnlockStart: 0.65,    // Progress where real spatial parallax translation begins
      finalParallaxShift: 0.045,   // Amplitude of spatial translation at complete
      finalParallaxTilt: 0.020,    // Amplitude of angular tilt at complete
      diagnosticMode: 'normal',    // 'normal' | 'p1' | 'p2' | 'overlay' | 'diff'
      diffGain: 6.0,               // Difference visualization gain
      soloMode: false,             // Loop handoff window continuously [0.25, 0.75]
      soloSpeed: 0.35,             // Solo oscillation frequency (Hz)
      meshSubdivisions: 320,       // Mesh density for P01 depth relief
    };

    // State Machine
    // States: 'IDLE' | 'AWAKENING' | 'HANDOFF' | 'SPATIAL_UNLOCK' | 'COMPLETE'
    this.state = {
      currentStage: 'IDLE',
      masterProgress: 0.0,         // Normalized 0.00 to 1.00
      isPlaying: false,
      startTime: 0,
      pausedAtProgress: 0.0,
      p1Weight: 1.0,
      p2Weight: 0.0,
      mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
      isLoaded: false,
      fps: 60,
      frameTimeMs: 16.6,
      maxDriftPx: 0.0,
      landmarks: {
        sentinel: { name: 'Western Sentinel', drift: 0 },
        citadelApex: { name: 'Citadel Apex', drift: 0 },
        citadelShoulder: { name: 'Citadel Shoulder', drift: 0 },
        needle: { name: 'Midnight Needle', drift: 0 },
        horizon: { name: 'Water Horizon', drift: 0 },
        flare: { name: 'Solstice Flare', drift: 0 },
      }
    };

    // Landmark Definitions for Automated Alignment Telemetry
    this.landmarkDefs = [
      { id: 'sentinel', name: 'Western Sentinel', u: 0.140, v: 0.360, dMap: 0.714, p2Z: 1.25 },
      { id: 'citadelApex', name: 'Solar Citadel Apex', u: 0.818, v: 0.171, dMap: 0.580, p2Z: 0.95 },
      { id: 'citadelShoulder', name: 'Citadel Shoulder', u: 0.690, v: 0.460, dMap: 0.616, p2Z: 0.95 },
      { id: 'needle', name: 'Midnight Needle', u: 0.545, v: 0.675, dMap: 0.463, p2Z: 0.65 },
      { id: 'horizon', name: 'Water Horizon', u: 0.500, v: 0.842, dMap: 0.486, p2Z: 0.65 },
      { id: 'flare', name: 'Solstice Flare', u: 0.818, v: 0.171, dMap: 0.580, p2Z: 0.95 },
    ];

    // Shared Camera
    this.camera = new THREE.PerspectiveCamera(this.canonicalFov, 1.0, 0.1, 100.0);
    this.camera.position.copy(this.canonicalCamPos);

    // Scenes
    this.p01Scene = new THREE.Scene();
    this.p02Scene = new THREE.Scene();
    this.compositeScene = new THREE.Scene();
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Render Targets for Offscreen Dual-Compositing Pass
    const w = container.clientWidth || 1024;
    const h = container.clientHeight || 1024;
    const dpr = Math.min(window.devicePixelRatio, 2.0);
    const rtWidth = Math.round(w * dpr);
    const rtHeight = Math.round(h * dpr);

    const rtOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      stencilBuffer: false,
      depthBuffer: true,
    };

    this.rtP01 = new THREE.WebGLRenderTarget(rtWidth, rtHeight, rtOptions);
    this.rtP02 = new THREE.WebGLRenderTarget(rtWidth, rtHeight, rtOptions);
    this.rtP01.texture.colorSpace = THREE.LinearSRGBColorSpace;
    this.rtP02.texture.colorSpace = THREE.LinearSRGBColorSpace;

    // Build Compositing Fullscreen Quad
    this.compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        #include <common>
        varying vec2 vUv;
        uniform sampler2D uTexP01;
        uniform sampler2D uTexP02;
        uniform float uWeightP01;
        uniform float uWeightP02;
        uniform int uDiagnosticMode; // 0=NORMAL, 1=P01_ONLY, 2=P02_ONLY, 3=OVERLAY_50_50, 4=DIFFERENCE
        uniform float uDiffGain;

        void main() {
          vec4 c1 = texture2D(uTexP01, vUv);
          vec4 c2 = texture2D(uTexP02, vUv);

          if (uDiagnosticMode == 1) {
            gl_FragColor = c1;
          } else if (uDiagnosticMode == 2) {
            gl_FragColor = c2;
          } else if (uDiagnosticMode == 3) {
            gl_FragColor = vec4(mix(c1.rgb, c2.rgb, 0.5), 1.0);
          } else if (uDiagnosticMode == 4) {
            vec3 diff = abs(c1.rgb - c2.rgb) * uDiffGain;
            gl_FragColor = vec4(diff, 1.0);
          } else {
            // NORMAL mode: synchronized opacity crossfade
            vec3 col = c1.rgb * uWeightP01 + c2.rgb * uWeightP02;
            gl_FragColor = vec4(col, 1.0);
          }

          #include <colorspace_fragment>
        }
      `,
      uniforms: {
        uTexP01: { value: this.rtP01.texture },
        uTexP02: { value: this.rtP02.texture },
        uWeightP01: { value: 1.0 },
        uWeightP02: { value: 0.0 },
        uDiagnosticMode: { value: 0 },
        uDiffGain: { value: this.config.diffGain },
      },
      depthTest: false,
      depthWrite: false,
    });

    const quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.compositeMaterial);
    this.compositeScene.add(quadMesh);

    // Frame Telemetry Accumulators
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsTimer = performance.now();
  }

  async loadAssets() {
    const textureLoader = new THREE.TextureLoader();

    const [
      texPoster,
      texDepth,
      texSky,
      texRibbons,
      texSentinel,
      texCitadel,
      texNeedles,
      texWater,
    ] = await Promise.all([
      textureLoader.loadAsync('/reference/poster.jpeg'),
      textureLoader.loadAsync('/reference/experimental/poster-depth-v1.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-a-deep-sky.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-b-ribbons.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-c-sentinel.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-d-citadel.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-e-needles.png'),
      textureLoader.loadAsync('/reference/experimental/prototype-02/layer-f-water.png'),
    ]);

    // Ensure sRGB color space on all textures
    const textures = [texPoster, texSky, texRibbons, texSentinel, texCitadel, texNeedles, texWater];
    for (const t of textures) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
    }
    texDepth.minFilter = THREE.LinearFilter;
    texDepth.magFilter = THREE.LinearFilter;
    texDepth.wrapS = THREE.ClampToEdgeWrapping;
    texDepth.wrapT = THREE.ClampToEdgeWrapping;

    this.textures = {
      poster: texPoster,
      depth: texDepth,
      sky: texSky,
      ribbons: texRibbons,
      sentinel: texSentinel,
      citadel: texCitadel,
      needles: texNeedles,
      water: texWater,
    };

    // 1. Build Prototype 01 Mesh & Shader
    this.buildP01Scene();

    // 2. Build Prototype 02 Proxies
    this.buildP02Scene();

    this.state.isLoaded = true;
    console.log('Prototype 03 Invisible Handoff initialized.');
  }

  buildP01Scene() {
    const planeGeo = new THREE.PlaneGeometry(
      2.0, 2.0,
      this.config.meshSubdivisions,
      this.config.meshSubdivisions
    );

    // Custom depth shader for P01
    // CRITICAL: uOverscan is strictly 1.0 (no UV scale distortion) to ensure
    // pixel-for-pixel mathematical registration with P02 proxy cards.
    this.p01Material = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        uniform sampler2D uDepthMap;
        uniform float uAwakenProgress; // 0.0 to 1.0
        uniform float uDepthStrength; // restrained, e.g. 0.035

        void main() {
          vUv = uv;
          vec3 pos = position;
          float d = texture2D(uDepthMap, uv).r;
          pos.z += d * uDepthStrength * uAwakenProgress;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        #include <common>
        varying vec2 vUv;
        uniform sampler2D uTexture;

        void main() {
          gl_FragColor = texture2D(uTexture, vUv);
          #include <colorspace_fragment>
        }
      `,
      uniforms: {
        uTexture: { value: this.textures.poster },
        uDepthMap: { value: this.textures.depth },
        uAwakenProgress: { value: 0.0 },
        uDepthStrength: { value: this.config.p1MaxDepth },
      },
      depthTest: true,
      depthWrite: true,
      side: THREE.FrontSide,
    });

    this.p01Mesh = new THREE.Mesh(planeGeo, this.p01Material);
    this.p01Scene.add(this.p01Mesh);
  }

  buildP02Scene() {
    this.p02Group = new THREE.Group();
    this.p02Scene.add(this.p02Group);

    // Layer Depths (Z positions along view axis)
    this.p02Depths = {
      sky: 0.00,
      ribbons: 0.40,
      needles: 0.65,
      citadel: 0.95,
      water: 1.15,
      sentinel: 1.25,
    };

    const createProxyCard = (texture, zDepth, renderOrder) => {
      const dist = this.canonicalCamPos.z - zDepth;
      const size = dist; // Frustum scaling: with FOV=53.13°, size=dist fills viewport exactly
      const geo = new THREE.PlaneGeometry(size, size);
      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: true,
        depthWrite: renderOrder === 1, // Deep sky writes depth
        blending: THREE.NormalBlending,
        side: THREE.FrontSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 0, zDepth);
      mesh.renderOrder = renderOrder;
      return mesh;
    };

    // Construct calibrated proxy cards
    this.p02Meshes = {
      sky: createProxyCard(this.textures.sky, this.p02Depths.sky, 1),
      ribbons: createProxyCard(this.textures.ribbons, this.p02Depths.ribbons, 2),
      needles: createProxyCard(this.textures.needles, this.p02Depths.needles, 3),
      citadel: createProxyCard(this.textures.citadel, this.p02Depths.citadel, 4),
      water: createProxyCard(this.textures.water, this.p02Depths.water, 5),
      sentinel: createProxyCard(this.textures.sentinel, this.p02Depths.sentinel, 6),
    };

    this.p02Group.add(this.p02Meshes.sky);
    this.p02Group.add(this.p02Meshes.ribbons);
    this.p02Group.add(this.p02Meshes.needles);
    this.p02Group.add(this.p02Meshes.citadel);
    this.p02Group.add(this.p02Meshes.water);
    this.p02Group.add(this.p02Meshes.sentinel);
  }

  startAwakening() {
    this.state.isPlaying = true;
    this.state.startTime = performance.now() - (this.state.masterProgress * this.config.totalDuration * 1000);
    this.config.soloMode = false;
    this.showToast('Transformation Initiated: One Continuous Breath');
  }

  replay() {
    this.state.isPlaying = true;
    this.state.masterProgress = 0.0;
    this.state.startTime = performance.now();
    this.config.soloMode = false;
    this.camera.position.copy(this.canonicalCamPos);
    this.camera.rotation.set(0, 0, 0);
    this.showToast(`Replaying Prototype 03 (${this.config.totalDuration.toFixed(1)}s)...`);
  }

  togglePlayPause() {
    this.state.isPlaying = !this.state.isPlaying;
    if (this.state.isPlaying) {
      this.state.startTime = performance.now() - (this.state.masterProgress * this.config.totalDuration * 1000);
      this.showToast('Transition Resumed');
    } else {
      this.showToast(`Paused at Progress: ${(this.state.masterProgress * 100).toFixed(1)}%`);
    }
    return this.state.isPlaying;
  }

  toggleSoloMode() {
    this.config.soloMode = !this.config.soloMode;
    if (this.config.soloMode) {
      this.state.isPlaying = true;
      this.showToast('Handoff Solo Mode: ACTIVE (Looping Window [0.25, 0.75])');
    } else {
      this.showToast('Handoff Solo Mode: PAUSED');
    }
    return this.config.soloMode;
  }

  setMasterProgress(p) {
    this.state.masterProgress = Math.max(0.0, Math.min(1.0, p));
    this.state.startTime = performance.now() - (this.state.masterProgress * this.config.totalDuration * 1000);
  }

  setDiagnosticMode(mode) {
    this.config.diagnosticMode = mode;
    const modeMap = { normal: 0, p1: 1, p2: 2, overlay: 3, diff: 4 };
    this.compositeMaterial.uniforms.uDiagnosticMode.value = modeMap[mode] || 0;

    const titles = {
      normal: 'Diagnostic: NORMAL (Seamless Blend)',
      p1: 'Diagnostic: P01 ONLY (Awakening Mesh)',
      p2: 'Diagnostic: P02 ONLY (Proxy Reconstruction)',
      overlay: 'Diagnostic: 50/50 OVERLAY (Alignment Check)',
      diff: 'Diagnostic: DIFFERENCE MAP (|P01 - P02|)',
    };
    this.showToast(titles[mode] || mode);
  }

  cycleDiagnosticMode() {
    const modes = ['normal', 'overlay', 'diff', 'p1', 'p2'];
    const nextIdx = (modes.indexOf(this.config.diagnosticMode) + 1) % modes.length;
    this.setDiagnosticMode(modes[nextIdx]);
    return modes[nextIdx];
  }

  onPointerMove(normX, normY) {
    this.state.mouse.targetX = Math.max(-1.5, Math.min(1.5, normX));
    this.state.mouse.targetY = Math.max(-1.5, Math.min(1.5, normY));
  }

  onResize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const dpr = Math.min(window.devicePixelRatio, 2.0);
    const rtWidth = Math.round(width * dpr);
    const rtHeight = Math.round(height * dpr);
    this.rtP01.setSize(rtWidth, rtHeight);
    this.rtP02.setSize(rtWidth, rtHeight);
  }

  update(now) {
    if (!this.state.isLoaded) return;

    // 1. Telemetry / Frame Performance Monitoring
    const deltaMs = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.state.frameTimeMs = deltaMs;
    this.frameCount++;
    if (now - this.fpsTimer >= 500) {
      this.state.fps = Math.round((this.frameCount * 1000) / (now - this.fpsTimer));
      this.frameCount = 0;
      this.fpsTimer = now;
    }

    // 2. Master Progress Calculation
    if (this.config.soloMode) {
      // Loop smoothly back and forth across the handoff window [0.25, 0.75]
      const elapsedSec = now / 1000.0;
      const wave = Math.sin(elapsedSec * this.config.soloSpeed * Math.PI * 2.0);
      this.state.masterProgress = 0.50 + wave * 0.25;
    } else if (this.state.isPlaying) {
      const elapsed = (now - this.state.startTime) / 1000.0;
      const rawProgress = Math.min(1.0, elapsed / this.config.totalDuration);

      // Continuous tranquil easing (one breath: cubic smoothstep)
      this.state.masterProgress = rawProgress * rawProgress * (3.0 - 2.0 * rawProgress);

      if (rawProgress >= 1.0) {
        this.state.isPlaying = false;
        this.state.masterProgress = 1.0;
        this.state.currentStage = 'COMPLETE';
        this.showToast('Transformation Complete • Spatial Parallax Unlocked');
      }
    }

    const p = this.state.masterProgress;

    // 3. State Machine Classification
    const hStart = this.config.handoffStart;
    const hEnd = this.config.handoffEnd;
    const sStart = this.config.spatialUnlockStart;

    if (p <= 0.0001) {
      this.state.currentStage = 'IDLE';
    } else if (p < hStart) {
      this.state.currentStage = 'AWAKENING';
    } else if (p <= hEnd) {
      this.state.currentStage = 'HANDOFF';
    } else if (p < 1.0) {
      this.state.currentStage = 'SPATIAL_UNLOCK';
    } else {
      this.state.currentStage = 'COMPLETE';
    }

    // 4. Dual-System Opacity Weights (Synchronized Crossfade Curve)
    if (p <= hStart) {
      this.state.p1Weight = 1.0;
      this.state.p2Weight = 0.0;
    } else if (p >= hEnd) {
      this.state.p1Weight = 0.0;
      this.state.p2Weight = 1.0;
    } else {
      const tHandoff = (p - hStart) / (hEnd - hStart);
      // Smooth continuous S-curve blend
      const smoothHandoff = tHandoff * tHandoff * (3.0 - 2.0 * tHandoff);
      this.state.p1Weight = 1.0 - smoothHandoff;
      this.state.p2Weight = smoothHandoff;
    }

    // 5. Prototype 01 Depth Displacement Driving
    // Ramp displacement up gently during early awakening to avoid rubber-sheet distortion
    const p1AwakenNorm = Math.min(1.0, p / hStart);
    const p1Ease = p1AwakenNorm * p1AwakenNorm * (3.0 - 2.0 * p1AwakenNorm);
    this.p01Material.uniforms.uAwakenProgress.value = p1Ease;
    this.p01Material.uniforms.uDepthStrength.value = this.config.p1MaxDepth;

    // 6. Camera Transform Calculation
    // Forward Camera Push:
    // Glides gently from canonical Z=2.00 to (2.00 - cameraPush)
    // Synchronized across both systems so there is zero scale jump.
    let currentCamPush = 0.0;
    if (p <= hStart) {
      // Early awakening: subtle initial camera advance (~10% of total push = ~0.008)
      const t = p / hStart;
      currentCamPush = this.config.cameraPush * 0.10 * (t * t * (3.0 - 2.0 * t));
    } else if (p <= hEnd) {
      // Handoff window: gentle linear-smooth glide (~10% -> ~20% of total push = ~0.016)
      const t = (p - hStart) / (hEnd - hStart);
      const startPush = this.config.cameraPush * 0.10;
      const endPush = this.config.cameraPush * 0.20;
      currentCamPush = startPush + (endPush - startPush) * (t * t * (3.0 - 2.0 * t));
    } else {
      // Spatial unlock: camera glides smoothly to full push
      const t = (p - hEnd) / (1.0 - hEnd);
      const startPush = this.config.cameraPush * 0.20;
      currentCamPush = startPush + (this.config.cameraPush - startPush) * (t * t * (3.0 - 2.0 * t));
    }

    // Lateral Parallax & Angular Tilt (Real Spatial Unlock):
    // Zero lateral motion before spatialUnlockStart to guarantee bit-perfect handoff registration.
    let shiftX = 0;
    let shiftY = 0;
    let tiltX = 0;
    let tiltY = 0;

    if (p >= sStart) {
      const unlockProgress = (p - sStart) / (1.0 - sStart);
      const unlockEase = unlockProgress * unlockProgress * (3.0 - 2.0 * unlockProgress);

      if (this.state.currentStage === 'COMPLETE') {
        // Complete state: restrained mouse cursor parallax
        this.state.mouse.x = THREE.MathUtils.lerp(this.state.mouse.x, this.state.mouse.targetX, 0.05);
        this.state.mouse.y = THREE.MathUtils.lerp(this.state.mouse.y, this.state.mouse.targetY, 0.05);

        shiftX = -this.state.mouse.x * this.config.finalParallaxShift;
        shiftY = this.state.mouse.y * this.config.finalParallaxShift;
        tiltX = -this.state.mouse.y * this.config.finalParallaxTilt;
        tiltY = -this.state.mouse.x * this.config.finalParallaxTilt;
      } else {
        // Spatial unlock emergence: smooth subtle automated sweep demonstrating genuine spatial depth
        const driftAngle = unlockEase * Math.PI;
        shiftX = Math.sin(driftAngle) * (this.config.finalParallaxShift * 0.65);
        shiftY = Math.sin(driftAngle * 0.5) * (this.config.finalParallaxShift * 0.20);
        tiltY = -shiftX * (this.config.finalParallaxTilt / this.config.finalParallaxShift);
        tiltX = -shiftY * (this.config.finalParallaxTilt / this.config.finalParallaxShift);
      }
    }

    const targetCamX = shiftX;
    const targetCamY = shiftY;
    const targetCamZ = this.canonicalCamPos.z - currentCamPush;

    this.camera.position.set(targetCamX, targetCamY, targetCamZ);
    this.camera.rotation.set(tiltX, tiltY, 0);
    this.camera.updateMatrixWorld(true);

    // 7. Automated Landmark Alignment Assistance Telemetry
    this.computeLandmarkTelemetry();

    // 8. Render Pipeline
    this.renderPasses();
  }

  computeLandmarkTelemetry() {
    const W = this.container.clientWidth || 1024;
    const H = this.container.clientHeight || 1024;
    let maxDrift = 0.0;

    for (const lm of this.landmarkDefs) {
      // 1. Project landmark from Prototype 02 proxy card
      const cardSize = 2.0 - lm.p2Z;
      const posP2 = new THREE.Vector3(
        (lm.u - 0.5) * cardSize,
        (0.5 - lm.v) * cardSize,
        lm.p2Z
      );
      posP2.project(this.camera);
      const pxP2X = (posP2.x + 1.0) * 0.5 * W;
      const pxP2Y = (1.0 - posP2.y) * 0.5 * H;

      // 2. Project landmark from Prototype 01 displaced mesh
      const zDisp = lm.dMap * this.config.p1MaxDepth * this.p01Material.uniforms.uAwakenProgress.value;
      const posP1 = new THREE.Vector3(
        (lm.u - 0.5) * 2.0,
        (0.5 - lm.v) * 2.0,
        zDisp
      );
      posP1.project(this.camera);
      const pxP1X = (posP1.x + 1.0) * 0.5 * W;
      const pxP1Y = (1.0 - posP1.y) * 0.5 * H;

      const drift = Math.hypot(pxP1X - pxP2X, pxP1Y - pxP2Y);
      this.state.landmarks[lm.id] = {
        name: lm.name,
        drift: drift,
        p1: { x: pxP1X, y: pxP1Y },
        p2: { x: pxP2X, y: pxP2Y },
      };

      if (drift > maxDrift) {
        maxDrift = drift;
      }
    }

    this.state.maxDriftPx = maxDrift;
  }

  renderPasses() {
    const diag = this.config.diagnosticMode;
    const p1Weight = this.state.p1Weight;
    const p2Weight = this.state.p2Weight;

    // Fast-path bypass when only one scene contributes and no diagnostic difference is active
    if (diag === 'p1' || (diag === 'normal' && p2Weight <= 0.0001)) {
      // Pure Prototype 01 render pass
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.p01Scene, this.camera);
      return;
    }

    if (diag === 'p2' || (diag === 'normal' && p1Weight <= 0.0001)) {
      // Pure Prototype 02 render pass
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.p02Scene, this.camera);
      return;
    }

    // Dual Render Target Offscreen Pass (Handoff Window / 50-50 Overlay / Difference Map)
    // Pass 1: Render Prototype 01 to RenderTarget 1
    this.renderer.setRenderTarget(this.rtP01);
    this.renderer.clear();
    this.renderer.render(this.p01Scene, this.camera);

    // Pass 2: Render Prototype 02 to RenderTarget 2
    this.renderer.setRenderTarget(this.rtP02);
    this.renderer.clear();
    this.renderer.render(this.p02Scene, this.camera);

    // Pass 3: Composite Pass on Fullscreen Quad
    this.renderer.setRenderTarget(null);
    this.compositeMaterial.uniforms.uWeightP01.value = p1Weight;
    this.compositeMaterial.uniforms.uWeightP02.value = p2Weight;
    this.renderer.render(this.compositeScene, this.orthoCamera);
  }
}
