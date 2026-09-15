# Prototype 01 — Depth Awakening: Technical Notes

## 1. Technique Used

Prototype 01 tests whether `poster.jpeg` can begin as an apparently flat untouched artwork and then gradually acquire a convincing sense of physical depth while continuing to look like the same artwork.

To achieve this, we developed a **hybrid 2.5D depth-projection pipeline** implemented with Vite, Three.js, and custom GLSL shaders:

1. **Exact 1:1 Perspective Calibration**:
   - The virtual camera uses a calibrated field of view ($53.13^\circ$) and distance ($Z = 2.00$) such that a $2.0 \times 2.0$ image plane fits the square viewport with mathematical precision at transition progress $t = 0$.
   - At $t = 0$, displacement, overscan, and parallax offsets are strictly zero, guaranteeing a pixel-for-pixel match to `reference/poster.jpeg`.

2. **Depth Awakening Transformation ($t = 0 \rightarrow 1$)**:
   - Triggered by activating `ENTER`.
   - Over a configurable duration (default: 5.0 seconds), a cubic smoothstep easing function ($3t^2 - 2t^3$) drives two simultaneous transformations:
     - **Forward Camera Push**: The perspective camera glides forward from $Z = 2.00$ to $Z = 1.88$ ($\Delta Z = 0.12$). Through perspective projection, closer features naturally expand faster than distant celestial features.
     - **Z-Displacement on a Subdivided Mesh**: A finely subdivided mesh ($320 \times 320$ vertices, $\approx 102\text{k}$ vertices) is displaced along $+Z$ in view space:
       $$Z_{\text{displacement}} = \text{depth} \times \text{depthStrength} \times t$$
       Because displacement is anchored at the background plane ($Z = 0$), all geometry advances forward into perspective rather than pulling backward, completely eliminating edge tear or black void exposure.

3. **Dual Technique Evaluation**:
   - **Technique 0 (Default): Subdivided Mesh Displacement**: Genuine 3D vertex displacement rendered through Three.js's perspective projection matrix.
   - **Technique 1: Parallax Occlusion Mapping (POM)**: A screen-space raymarching shader that traces view rays through the height field per fragment. This allows comparing mesh-based vs. raymarched depth behaviors directly.

4. **Subtle Damped Cursor Parallax**:
   - Once awakening completes, restrained mouse parallax activates ($\pm 1.2^\circ$ pitch/yaw, $\pm 0.035$ camera shift).
   - Mouse movement is exponentially smoothed with a lerp factor of $0.05$ to ensure tranquil, hypnotic motion consistent with the emotional tone established in `POSTER_ANALYSIS.md`.

---

## 2. Generated Assets

All assets created for this experiment reside in the workspace:

1. **`reference/experimental/poster-depth-v1.png`** (1024 × 1024 px, 8-bit RGBA PNG, 134 KB):
   - Relative depth map created via `scripts/generate_depth_map.cjs`.
   - Respects the 5-plane spatial hierarchy established in `POSTER_ANALYSIS.md`:
     - **Plane 1 (Foreground Water)**: $\text{depth} \in [0.50, 1.00]$ (highest proximity at lower screen edge).
     - **Plane 2 (Near Crystals)**: Western Sentinel ($\text{depth} \approx 0.70\text{--}0.85$, closer to camera) and Solar Citadel ($\text{depth} \approx 0.56\text{--}0.72$).
     - **Plane 3 (Horizon Corridors)**: Open sea horizon ($\text{depth} \approx 0.48$), Midnight Needle ($\text{depth} \approx 0.46\text{--}0.50$), and Periphery Needle ($\text{depth} \approx 0.44$).
     - **Plane 4 (Atmospheric Auroras)**: Neon magenta ribbons ($\text{depth} \approx 0.31\text{--}0.36$). Visually positioned strictly *in front of* the giant celestial body and *behind* the crystal formations.
     - **Plane 5 (Deep Celestial Sky)**: The Umbral Giant planet disk ($\text{depth} \approx 0.17\text{--}0.23$ with subtle spherical dome curvature), Ember Moon ($\text{depth} \approx 0.08$), and Cosmic Void ($\text{depth} \approx 0.025$).

2. **`scripts/generate_depth_map.cjs`**:
   - Algorithmic segmentation and bilateral depth map generator reading `poster.jpeg`.

3. **`scripts/test_prototype.cjs`**:
   - Automated Headless Chrome test runner verifying visual states, transition smoothness, parallax, and hotkeys.

---

## 3. Current Parameters

The default parameters configured in `CONFIG` (`src/main.js`):

| Parameter | Default Value | Tunable Range | Purpose |
| :--- | :---: | :---: | :--- |
| `depthStrength` | `0.080` | `0.000` – `0.250` | Scale of physical Z-displacement. Kept restrained to avoid "rubber JPEG" distortion. |
| `cameraPush` | `0.120` | `0.000` – `0.300` | Distance the camera translates forward along $Z$ during awakening. |
| `parallaxStrength`| `0.035` | `0.000` – `0.100` | Amplitude of cursor-driven camera translation and angular tilt ($\sim 1.2^\circ$). |
| `awakeningDuration`| `5.0s` | `2.0s` – `10.0s` | Duration of the awakening ease-in curve. |
| `meshSubdivisions`| `320` | Fixed (320×320) | Grid resolution ($\approx 102,400$ vertices) providing smooth continuous deformation. |
| `overscan` | `1.04` (at $t=1$) | `1.00` – `1.04` | Dynamic margin expansion to prevent border exposure during parallax. |

---

## 4. Known Artifacts

Even with fine-tuning, monocular single-texture depth techniques have fundamental visual limits:

1. **Occlusion Stretching / "Curtain Effect" at Steep Silhouette Edges**:
   - *Where*: Along the sharp vertical perimeter of the Western Sentinel ($x \approx 21\%$) and the left shoulder of the Solar Citadel ($x \approx 69\%$), where depth drops precipitously from $0.80$ to $0.20$ (a 0.60 step).
   - *Behavior*: In the Subdivided Mesh technique, triangles spanning across the depth discontinuity stretch. At our default restrained strength (`0.080`), this is subtle from the primary view. However, if depth strength is turned up ($> 0.15$) or if the camera translates significantly, the edge begins stretching like a rubber sheet.
   - *POM Comparison*: The Parallax Occlusion Mapping technique avoids polygonal triangle stretching, but introduces localized stepping / ghosting when viewing rays attempt to see "around" the crystal where source texture pixels do not exist.

2. **Anamorphic Streak Parallax Incongruity**:
   - *Where*: The bright horizontal beam shooting from the Solstice Flare ($y \approx 17.5\%$).
   - *Behavior*: In 2D, this beam is an optical lens artifact across the sky. In 2.5D mesh displacement, it rests partly on the spire peak ($Z \approx +0.05$) and partly on the sky ($Z \approx 0$), causing subtle differential parallax across the beam during camera tilt.

3. **Water Surface Planar Discontinuity**:
   - *Where*: Horizon line ($y \approx 84.2\%$).
   - *Behavior*: Ground-plane perspective recession works convincingly in the near and mid ground, but without true procedural wave displacement, the water remains a sculpted 2.5D relief rather than a fluid medium.

---

## 5. What This Prototype Can Tell Us

1. **Feasibility of the "Depth Awakening" Sensation**:
   - **YES**. Starting from an untouched flat painting and smoothly transitioning into a 3D scene over 5 seconds is visually compelling. The moment of awakening feels magical: the painting organically acquires volume, the water expands towards the viewer, and the spires stand as towering monolithic presences.
2. **Acceptability of Continuous Transition Without Scene Cuts**:
   - The absence of crossfades, black dissolves, or scene swaps preserves the emotional connection to the artwork. The visitor never feels they left `poster.jpeg`.
3. **Preservation of the Painterly Aesthetic**:
   - Because the texture remains the untouched original painting, 100% of the painterly qualities (opaque wave foam, incandescent golden light spill, rich indigo shadows) are preserved. None of the sterility of generic PBR materials is introduced.
4. **Viability of Restrained Cursor Parallax**:
   - Damped, subtle parallax ($\le 1.5^\circ$) allows the viewer to explore the depth illusion without immediately exposing missing occlusion data.

---

## 6. What This Prototype Cannot Tell Us

1. **How to Build the Finished Explorable World**:
   - This prototype answers **only** the awakening question ("Can the flat artwork gain depth?").
   - It does **not** solve full 3D navigation. As soon as a virtual camera moves significantly forward ($Z > 0.5$) or orbits around the spires, unseen reverse faces, hidden ocean, and occluded sky behind the Citadel will be exposed.
2. **Permanent Rendering Engine Selection**:
   - Three.js was utilized here as a disposable prototyping tool. Whether the production architecture uses Three.js, WebGPU, custom WebGL, or hybrid layered rendering remains an open pre-production question.
3. **True Volumetric Phenomena**:
   - The aurora ribbons and Solstice flare in this prototype are 2.5D surfaces rather than true volumetric light fields or dynamic particle systems.
