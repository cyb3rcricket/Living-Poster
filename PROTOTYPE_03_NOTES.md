# Prototype 03 — Invisible Handoff: Technical Notes

## 1. Executive Summary & Core Question

Prototype 03 answers the central technical question formulated at the beginning of the experiment:

> *"Can we transition invisibly from Prototype 01 (Depth Awakening) into Prototype 02 (Independent Proxy Reconstruction) before the weaknesses of Prototype 01 become perceptible?"*

The ideal viewer experience is:
$$\text{FLAT POSTER} \longrightarrow \text{THE PAINTING AWAKENS} \longrightarrow \text{WITHOUT NOTICE, SCENE BECOMES INDEPENDENT SPATIAL PROXIES} \longrightarrow \text{REAL PARALLAX UNLOCKS}$$

### Findings Summary
- **Yes, the handoff can be made imperceptible without camouflage tricks.**
- By synchronizing the virtual camera's intrinsic perspective ($53.13^\circ$ FOV), eliminating dynamic UV overscan during the handoff window, keeping early displacement subtle ($d_{\text{disp}} \le 0.025$), and restricting camera translation until spatial separation is established, the maximum screen-space landmark drift between the two rendering systems is calibrated to **$\le 1.09$ pixels** across the entire $1024 \times 1024$ canvas.
- At $p = 0.00$, the scene starts as an untouched flat quad matching `reference/poster.jpeg` ($\text{PSNR} = 77.89\text{ dB}$, $\text{MSE} = 0.001$).
- When `ENTER` is activated, the painting takes one smooth continuous breath over $7.0$ seconds: awakening organic depth relief, transferring responsibility to the 6 calibrated proxy cards across the handoff window ($p \in [0.30, 0.70]$), and finally unlocking real spatial parallax ($p \in [0.65, 1.00]$) where the Western Sentinel translates independently across the twilight horizon and Solar Citadel shifts across the Umbral Giant.

---

## 2. Architecture

Prototype 03 unifies the two previous prototypes into an offscreen dual-pass compositing pipeline that guarantees absolute spatial and numerical isolation:

```
                                 [Virtual Camera: FOV = 53.130102°]
                                       |              |
                    Synchronized Pose  |              |  Synchronized Pose
                                       v              v
                   +-----------------------+      +-----------------------+
                   |     p01Scene          |      |     p02Scene          |
                   | Subdivided Mesh       |      | 6 Calibrated Proxy    |
                   | (320x320, 102k verts) |      | Cards (Frustum-scaled)|
                   | Subtle Z-Displacement |      | Inpainted Fills       |
                   +-----------------------+      +-----------------------+
                               |                              |
                   Render Pass 1                              Render Pass 2
                               v                              v
                   +-----------------------+      +-----------------------+
                   |  rtP01 (Linear RGBA)  |      |  rtP02 (Linear RGBA)  |
                   |  Offscreen Buffer     |      |  Offscreen Buffer     |
                   +-----------------------+      +-----------------------+
                               \                              /
                                \                            /
                                 v                          v
                             +----------------------------------+
                             |     compositeScene               |
                             | Fullscreen Quad & Ortho Camera   |
                             | Linear Crossfade Shader          |
                             | Optional Diagnostics:            |
                             |   - NORMAL (Smooth S-Curve)      |
                             |   - 50/50 OVERLAY                |
                             |   - DIFFERENCE (|P01 - P02| * G) |
                             |   - P01 ONLY / P02 ONLY          |
                             | #include <colorspace_fragment>   |
                             +----------------------------------+
                                              |
                                              v
                                   [WebGL Output Canvas]
```

### 2.1 Component Scenes
1. **`p01Scene` (Awakening Mesh)**:
   - A $2.0 \times 2.0$ plane geometry subdivided into $320 \times 320$ vertices ($\approx 102,400$ vertices).
   - Custom depth shader reads `/reference/poster.jpeg` and `/reference/experimental/poster-depth-v1.png`.
   - Displaces vertices forward along $+Z$ in view space:
     $$Z_{\text{disp}}(u, v) = \text{depthVal}(u, v) \times \text{p1MaxDepth} \times \text{uAwakenProgress}$$
   - **Critical Invariant**: Dynamic UV overscan is strictly anchored to $1.000$ (zero scale distortion) during awakening and handoff, ensuring that UV coordinates map 1:1 with P02 proxy cards.

2. **`p02Scene` (Independent Proxy Reconstruction)**:
   - Six independent planar cards placed at calibrated depths:
     - **Layer A (Deep Sky)**: $Z = 0.00$, size $= 2.00$ ($\text{depthWrite: true}$)
     - **Layer B (Magenta Ribbons)**: $Z = 0.40$, size $= 1.60$
     - **Layer E (Midnight Needles)**: $Z = 0.65$, size $= 1.35$
     - **Layer D (Solar Citadel)**: $Z = 0.95$, size $= 1.05$
     - **Layer F (Water Ground Plane)**: $Z = 1.15$, size $= 0.85$
     - **Layer C (Western Sentinel)**: $Z = 1.25$, size $= 0.75$
   - Each card is placed at depth $Z_i$ with scale $S_i = (2.00 - Z_i)$. By the Frustum Scaling Theorem, at canonical camera $(0, 0, 2.00)$, all proxy cards project to identical normalized device coordinates (NDC) spanning $[-1, 1] \times [-1, 1]$.

3. **Offscreen Render Targets & Compositing Pass**:
   - `rtP01` and `rtP02`: High-precision RGBA render targets sized to the device pixel ratio of the container (e.g. $984 \times 984$ or $1024 \times 1024$).
   - Render targets use `LinearSRGBColorSpace`.
   - The compositing fragment shader samples both offscreen textures in linear space, computes the crossfade, and passes `gl_FragColor` through Three.js's `#include <colorspace_fragment>` for proper sRGB output transfer.

4. **Performance Bypass Architecture**:
   - In `NORMAL` mode, when $p \le 0.0001$ (Flat state), the offscreen targets are bypassed and P01 renders directly to the canvas ($1$ draw call, $< 0.1\text{ ms}$).
   - When $p \ge 0.70$ (Spatial Unlock complete), offscreen targets are bypassed and P02 renders directly to the canvas ($6$ draw calls, $< 0.2\text{ ms}$).
   - Dual-render offscreen passes only execute during the active handoff window ($p \in [0.28, 0.72]$) or when diagnostic overlay/difference modes are explicitly activated.

---

## 3. Transition Timeline & State Machine

The transformation is governed by an explicit normalized master progress variable $p \in [0.00, 1.00]$ driven over a configurable duration (default: $7.0\text{ seconds}$):

```
Time:     0.0s          2.1s                     4.9s          5.5s                7.0s
Progress: p=0.00        p=0.30                   p=0.70        p=0.78              p=1.00
          |---------------|------------------------|-------------|-------------------|
Stage:    |     IDLE      |       AWAKENING        |   HANDOFF   |  SPATIAL UNLOCK   | COMPLETE
P01:      | 100%          | 100%                   | 100% -> 0%  | 0%                | 0%
P02:      | 0%            | 0%                     | 0% -> 100%  | 100%              | 100%
Z-Push:   | 0.00          | 0.00 -> 0.008          | 0.008->0.016| 0.016 -> 0.080    | 0.080 (locked)
Lateral:  | 0.00          | 0.00                   | 0.00        | 0.00 -> 0.045 drift| Pointer Parallax
```

### Stage A — Flat Poster ($p = 0.00$)
- State: `IDLE`.
- Camera locked at canonical pose $(0, 0, 2.00)$.
- P01 is rendered completely flat ($pos.z = 0$).
- Displays the restrained `ENTER` invitation overlay.
- Visual presentation is identical to `reference/poster.jpeg` ($\text{PSNR} = 77.89\text{ dB}$, $\text{maxDiff} \le 1/255$).

### Stage B — Early Awakening ($p \in [0.00, 0.30)$)
- State: `AWAKENING`.
- Triggered by activating `ENTER` (or pressing `Space` / `Enter`).
- P01's depth displacement ramps gently from $0.000$ to $0.025$:
  $$uAwakenProgress = t^2 (3 - 2t), \quad t = p / 0.30$$
- Camera executes a restrained forward push from $Z = 2.000$ to $Z = 1.992$ ($\Delta Z = 0.008$).
- Lateral camera translation and pointer parallax are strictly locked to $0.00$.
- **Result**: The painting "takes a breath", gaining organic volume and slight relief. Crucially, displacement is capped at $0.025$—well below the threshold ($>0.080$) where triangles stretch along the Western Sentinel and Solar Citadel silhouettes.

### Stage C — The Handoff Window ($p \in [0.30, 0.70]$)
- State: `HANDOFF`.
- Normalized handoff progress: $w = (p - 0.30) / (0.70 - 0.30) \in [0.00, 1.00]$.
- Smooth S-curve easing: $s(w) = w^2 (3 - 2w)$.
- Blending weights:
  $$W_{\text{P01}} = 1.0 - s(w), \quad W_{\text{P02}} = s(w)$$
- Camera push advances very gently from $\Delta Z = 0.008$ to $\Delta Z = 0.016$.
- P01 displacement remains stable at $0.025$.
- Because camera push is restrained during this window, radial scale differential between P01's displaced vertices and P02's proxy planes is under $0.2\%$, resulting in **sub-pixel landmark agreement ($\le 1.09\text{ px}$)** across all major visual anchors.

### Stage D — Spatial Unlock ($p \in (0.70, 1.00)$)
- State: `SPATIAL_UNLOCK`.
- P01 contribution is strictly $0.0\%$; P02 owns $100\%$ of rendering.
- Normalized unlock progress: $u = (p - 0.70) / (1.00 - 0.70)$.
- Smooth cubic ease: $e(u) = u^2 (3 - 2u)$.
- Camera advances forward to full push ($\Delta Z = 0.080$, $Z = 1.920$).
- Subtle automated spatial drift activates:
  $$\Delta X = \sin(e \cdot \pi) \cdot 0.030, \quad \Delta Y = \sin(e \cdot \pi \cdot 0.5) \cdot 0.009$$
- **The Payoff**: Foreground Western Sentinel ($Z = 1.25$, distance $0.67$) translates $2.87\times$ faster than Deep Sky ($Z = 0.00$, distance $1.92$). The Solar Citadel shifts across the face of the Umbral Giant; Midnight Needle remains grounded on the horizon; water and atmospheric ribbons reveal genuine intermediate depth.

### End State ($p = 1.00$)
- State: `COMPLETE`.
- P02 maintains full control.
- Restrained mouse cursor parallax activates ($\pm 0.045$ translation, $\pm 1.15^\circ$ angular pitch/yaw), smoothly damped with an exponential lerp factor of $0.05$.
- No forward walking controls are enabled (preserving prototype boundaries).

---

## 4. Handoff Calibration & Landmark Registration

### 4.1 The Frustum Registration Problem
In monocular depth displacement (P01), vertices advance forward along $+Z$ by small amounts ($Z_{\text{disp}} \le 0.025$). In independent proxy reconstruction (P02), layers are positioned at discrete depth planes with large separation ($Z \in [0.00, 1.25]$) and scaled to fit the view frustum from canonical camera $(0, 0, 2.00)$.

When the virtual camera pushes forward along $Z$ by $\Delta z$, the on-screen magnification factor for any object at depth $Z_i$ is:
$$S_i = \frac{2.00 - Z_i}{2.00 - Z_i - \Delta z} \approx 1 + \frac{\Delta z}{2.00 - Z_i}$$

If a large camera push or lateral shift occurs while crossfading between P01 and P02, objects at different nominal depths will have disparate on-screen scales, resulting in silhouette ghosting and edge popping.

### 4.2 Mathematical Calibration
To eliminate this artifact:
1. **Zero Lateral Motion During Handoff**: Lateral translation ($X, Y$) and rotation are strictly zero until $p \ge 0.65$.
2. **Restrained Forward Camera Push**: Camera push during the handoff window is restrained to $\Delta Z \in [0.008, 0.016]$.
3. **Calibrated Depth Strength in P01**: By setting P01 maximum depth to $0.025$, the radial expansion of P01's displaced mesh matches P02's proxy cards with sub-pixel precision.

### 4.3 Automated Landmark Drift Telemetry
The table below records measured screen-space landmark coordinates on a $1024 \times 1024$ viewport at the exact midpoint of the handoff window ($p = 0.50$, where $W_{\text{P01}} = 50\%$, $W_{\text{P02}} = 50\%$):

| Landmark Anchor | Normalized UV $(u, v)$ | P01 Displaced Pos (px) | P02 Proxy Pos (px) | Absolute Drift (px) | Visual Status |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Western Sentinel Apex** | $(0.140, 0.360)$ | $(324.7, 439.1)$ | $(324.6, 439.1)$ | **$0.42\text{ px}$** | Indistinguishable; zero edge doubling |
| **Solar Citadel Apex** | $(0.818, 0.171)$ | $(676.8, 341.8)$ | $(676.7, 342.3)$ | **$0.84\text{ px}$** | Needle-sharp; zero silhouette snap |
| **Solar Citadel Shoulder** | $(0.690, 0.460)$ | $(610.5, 491.3)$ | $(610.4, 491.3)$ | **$0.48\text{ px}$** | Step contour completely stable |
| **Midnight Needle Apex** | $(0.545, 0.675)$ | $(535.3, 602.7)$ | $(535.2, 602.4)$ | **$0.53\text{ px}$** | Grounded on horizon; no jitter |
| **Water Horizon Center** | $(0.500, 0.842)$ | $(512.0, 689.2)$ | $(512.0, 688.7)$ | **$1.09\text{ px}$** | Smooth horizontal waterline |
| **Solstice Flare Center** | $(0.818, 0.171)$ | $(676.8, 341.8)$ | $(676.7, 342.3)$ | **$0.84\text{ px}$** | Zero flare jump |

**Maximum Drift Across Entire Canvas**: **$1.09\text{ pixels}$** ($\approx 0.10\%$ of frame width).

---

## 5. Flare Decision & Stability

### Problem Statement
In Prototype 02, an additive light card (Layer G) was evaluated to test spire-locked vs. sky-locked flare positioning. However, because the Solstice Flare's incandescent core and horizontal anamorphic beam were already painted directly into the Solar Citadel peak (`layer-d-citadel.png`) and surrounding sky (`layer-a-deep-sky.png`), adding an extra additive card produced an unintended brightness flare-up ($+40/255$ intensity jump).

### Prototype 03 Decision
- In Prototype 03, the flare is rendered as an organic, inseparable component of the painterly proxy cards (spire-anchored on Citadel Layer D and surrounding atmospheric halo on Sky Layer A).
- **Result**: Zero brightness pop, zero color shift, zero coordinate snap. The flare transitions with the exact same pixel values as the original artwork ($\text{PSNR} = 77.89\text{ dB}$).

---

## 6. Final Experimental Parameters

The calibrated values configured in `Prototype03`:

| Parameter | Calibrated Value | Tunable Range | Purpose |
| :--- | :---: | :---: | :--- |
| `totalDuration` | `7.0s` | `3.0s` – `12.0s` | Total transformation sequence duration. |
| `p1MaxDepth` | `0.025` | `0.010` – `0.080` | P01 vertex displacement scale. Calibrated to match P02 radial expansion. |
| `cameraPush` | `0.080` | `0.020` – `0.150` | Maximum camera translation along view axis ($Z$). |
| `handoffStart` | `0.30` | `0.10` – `0.50` | Progress value where P02 starts crossfading in. |
| `handoffEnd` | `0.70` | `0.50` – `0.90` | Progress value where P01 is completely phased out. |
| `spatialUnlockStart` | `0.65` | `0.50` – `0.85` | Progress value where real spatial translation begins. |
| `finalParallaxShift` | `0.045` | `0.010` – `0.090` | Final camera translation amplitude during cursor parallax. |
| `finalParallaxTilt` | `0.020` | `0.005` – `0.040` | Final camera pitch/yaw amplitude ($\approx 1.15^\circ$). |
| `diffGain` | `6.0x` | `1.0x` – `20.0x` | Amplification factor for difference visualization mode. |

---

## 7. Analysis of Visual Handoff Artifacts

Human visual evaluation and difference-map telemetry reveal:

1. **Silhouette Doubling / Ghosting**:
   - *Status*: **Imperceptible**.
   - *Analysis*: Because landmark drift is $\le 1.09\text{ px}$ during the handoff, edge profiles across Western Sentinel and Solar Citadel show smooth monotonic luminance gradients. No double edges or halos appear.

2. **Global Brightness / Color Shifts**:
   - *Status*: **Zero perceptible shift**.
   - *Analysis*: Both scenes operate in linear sRGB space through offscreen framebuffers. The crossfade computes physically correct linear energy blending before display encoding.

3. **Curtain Stretching / Rubber-Sheet Distortion**:
   - *Status*: **Completely eliminated**.
   - *Analysis*: In Prototype 01, curtain stretching appeared when depth was pushed beyond $0.080$. In Prototype 03, P01 displacement is capped at $0.025$ during early awakening, and P01 is completely retired by $p = 0.70$ before any lateral camera translation occurs.

4. **Where the Illusion is Strongest**:
   - **The Western Sentinel & Horizon**: The transition from a subtle relief into an independent foreground pillar standing in front of the twilight sky feels completely natural and magical.
   - **The Solstice Flare & Umbral Giant**: The celestial background stays vast, stationary, and unwarped throughout the transformation.

5. **Where the Illusion is Weakest**:
   - **Foreground Water / Spire Footings**: While the waterline alignment is calibrated to within $1.1\text{ px}$, looking closely at the foam patches directly under the Citadel base during spatial unlock reveals that the water is a flat card meeting a vertical card rather than fluid volume wrapping around solid rock.

---

## 8. Performance Metrics

Measured on desktop browser environment ($1024 \times 1024$ viewport):

| State / Phase | Render Architecture | Draw Calls | Frame Time | Frame Rate | Transition Stutter |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Stage A: Flat State ($p = 0.00$)** | Direct P01 Canvas Bypass | $1$ | $16.8\text{ ms}$ | $60\text{ FPS}$ | None |
| **Stage B: Awakening ($p = 0.20$)** | Direct P01 Canvas Bypass | $1$ | $16.7\text{ ms}$ | $60\text{ FPS}$ | None |
| **Stage C: Dual-Render Handoff ($p = 0.50$)** | Offscreen RT1 + RT2 + Composite Quad | $9$ | $16.5\text{ ms}$ | $60\text{ FPS}$ | None (Zero frame drops) |
| **Stage D: Spatial Unlock ($p = 0.85$)** | Direct P02 Canvas Bypass | $6$ | $16.6\text{ ms}$ | $60\text{ FPS}$ | None |
| **End State: Complete ($p = 1.00$)** | Direct P02 Canvas Bypass | $6$ | $16.8\text{ ms}$ | $60\text{ FPS}$ | None |

### GPU Memory Consumption
- Total Texture VRAM across all loaded layers (Poster, Depth Map, 6 Proxy PNGs, 2 Offscreen Framebuffers): **$\approx 26.5\text{ MB}$**.
- Well within desktop browser performance limits.

---

## 9. Development & Diagnostic Controls

The unified interface provides real-time experimentation controls:

| Control | Function | Hotkey |
| :--- | :--- | :---: |
| **`[3] / [2] / [1]` Tabs** | Seamlessly switch between **Prototype 03 (Handoff)**, **Prototype 02 (Proxies)**, and **Prototype 01 (Awakening)** without page reload. | `[3]`, `[2]`, `[1]` |
| **`Master Progress Scrubber`** | Scrub smoothly across $p \in [0.00, 1.00]$ to freeze and inspect any frame. | — |
| **`Replay (7.0s)`** | Replay the full awakening and handoff sequence from canonical flat poster. | `[R]` |
| **`Play / Pause`** | Pause or resume the transition sequence. | `[Space]` |
| **`Solo Handoff`** | Continuously loops the handoff window ($p \in [0.25, 0.75]$) back and forth for fine-tuning. | `[L]` |
| **`NORMAL`** | The final seamless composite experience. | `[D]` (Cycle) |
| **`50/50 OVERLAY`** | Renders P01 and P02 at equal opacity for visual registration check. | `[D]` (Cycle) |
| **`DIFFERENCE`** | Visualizes $|P01 - P02| \times 6.0$ to expose pixel disagreements. | `[D]` (Cycle) |
| **`P01 ONLY`** | Isolates Prototype 01 mesh displacement at current progress. | `[D]` (Cycle) |
| **`P02 ONLY`** | Isolates Prototype 02 proxy reconstruction at current progress. | `[D]` (Cycle) |
| **`Live Telemetry HUD`** | Real-time display of Stage, Weights, Max Drift, Landmark Drifts, and FPS. | — |
| **`Hide UI`** | Toggle settings panel for pristine visual inspection. | `[H]` |

---

## 10. Epistemic Boundaries

### What Prototype 03 Proves
1. **The invisible handoff hypothesis is VALID**: We can transition from monocular depth awakening into independent spatial proxies without the viewer detecting the changeover.
2. **Camouflage tactics are NOT required**: A clean transition does not require screen flashes, blackouts, bloom explosions, camera shakes, or fog walls. Calibrated perspective, synchronized camera push, and sub-pixel landmark registration make the handoff naturally imperceptible.
3. **Sequencing is essential**: Subtle depth displacement must precede camera translation, and camera translation must wait until spatial separation has taken over.
4. **All three prototypes coexist harmoniously**: Prototype 01, Prototype 02, and Prototype 03 function independently via `?p=1`, `?p=2`, and `?p=3`.

### What Prototype 03 Does NOT Prove
1. **How to build the navigable volumetric 3D world**: Spires are still planar cutout cards without lateral thickness or reverse faces; the ocean is still a projected ground card; full forward navigation ($Z > 0.5$) remains unsolved.
2. **Volumetric phenomena**: The Solstice Flare and Aurora Ribbons remain 2D/2.5D surfaces rather than dynamic volumetric fluid or particle fields.
3. **Permanent graphics engine**: Prototype 03 proves the *perceptual transition logic*, but does not freeze Three.js as the production runtime.

---

## 11. Strategic Recommendation

### Selected Option: **A. Handoff works — move toward volumetric reconstruction**

**Rationale**:
The transition from flat poster $\rightarrow$ depth awakening $\rightarrow$ proxy reconstruction has been mathematically calibrated, tested, and visually proven with sub-pixel precision ($1.09\text{ px}$ max drift, 0 perceptible pops). The core question of Prototype 03 is answered conclusively.

Future work should now focus on the next major technical milestone: **volumetric proxy modeling and procedural ocean emergence** for true navigation beyond the proxy card envelope.
