# POSTER ANALYSIS: REFERENCE & SPATIAL BREAKDOWN

> **Canonical Source**: `reference/poster.jpeg` (1024 × 1024 px, RGB 8-bit)  
> **Project Goal**: *"I clicked on a painting, and then I was inside it."*  
> **Document Purpose**: Comprehensive visual, spatial, chromatic, and technical breakdown bridging **Art Direction** (preserving the painterly soul, emotional tone, and color harmony) and **Realtime Graphics Engineering** (camera calibration, 2D → 3D projection, occlusion reconstruction, and shader requirements).

---

## Table of Contents

1. [Executive Visual Read](#1-executive-visual-read)
2. [Composition Map](#2-composition-map)
3. [Depth Interpretation](#3-depth-interpretation)
4. [Landmark Inventory](#4-landmark-inventory)
5. [Opening Camera Requirements](#5-opening-camera-requirements)
6. [The 2D → 3D Handoff Problem](#6-the-2d--3d-handoff-problem)
7. [Occlusion and Hidden-World Analysis](#7-occlusion-and-hidden-world-analysis)
8. [Painterly Traits We Must Preserve](#8-painterly-traits-we-must-preserve)
9. [Color and Light Study](#9-color-and-light-study)
10. [Motion Opportunities](#10-motion-opportunities)
11. [Sound Implied by the Image](#11-sound-implied-by-the-image)
12. [Fidelity Risks (Ranked Highest to Lowest)](#12-fidelity-risks-ranked-highest-to-lowest)
13. [Visual Success Criteria](#13-visual-success-criteria)
14. [Unknowns and Questions](#14-unknowns-and-questions)
- [Confidence Ledger](#confidence-ledger)
15. [Final Assessment](#15-final-assessment)

---

# 1. Executive Visual Read

The reference artwork `reference/poster.jpeg` is a square format (1:1 aspect ratio), highly stylized, painterly science-fantasy landscape. It depicts an awe-inspiring, silent alien seascape observed from just above the water line, dominated by crystalline monoliths, celestial bodies of impossible scale, and incandescent atmospheric phenomena.

```
+-------------------------------------------------------------------------+ (0%, 0%)
| [Starfield / Cosmic Void]           (Ember Moon)                        |
|                                       ( )                               |
|        * (4-Point Star)                                                 |
|                                                  \  |  /                |
|                                             --- (SOLSTICE FLARE) ---    |
|                        [THE UMBRAL GIANT]        /  |  \                |
|                      /--------------------\    /\                       |
|   /\                /                      \  /  \                      |
|  /  \              /                        \/    \  [THE SOLAR         |
| /    \  ~~~~~~~~~~/~~~~~~~~~~~~~~~~~~~~~~~~~~      \  CITADEL]          |
|/ [WESTERN        /   (Aurora Veil Ribbons)          \                   |
|   SENTINEL]     /                                    \                  |
|                /                                      \      /\         |
|               /                                    /\  \    /  \        |
|              /                                    /  \  \  /    \       |
|                                             /\   /    \  \/      \      |
|             |          [Midnight Needle]   /  \ /      \          \     |
|-------------+-------------------/\--------/----\-------------------+----| Horizon y≈84%
| ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ || ~ ~ ~ (Aquamarine Luminous Churn)    |
|~ ~ ~ ~ ~ ~ ~ ~ [THE ABYSSAL SEA: Foamy Crests & Deep Indigo Chop] ~ ~ ~ |
+-------------------------------------------------------------------------+ (100%, 100%)
```

### 1.1 Objective Inventory of Visibly Present Elements

1. **Dynamic Water Surface (`The Abyssal Sea`)**:
   - Occupies the bottom ~16.5% of the frame ($y \approx 83.5\% \text{ to } 100\%$).
   - Dynamic, textured chop featuring distinct, frothy white-capped wave crests running horizontally and diagonally.
   - Distinctive **bright cyan/aquamarine localized luminous water churn** clustered directly around the base of the massive right spire formation ($x \approx 58\% \text{ to } 75\%, y \approx 84\% \text{ to } 94\%$), whether originating from bioluminescence, subsurface scattering, reflective highlights, or a purely painterly convention.
2. **Multi-Tiered Monolithic Spire Group (`The Solar Citadel`)**:
   - Anchors the right third of the composition.
   - Towers from a wide oceanic base ($x \approx 58\% \text{ to } 100\%, y \approx 82\% \text{ to } 96\%$) up to a needle-sharp apex at $x \approx 82\%, y \approx 17\%$.
   - Features multiple secondary peaks and sculpted shoulders: a prominent left shoulder spire peaking at $x \approx 69\%, y \approx 46\%$, and a right flank spire peaking at $x \approx 97\%, y \approx 52\%$.
   - Highly faceted, sculpted surfaces exhibiting icy/crystalline cerulean-to-cyan midtones and delicate light teal highlights (interpreted as crystalline mineral or glacial formations).
3. **Slender Isolated Sentinel Spire (`The Western Sentinel`)**:
   - Occupies the left midground, rising vertically from $x \approx 6\% \text{ to } 29\%$, with its base meeting the water at $y \approx 86\% \text{ to } 91\%$.
   - Reaches a needle apex at $x \approx 14\%, y \approx 36\%$.
   - Displays sharp planar facets, strong cyan rim lighting along its left crest, and a smaller satellite fin/needle at its right foot ($x \approx 26\%, y \approx 77\% \text{ to } 89\%$).
4. **Distant Needle Formations**:
   - **The Midnight Needle**: A slender, needle-sharp distant spire centered in the open horizon gap at $x \approx 54.5\%$, rising from the horizon ($y \approx 85\%$) to an apex at $y \approx 67.5\%$.
   - **The Periphery Needle**: An extremely slender spire hugging the far-left border at $x \approx 1\%, y \approx 72\% \text{ to } 85\%$.
   - Several faint, minute distant stubs and needles silhouetted against the bright horizon (e.g., at $x \approx 48\%, y \approx 81\% \text{ to } 84\%$).
5. **Low, Flat Horizon Line**:
   - Positioned at $y \approx 83.5\% \text{ to } 85.5\%$, establishing an extraordinarily low horizon that emphasizes monumental verticality.
6. **Colossal Spherical Celestial Body (`The Umbral Giant`)**:
   - Dominates the upper-central canvas; visually a colossal spherical body with banded markings, colloquially referred to as a gas giant or distant planetary world.
   - Apparent disk diameter spans $\sim 75\% \text{ to } 80\%$ of the frame's height (center estimated near $x \approx 58\%, y \approx 22\%$).
   - Displays smooth, painterly, banded cloud belts in muted purplish-blue, mauve, and slate tones.
   - Its lower-right edge displays a glowing crescent rim caught in the intense amber light of the starburst.
   - **Observable Occlusion Fact**: It does *not* possess Saturnian physical solid rings. The luminous banded streaks that cross its face are atmospheric ribbons suspended in the foreground/middle sky that visibly occlude the planetary disk while passing behind the spires.
7. **Secondary Celestial Body (`The Ember Moon`)**:
   - Small companion disk located in the upper-left quadrant at $x \approx 34.5\%, y \approx 2.5\%$.
   - Approximately 40 px in diameter ($\sim 4\%$ frame width), displaying a warm dusky mauve/wine-red hue.
8. **Cosmic Void and Starfield**:
   - The upper left corner ($x \approx 0\% \text{ to } 35\%, y \approx 0\% \text{ to } 25\%$) transitions into a deep indigo-black interstellar void.
   - Features an iconic four-pointed diamond star at $x \approx 19.5\%, y \approx 19.5\%$ surrounded by subtle, organic pinprick stars.
9. **Apex Starburst Flare (`The Solstice Flare`)**:
   - Located exactly at the pinnacle of the Solar Citadel ($x \approx 82\%, y \approx 17\%$).
   - Blinding, incandescent pure white core.
   - Enormous warm gold/amber radiant halo ($\sim 25\text{--}30\%$ frame radius) diffusing into rich orange, pink, and violet.
   - Razor-sharp, bright horizontal anamorphic flare streak along $y \approx 17.5\%$, extending across the sky from $x \approx 15\%$ through $100\%$.
   - *Epistemic Ambiguity*: Visually co-located with the spire apex; whether this is a distant celestial sun in eclipse alignment or a physical crystal emitter is an open creative hypothesis.
10. **Luminous Atmospheric Ribbons (`The Aurora Veil`)**:
    - Fluorescent magenta/hot-pink ribbons weaving diagonally across the mid-sky ($y \approx 25\% \text{ to } 50\%$).
    - Observable truth: They visibly occlude the Umbral Giant's disk while remaining behind the foreground spires, confirming their intermediate atmospheric placement. Describing them physically as "plasma ribbons" or "geomagnetic auroras" is a working physical hypothesis.
11. **Stratified Ionospheric Horizon Haze (`The Prismatic Haze`)**:
    - Rich, spectral atmospheric gradient spanning $y \approx 60\% \text{ to } 83.5\%$.
    - Transitions smoothly through horizontal bands of pale violet, dusky pink, radiant gold, lime green, and pale cyan before meeting the sea.

---

### 1.2 Distinguishing Visible Truth from Interpretation: The Three-Tier Epistemic Framework

To maintain technical and artistic discipline, all observations and design assumptions throughout this breakdown are structured across three epistemic tiers:

1. **Directly Observable (Pixel Ground Truth)**: Empirical facts verifiable directly from visible pixels and geometry in `reference/poster.jpeg`.
2. **Strong Inferences (Probable Interpretations)**: World-building, geological, and astronomical deductions that are highly probable and visually coherent, but cannot be proven definitively from a static 2D image alone.
3. **Working Hypotheses (Exploratory Assumptions)**: Initial numerical parameters, technical architectures, physical models, and creative resolutions adopted as starting scaffolding for pre-production prototyping, subject to artistic and technical calibration.

| Epistemic Tier | Elements & Observations | Analytical Assessment & Architectural Impact |
| :--- | :--- | :--- |
| **1. Directly Observable<br>*(Pixel Ground Truth)*** | • 1024×1024 square canvas format (1:1 aspect ratio).<br>• Extremely low horizon line at $y \approx 83.5\%\text{--}85.5\%$.<br>• Dynamic ocean chop with opaque, sculpted foam crests at $y > 83.5\%$.<br>• Localized bright cyan/aquamarine water churn at Citadel waterline ($x \approx 58\%\text{--}75\%, y \approx 84\%\text{--}94\%$).<br>• Asymmetric framing spires: Solar Citadel apex at $(82.0\%, 17.0\%)$; Western Sentinel apex at $(14.0\%, 36.0\%)$.<br>• Slender distant needles silhouetted in horizon gap ($x \approx 54.5\%$).<br>• Colossal spherical body with banded markings, disk diameter $\approx 78\%$ frame height.<br>• Small companion disk (Ember Moon) at upper-left ($x \approx 34.5\%, y \approx 2.5\%$).<br>• Solstice Flare starburst at $(82\%, 17\%)$ with horizontal anamorphic streak spanning $x \in [15\%, 100\%]$.<br>• Magenta ribbons weaving across mid-sky ($y \approx 25\%\text{--}50\%$), occluding the planet disk while passing behind spire silhouettes. | Empirical ground truth verifiable by pixel sampling and geometric coordinate measurement. Contains zero native 3D data; all spatial depth is implied through pictorial cues (occlusion, atmospheric extinction, and linear perspective). |
| **2. Strong Inferences<br>*(Probable Interpretations)*** | • Spires represent crystalline mineral monoliths or ancient glacial ice formations rather than standard sedimentary rock.<br>• Water surface represents an alien sea (saline, heavy brine, or cryogenic fluid).<br>• Large spherical body represents a distant planetary world / gas giant viewed from an orbiting moon or low-orbit vantage point.<br>• Low horizon line implies looking slightly upward from a low vantage point near water level.<br>• Stratified horizon gradient represents an atmospheric color transition (which can be creatively modeled via forward atmospheric scattering like Mie/Rayleigh in shader development).<br>• Differential silhouette contrast indicates Western Sentinel is closer to camera than the Solar Citadel. | Highly probable world-building deductions consistent with the visual grammar of space art (e.g., Chesley Bonestell, John Berkey). They guide aesthetic choices, shader properties (specular sharpness, subsurface transmission), and acoustic themes without being mistaken for absolute facts. |
| **3. Working Hypotheses<br>*(Exploratory Assumptions)*** | • Metric spatial scale scaffolding: Citadel height $\approx 420\text{m}$, Sentinel height $\approx 180\text{m}$, camera distance to Citadel $\approx 180\text{m}$, distance to Sentinel $\approx 110\text{m}$.<br>• Camera intrinsic/extrinsic parameters: FOV $\approx 50^\circ\text{--}60^\circ$, eye height $\approx 1.5\text{m--}2.5\text{m}$, pitch $\approx +7^\circ\text{--}+9^\circ$.<br>• Physical nature of magenta ribbons as ionospheric auroral plasma driven by geomagnetic flux lines.<br>• Physical nature of cyan water churn as bioluminescent micro-organisms vs. subsurface scattering or surface reflection.<br>• Solstice Flare astronomical depth: distant eclipsed star at infinity vs. localized crystalline energy emitter.<br>• Decoupled celestial sky projection to resolve the telephoto celestial vs. rectilinear landscape paradox.<br>• Dynamic motion frequencies (e.g., 0.08 Hz ocean swell, 0.15 Hz flare breathing) and spatial audio frequencies (35–45 Hz sub-bass hum).<br>• Projective texture mapping onto calibrated proxy geometry as candidate 2D $\rightarrow$ 3D handoff architecture. | Initial engineering scaffolding and creative conventions adopted to bootstrap 3D prototyping. Because monocular paintings have no ground-truth metric coordinates or engine stacks, these values and technical approaches remain fully open to recalibration, refactoring, or replacement during pre-production experiments. |

---

# 2. Composition Map

The artwork employs a classical heroic proscenium composition, utilizing vertical crystalline pillars on the left and right to frame an expansive, infinitely deep cosmic panorama.

```
0%  -------------------------- 34.5% (Moon) --------------------------------- 100%
    | [Deep Space Void]          ( )                                          |
    |        * (Star 19.5, 19.5)                                              |
17% | - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - *(82%, 17%) Flare
    |                            [THE UMBRAL GIANT]              /| \         |
    |                                                           / |  \        |
36% |   /\ (14%, 36%) Sentinel                                 /  |   \       |
    |  /  \              ~~~~~~~~~~~~~~~~ (Aurora Veil) ~~~~~ /   |    \      |
    | /    \                                                 /    |     \ 52% |
    |/      \                                               /     |      /\   |
    |        \                                             / 69%  |     /  \  |
    |         \                                           /\  |   |    /    \ |
67% |          \                [Midnight Needle]        /  \ |   |   /      \|
    |           \                     /\ (54.5%, 67.5%) /    \|   |  /        |
84% |============\====================||===============/======|===|=/=========| Horizon
    |  (Western   \                  (Sea Gap)        (Solar Citadel Base)    |
100%---------------------------------------------------------------------------
    0%          14%                   54.5%            69%   82%  97%        100%
```

### 2.1 Normalized Coordinate Grid ($x \in [0.0, 1.0]$, $y \in [0.0, 1.0]$)

- **Origin $(0.0, 0.0)$**: Top-Left corner.
- **Max $(1.0, 1.0)$**: Bottom-Right corner.

#### Primary Structural Masses

| Feature Name | Bounding Box / Key Coordinates | Normalized Area / Extent | Compositional Role |
| :--- | :--- | :--- | :--- |
| **The Solar Citadel** | Apex: $(0.820, 0.170)$<br>Left Shoulder: $(0.690, 0.460)$<br>Right Flank: $(0.970, 0.520)$<br>Base Extent: $x \in [0.58, 1.00], y \in [0.82, 0.96]$ | Occupies $\sim 28\%$ of total frame area; spans bottom-right quadrant vertically to top-right. | Dominant visual anchor, key light focal point, asymmetric vertical weight framing the right side. |
| **The Western Sentinel** | Apex: $(0.140, 0.360)$<br>Right Flank Spur: $(0.260, 0.770)$<br>Base Extent: $x \in [0.06, 0.29], y \in [0.86, 0.91]$ | Occupies $\sim 11\%$ of frame area; spans left midground. | Vertical counterweight to the Citadel; establishes near-field parallax; frames the left proscenium. |
| **The Midnight Needle** | Apex: $(0.545, 0.675)$<br>Base: $(0.540, 0.850)$ to $(0.550, 0.850)$ | Slender vertical needle: width $\sim 1.0\%$, height $\sim 17.5\%$. | Centered focal guide in the horizon opening; primary scale and depth anchor between near and deep space. |
| **The Periphery Needle** | Base-to-Apex: $x \approx 0.010, y \in [0.720, 0.850]$ | Width $\sim 0.8\%$, height $\sim 13.0\%$. | Left-edge boundary delimiter; anchors the extreme peripheral depth plane. |
| **The Horizon Line** | $y \in [0.835, 0.855]$ across open sea corridors: $x \in [0.00, 0.06]$, $x \in [0.29, 0.58]$. | Horizontal line at $\sim 84\%$ height. | Extremely low horizon line (16% ground, 84% sky). Creates overwhelming vertical grandeur and epic scale. |
| **The Umbral Giant** | Apparent Center: $\sim (0.58, 0.22)$<br>Visible Arc: $(0.34, 0.02)$ to $(0.65, 0.70)$<br>Apparent Diameter: $\sim 78\%$ frame height | Occupies $\sim 42\%$ of sky dome. | Surreal backdrop; compresses astronomical scale directly into the atmospheric layer. |
| **The Ember Moon** | Center: $(0.345, 0.025)$, Radius: $\sim 0.020$ ($40\text{ px}$ diameter) | Circular disk: $\sim 0.12\%$ frame area. | Secondary celestial interest; establishes tri-body orbital depth in upper quadrant. |
| **The Solstice Flare** | Core: $(0.820, 0.170)$<br>Horizontal Streak: $y \approx 0.175, x \in [0.15, 1.00]$<br>Diffraction Halo Radius: $r \approx 0.28$ | Point core with extreme radiant bloom and horizontal streak. | Primary key light source; ultimate high-contrast focal draw for the human eye. |
| **The Aurora Veil** | Upper Ribbon: sweeps $(0.18, 0.38) \rightarrow (0.55, 0.24) \rightarrow (0.80, 0.19)$<br>Lower Ribbon: sweeps $(0.16, 0.47) \rightarrow (0.60, 0.35) \rightarrow (0.75, 0.28)$ | Two primary undulating bands; thickness $\sim 2\text{--}4\%$. | Dynamic diagonal sweep connecting left and right quadrants across the static circular planet face. |
| **The Abyssal Sea** | Full width: $x \in [0.0, 1.0]$, $y \in [0.835, 1.000]$ | Bottom $16.5\%$ of canvas. | Foundation plane; grounds the composition; provides reflective surface for sky and spire luminescence. |

### 2.2 Balance, Flow, and Geometric Vectors

1. **Rule of Thirds & Golden Ratio Alignment**:
   - The Solstice Flare ($x \approx 82\%, y \approx 17\%$) sits near the intersection of the upper-right power axis, balanced by the Western Sentinel's apex ($x \approx 14\%, y \approx 36\%$) near the upper-left power axis.
   - The low horizon at $y \approx 84\%$ pushes the entire focal drama into the celestial/monolithic canopy.
2. **Dynamic Diagonal Vectoring**:
   - The Aurora Veil ribbons arc diagonally upward from left ($y \approx 47\%$) to right ($y \approx 19\%$), guiding the observer's gaze across the face of the Umbral Giant directly toward the Solstice Flare.
   - The slope of the Solar Citadel's left shoulder ($x \approx 69\%, y \approx 46\% \rightarrow x \approx 82\%, y \approx 17\%$) parallels this diagonal flow, forming a visual funnel that directs attention to the starburst.
3. **Proscenium Framing & Visual Gateway**:
   - The Western Sentinel and Solar Citadel form natural stage pillars. The gap between them ($x \approx 29\% \text{ to } 58\%$) creates an open visual gateway into infinity, populated only by the slender Midnight Needle and the serene sea.

---

# 3. Depth Interpretation

To translate the 2D artwork into a navigable 3D environment, monocular pictorial depth cues must be translated into spatial staging planes ($Z$-depth intervals).

```
[EYE / CAMERA] (Z = 0m)
      |
      |-- (Z ≈ 2m to 25m) ----> [PLANE 1: IMMEDIATE FOREGROUND SEA]
      |                         Choppy waves, foam, local ripples
      |
      |-- (Z ≈ 80m to 250m) --> [PLANE 2: NEAR-MIDGROUND PROSCENIUM]
      |                         • Western Sentinel (Z ≈ 110m)
      |                         • Solar Citadel Massif (Z ≈ 180m)
      |                         • Luminous Water Churn (Z ≈ 160m)
      |
      |-- (Z ≈ 400m to 800m) -> [PLANE 3: FAR-MIDGROUND & HORIZON]
      |                         • The Midnight Needle (Z ≈ 520m)
      |                         • The Periphery Needle (Z ≈ 650m)
      |                         • Water Horizon Line (Z ≈ 800m to 1200m)
      |
      |-- (Z ≈ 2km to 15km) --> [PLANE 4: ATMOSPHERIC BOUNDARY]
      |                         • Stratified Prismatic Haze (Z ≈ 2km to 5km)
      |                         • Aurora Veil Ribbons (Z ≈ 5km to 12km)
      |
      +-- (Z = ∞ / Sky Dome) -> [PLANE 5: CELESTIAL BACKGROUND]
                                • The Umbral Giant (Projected Deep Celestial)
                                • The Ember Moon
                                • Cosmic Starfield & Solstice Sun
*Note: All metric distance and height values above are Working Hypotheses for Initial 3D Spatial Staging (Subject to artistic calibration during prototyping).*
```

### 3.1 Spatial Plane Decomposition

> [!IMPORTANT]
> **Epistemic Note on Metric Scale Scaffolding**: Monocular 2D paintings have no ground-truth metric scale, depth buffer, or camera sensor metadata. All metric distances ($Z \approx 2\text{m}$, $Z \approx 110\text{m}$, $Z \approx 180\text{m}$, etc.) and physical elevations (Citadel height $\approx 420\text{m}$, Sentinel height $\approx 180\text{m}$) are explicitly **Working Hypotheses for Initial 3D Spatial Staging (Subject to artistic calibration during prototyping)**. They serve strictly as initial numerical scaffolding for 3D coordinate setups rather than empirical physical measurements.

#### Plane 1: Immediate Foreground Sea (Working Hypothesis: $Z \approx 2\text{ m to } 25\text{ m}$, Canvas $y \in [0.92, 1.00]$)
- **Visual Content**: Dark sapphire/indigo open ocean with individual white foam crests and high-frequency wave chop.
- **Spatial Function**: Ground plane that establishes scale, forward motion vector, and immediate proximity to the water surface.
- **Physical Characteristics**: Fast parallax relative to camera drift; foam displacement vectors moving diagonally towards the camera.

#### Plane 2: Near-Midground Proscenium (Working Hypothesis: $Z \approx 80\text{ m to } 250\text{ m}$, Canvas $y \in [0.17, 0.96]$)
- **Visual Content**:
  - The Western Sentinel at working hypothesis $Z \approx 110\text{ m}$ (Working hypothesis height $\approx 180\text{ m}$).
  - The Solar Citadel Massif at working hypothesis $Z \approx 180\text{ m}$ (Working hypothesis apex height $\approx 420\text{ m}$).
  - Luminous aquamarine water churn clustering at the Citadel waterline (Working hypothesis $Z \approx 160\text{ m}$).
- **Spatial Function**: Massive vertical silhouettes creating pronounced stereoscopic and motion parallax against the background. They anchor the framing proscenium.

#### Plane 3: Far-Midground & Horizon Corridor (Working Hypothesis: $Z \approx 400\text{ m to } 1,200\text{ m}$, Canvas $y \in [0.67, 0.85]$)
- **Visual Content**:
  - The Midnight Needle at working hypothesis $Z \approx 520\text{ m}$ (Working hypothesis height $\approx 120\text{ m}$).
  - Periphery Needle at working hypothesis $Z \approx 650\text{ m}$.
  - Ocean horizon boundary line at working hypothesis $Z \approx 800\text{ m to } 1,200\text{ m}$.
- **Spatial Function**: The critical intermediate stepping stone preventing a visual "cliff" between local geometry and infinite celestial background.

#### Plane 4: Atmospheric Layer (Working Hypothesis: $Z \approx 2\text{ km to } 15\text{ km}$, Canvas $y \in [0.20, 0.83]$)
- **Visual Content**:
  - Stratified Prismatic Haze hugging the lower horizon ($y \in [0.60, 0.83]$).
  - The Aurora Veil ribbons floating in the upper mesosphere/ionosphere ($y \in [0.25, 0.50]$).
- **Spatial Function**: Volumetric light scattering, depth cueing through atmospheric extinction, and dynamic fluid motion.

#### Plane 5: Distant Celestial Sky ($Z \rightarrow \infty$, Sky Dome / Background Plane)
- **Visual Content**: The Umbral Giant, The Ember Moon, Deep Space Starfield, and astronomical Solstice Sun.
- **Spatial Function**: Infinite backdrop with zero camera-translation parallax (pure rotational response).

---

### 3.2 Occlusion and Spatial Validation Cues

1. **Definitive Occlusion Order**:
   - $\text{Foreground Ocean} \prec \text{Western Sentinel Base} \prec \text{Solar Citadel Base}$.
   - $\text{Western Sentinel} \prec \text{Aurora Veil} \prec \text{Umbral Giant} \prec \text{Starfield}$.
   - $\text{Solar Citadel} \prec \text{Umbral Giant} \prec \text{Deep Sky}$.
   - **Crucial Rule**: The Aurora Veil passes *in front of* the Umbral Giant's disk (obscuring its cloud bands) while passing *behind* the spire silhouettes. This physically anchors the Aurora to the local planet's atmosphere.
2. **Perspective Compression vs. Monocular Depth Cues**:
   - **Wave Scale Gradient**: Wave crest detail compresses aggressively from coarse brushstrokes at $y = 1.00$ to tight, razor-thin lines at $y = 0.84$.
   - **Atmospheric Perspective**: The Midnight Needle displays marked contrast attenuation, shifting toward the pale lilac of the horizon haze, whereas the Sentinel and Citadel retain rich, deep crystalline saturation.

---

### 3.3 Monocular Depth Ambiguities & Technical Solutions

1. **Ambiguity A: The True Depth of the Solstice Flare**:
   - *Question*: Is the flare an infinite-distance sun peeking exactly behind the spire tip, or is it a physical luminescent beacon resting on the spire apex?
   - *Visual Evidence*: In the 2D painting, it functions ambiguously as both.
   - *Working Hypothesis for Prototyping*: In 3D engine space, placing the light source exclusively at infinite distance creates severe alignment fragility when the camera moves (instant parallax break). **Candidate Solution**: Test a hybrid rendering model as a working hypothesis—the direct bright star is rendered on the sky dome at astronomical infinity, while a co-located volumetric proxy light and particle emitter are anchored directly to the spire apex ($Z \approx 180\text{ m}$). The two blend seamlessly at the starting camera pose, subject to validation in prototype motion tests.
2. **Ambiguity B: Depth Offset Between Left and Right Spires**:
   - *Question*: Which spire is closer to the viewer?
   - *Visual Evidence (Strong Inference)*: The Western Sentinel's base is positioned slightly lower in the frame ($y \approx 91\%$) than the Citadel's primary waterline contact ($y \approx 85\% \text{ to } 94\%$), and its silhouette is crisp and dark.
   - *Working Hypothesis for Prototyping*: Place the Western Sentinel closer to the camera ($Z \approx 110\text{ m}$) than the Solar Citadel ($Z \approx 180\text{ m}$). This working hypothesis generates differential parallax during initial forward drift and will be evaluated interactively in prototype spikes.

---

# 4. Landmark Inventory

To ensure crystal-clear communication between design, engineering, and audio teams, we establish stable, canonical working names and complete visual profiles for every significant landmark.

```
       [4. The Ember Moon]
              ( )
                                                        [7. The Solstice Flare]
                                                                \ | /
[5. The Umbral Giant]                                        ---  *  ---
        O                                                       / | \
                                                     [1. The Solar Citadel]
                                                               /\
[2. The Western Sentinel]    [8. The Aurora Veil]             /  \
         /\                    ~~~~~~~~~~~~                  /    \  /\
        /  \                                                /      \/  \
       /    \                [3. The Midnight Needle]      /            \
      /      \                         /\                 /              \
=====+========+========================||================+================+====
[10. The Prismatic Haze]                                 [Seafoam Glow]
[9. The Abyssal Sea]
```

### 1. The Solar Citadel (`spire_citadel_right`)
- **Visual Silhouette**: A massive, multi-pinnacled crystalline massif dominating the right third of the frame. Has a primary sharp apex reaching high into the sky, flanked by a prominent stepped left shoulder and a flared right seawall.
- **Coordinates & Extent**: Apex at $(0.820, 0.170)$; footprint spans $x \in [0.58, 1.00], y \in [0.82, 0.96]$.
- **Coloration & Surface**: Deep teal, icy cerulean, and aquamarine. Surfaces exhibit sharp, angular planar facets mixed with smooth glacial valleys. High rim highlights on forward-facing edges.
- **Lighting Dynamics**: Heavy warm amber edge bleed and subsurface scattering on its upper-left facets from the Solstice Flare; deep cold cyan ambient fill on shadowed sea-level flanks.

### 2. The Western Sentinel (`spire_sentinel_left`)
- **Visual Silhouette**: A lone, slender, needle-like obelisk rising sheer from the ocean in the left midground. Features a secondary small tooth-like fin hugging its right base.
- **Coordinates & Extent**: Apex at $(0.140, 0.360)$; waterline base spans $x \in [0.06, 0.29], y \in [0.86, 0.91]$.
- **Coloration & Surface**: Ultramarine, cobalt blue, and electric cyan. Strong planar chiseling with high specular edge-light along its left crest.
- **Lighting Dynamics**: Backlit against the aurora ribbons and dark sky. High contrast silhouette with glowing pale-cyan rim light.

### 3. The Midnight Needle (`spire_needle_center`)
- **Visual Silhouette**: Extremely sharp, perfectly vertical solitary needle rising from the horizon in the central gateway corridor.
- **Coordinates & Extent**: Apex at $(0.545, 0.675)$; base at $(0.545, 0.850)$.
- **Coloration & Surface**: Pale slate blue and lavender-gray due to heavy atmospheric veiling.
- **Lighting Dynamics**: Silhouetted against the bright, stratified horizon haze; serves as the primary depth ruler for the middle distance.

### 4. The Periphery Needle (`spire_needle_far_left`)
- **Visual Silhouette**: Faint, ultra-slender needle kissing the far-left edge of the frame.
- **Coordinates & Extent**: $x \approx 0.010, y \in [0.720, 0.850]$.
- **Coloration & Surface**: Muted indigo, low contrast, semi-diffuse.
- **Lighting Dynamics**: Subtle edge delimitation for peripheral vision.

### 5. The Umbral Giant (`celestial_giant_planet`)
- **Visual Silhouette & Epistemic Classification**: Visually, a colossal spherical body with horizontal cloud/band formations and a glowing crescent rim occupying over $40\%$ of the sky. Its classification as a "gas giant" or distant planetary world is a **working interpretation / artistic hypothesis**; the observable truth is a colossal banded celestial disk.
- **Coordinates & Extent**: Center estimated near $(0.58, 0.22)$; diameter $\sim 78\%$ frame height.
- **Coloration & Surface**: Rich violet, deep twilight purple, slate-mauve atmospheric bands, and smooth planetary cloud whorls.
- **Lighting Dynamics**: Radiant golden crescent rim along its lower-right limb reflecting the Solstice light; smooth Terminator shadow rolling into deep space purple on its upper-left.

### 6. The Ember Moon (`celestial_moon_satellite`)
- **Visual Silhouette**: A small, perfect circular companion disk perched high in the upper-left quadrant.
- **Coordinates & Extent**: Center at $(0.345, 0.025)$; diameter $\sim 40\text{ px}$ ($\sim 4\%$ of canvas).
- **Coloration & Surface**: Dusky burnt ember, mauve-purple, craterless and soft.
- **Lighting Dynamics**: Subtle directional lighting matching the primary starburst angle.

### 7. The Solstice Flare (`light_solstice_flare`)
- **Visual Silhouette & Epistemic Classification**: A blinding, diamond starburst centered directly on the apex of the Solar Citadel, shooting a brilliant horizontal anamorphic streak across the canvas. Whether this flare is an infinite-distance background sun in eclipse alignment or a physical crystal emitter at the spire apex is an **open creative hypothesis** to be explored during prototyping.
- **Coordinates & Extent**: Point center at $(0.820, 0.170)$; streak extends across $x \in [0.15, 1.00]$ at $y \approx 0.175$.
- **Coloration & Surface**: Pure incandescent white core (`#FFFFFF`), surrounded by a radiant lemon-gold inner glow, bleeding into deep amber-orange and dusty rose.
- **Lighting Dynamics**: The undisputed Key Light of the world. Casts high-intensity golden rim light across the Citadel, the Umbral Giant's crescent limb, and reflects into the ocean chop.

### 8. The Aurora Veil (`atmosphere_aurora_veil`)
- **Visual Silhouette & Epistemic Classification**: Twin sweeping, luminous magenta ribbons arcing horizontally across the mid-sky. Observable truth is that they are luminous magenta atmospheric ribbons occluding the large planet while positioned behind the spires. Describing them physically as "plasma ribbons" or "geomagnetic auroras" is a **working physical hypothesis**.
- **Coordinates & Extent**: Arcs through $y \in [0.25, 0.50]$, spanning $x \in [0.15, 0.85]$.
- **Coloration & Surface**: Vibrant neon magenta, fuchsia, hot pink (`#E6358C`), with translucent, feathered falloff.
- **Lighting Dynamics**: Self-illuminating ribbons that visibly occlude the Umbral Giant while illuminating the mid-sky haze.

### 9. The Abyssal Sea (`ocean_surface_abyssal`)
- **Visual Silhouette & Epistemic Classification**: Turbulent, wave-carved ocean surface filling the lower proscenium, interrupted by spire footings. The localized bright cyan/aquamarine water churn at the spire base ($(0.65, 0.88)$) is an **observable pixel fact**; describing this patch as "bioluminescent" is a **working hypothesis** (alternative physical hypotheses include subsurface scattering, localized mineral reflection, or a painterly expressive accent).
- **Coordinates & Extent**: Full canvas width $x \in [0.0, 1.0]$, $y \in [0.835, 1.000]$.
- **Coloration & Surface**: Deep indigo and ultramarine base, turquoise wave crests, brilliant white-cyan foamy surf. Bright neon aquamarine churn at $(0.65, 0.88)$.
- **Lighting Dynamics**: Receives golden specular glints from the Solstice Flare in the right midground; cold cyan ambient reflection from the sky dome in the left foreground.

### 10. The Prismatic Haze (`atmosphere_prismatic_haze`)
- **Visual Silhouette**: Dense horizontal spectral atmospheric banding hugging the low horizon corridor.
- **Coordinates & Extent**: Spans $y \in [0.60, 0.835]$ across the open sky gaps.
- **Coloration & Surface**: Layered rainbow strata: electric turquoise, lime green, pastel gold, soft fuchsia, and lilac.
- **Lighting Dynamics**: Forward Mie scattering from the low horizon light; acts as a luminous backlight for distant spire silhouettes.

---

# 5. Opening Camera Requirements

To achieve the magical *"I clicked on a painting, and then I was inside it"* sensation, the initial 3D virtual camera must reproduce the reference painting's perspective with mathematical rigor.

```
       [Virtual Camera Setup: Pitch Upward 8°, Very Low Horizon]

                      Celestial Sky Dome (Z -> ∞)
                     /
                    /   Apex Flare (y = 17%, x = 82%)
                   /   /
                  /   /
                 /   /  Solar Citadel (Z ≈ 180m)
                /   /  /
               /   /  /
              /   /  /
Camera Eye   /   /  /
(y ≈ 2.0m)  /   /  /
   [o]====>----------- (Pitch: +8° upward)
    | \     \   \  \
    |  \     \   \  \
    |   \     \   \  \
====|====\=====\===\==\========================= Water Horizon Line (y = 84%)
    |     \     \   \  \
 (Ocean)   \     \   \  \
```

### 5.1 Working Hypotheses for Initial Camera-Matching Experiments (Subject to Prototyping Calibration)

> [!NOTE]
> All intrinsic and extrinsic camera parameters tabulated below represent **Working Hypotheses for Initial Camera-Matching Experiments**. Monocular paintings do not possess inherent camera calibration data; these values serve as experimental starting baselines to be iteratively refined during 3D prototyping.

| Parameter | Calibrated Value (Working Hypothesis) | Engineering Rationale & Epistemic Status |
| :--- | :--- | :--- |
| **Aspect Ratio** | $1.0 : 1.0$ ($1024 \times 1024$) | **Directly Observable**: Matches the reference canvas format identically. (Viewport letterboxing/pillarboxing required on standard 16:9 displays). |
| **Horizontal FOV** | $\approx 50^\circ\text{--}60^\circ$ (Nominal $54.0^\circ \pm 2.0^\circ$) | **Working Hypothesis**: Working hypothesis for initial camera-matching experiments: approximately 50°–60° vertical/horizontal-equivalent framing depending on renderer convention. Captures both the left Sentinel and right Citadel without introducing extreme rectilinear wide-angle distortion. |
| **Vertical FOV** | $\approx 50^\circ\text{--}60^\circ$ (Nominal $54.0^\circ$) | **Working Hypothesis**: Derived from 1:1 aspect ratio convention. |
| **Camera Height ($Y_c$)**| $\approx +1.5\text{ m to } +2.5\text{ m}$ above water | **Working Hypothesis**: Low eye-level vantage point, approximately 1.5m to 2.5m above the mean water plane to emphasize wave proximity. |
| **Horizon Viewport $y$**| $y \approx 0.842$ ($84.2\%$ down from top) | **Directly Observable**: Crucial framing rule: the horizon sits in the lower sixth of the viewport to grant $84\%$ of screen space to the soaring spires and celestial sky. |
| **Camera Pitch Angle** | $\approx +7^\circ \text{ to } +9^\circ$ upward (Nominal $+8.0^\circ$) | **Working Hypothesis**: Modest upward tilt of roughly +7° to +9° to seat the horizon near y ≈ 84% while aiming toward the soaring peak of the Solar Citadel ($y \approx 17\%$). |
| **Camera Roll / Yaw** | Roll: $0.0^\circ$, Yaw: $+2.0^\circ$ (subtle right bias) | **Working Hypothesis**: Level horizon with slight rightward yaw focusing the primary view vector toward the gap between Citadel and Midnight Needle. |

---

### 5.2 Perspective Exaggeration & Hybrid Projection Handling

The reference painting displays a classic space-art visual paradox:
1. **The Terrestrial Layer (Spires & Ocean)** obeys normal rectilinear perspective ($\text{FOV} \approx 50^\circ\text{--}60^\circ$).
2. **The Celestial Layer (Umbral Giant & Ember Moon)** displays intense telephoto focal-length compression ($\text{apparent FOV} \approx 15^\circ\text{--}20^\circ$), appearing impossibly colossal relative to the landscape.

#### Technical Resolution for 3D Engine Prototyping:
- **Do not attempt to render the celestial bodies at physically realistic astronomical distances with standard 3D camera geometry**, or they will either shrink to tiny dots or clip local terrain.
- **Decoupled Celestial Sky Projection (Promising Technical Hypothesis to Test in Prototypes)**:
  - The local world (Ocean, Spires, Local Atmosphere) is rendered via the main perspective camera.
  - The celestial backdrop (Umbral Giant, Ember Moon, Cosmic Void) is rendered on a dedicated celestial sky-sphere or background depth layer with independent scale factors.
  - The apparent angular size of the Umbral Giant is fixed to span $\approx 78\%$ of the vertical frame height, preserving its surreal painterly presence during initial camera translations.
  - This decoupled architecture represents a candidate technical hypothesis to be validated during early rendering spikes.

---

### 5.3 Hard Alignment Landmarks (Tolerance $\le 1.0\%$)

At $t = 0$ (the moment of transition), the rendered 3D scene must align with these coordinates within a strict $\pm 1\%$ tolerance:
1. **Solstice Flare Point**: $(x = 82.0\% \pm 0.5\%, y = 17.0\% \pm 0.5\%)$
2. **Solar Citadel Left Shoulder**: $(x = 69.0\% \pm 1.0\%, y = 46.0\% \pm 1.0\%)$
3. **Western Sentinel Apex**: $(x = 14.0\% \pm 0.5\%, y = 36.0\% \pm 0.5\%)$
4. **Midnight Needle Apex**: $(x = 54.5\% \pm 0.5\%, y = 67.5\% \pm 0.5\%)$
5. **Open Water Horizon**: $(y = 84.2\% \pm 0.5\%)$

---

# 6. The 2D → 3D Handoff Problem

> [!IMPORTANT]
> **Pre-Production Architecture Note**: The project and repository remain strictly in **PRE-PRODUCTION**. No final rendering stack, graphics engine (e.g., Three.js, WebGPU, Babylon.js), or handoff architecture has been finalized or chosen. The strategies described below—specifically projective texture mapping onto calibrated proxy geometry—represent **Promising Future Technical Hypotheses** to be evaluated during exploratory prototyping spikes rather than frozen architectural decisions.

The central technical challenge of the Living Poster experience is transitioning from an unlit flat 2D bitmap into a dynamic 3D world without a jarring crossfade or visual "snap."

```
+--------------------------------------------------------------------------------+
|                           THE HANDOFF DIFFICULTY SPECTRUM                     |
+--------------------------------------------------------------------------------+
| EASY (Background)        | MODERATE (Midground Spires)   | HARD (Foreground/FX)|
| • Cosmic Starfield       | • Western Sentinel Geometry   | • Dynamic Water Chop|
| • The Ember Moon         | • Solar Citadel Facets        | • Solstice Starburst|
| • Distant Sky Sphere     | • Aurora Veil Ribbons         | • Occluded Terrain  |
| • Midnight Needle        | • Prismatic Horizon Haze      | • Anamorphic Streak |
+--------------------------------------------------------------------------------+
```

### 6.1 Categorized Handoff Complexity

#### Category A: Relatively Straightforward Elements
- **Cosmic Void, Starfield, and Ember Moon**:
  - *Why*: Infinite distance implies zero motion parallax under camera translation.
  - *Strategy*: Render onto a high-resolution sky dome or background quad with procedural star twinkling shaders.
- **The Umbral Giant**:
  - *Why*: Massive distance; minimal perspective distortion during small camera excursions.
  - *Strategy*: Curved spherical shell textured with high-resolution projected painterly cloud bands and a custom rim-lighting shader.
- **The Midnight Needle & Periphery Needle**:
  - *Why*: Distant, simple vertical silhouettes with minimal visible facet detail.
  - *Strategy*: 2.5D planar billboard cards or low-poly extruded prisms placed at $Z \approx 500\text{m--}650\text{m}$.

#### Category B: Moderately Difficult Elements
- **The Crystalline Spires (Citadel & Sentinel)**:
  - *Why*: Complex, organic, non-Euclidean crystalline geometry. Front silhouette must match the painting pixel-for-pixel at $t = 0$, but when the camera drifts, side facets and three-dimensional thickness will be exposed.
  - *Strategy (Promising Technical Hypothesis)*: Camera-matched photogrammetric/depth-sculpted proxy geometry. At $t = 0$, the painting's original texture is projected via projective texture mapping (UV projection from camera). As the camera moves, procedural shader details (subsurface scatter, micro-faceting, specular glints) blend in smoothly.
- **The Aurora Veil Ribbons**:
  - *Why*: Must transition from flat painted strokes into luminous, undulating volumetric ribbons that weave through physical 3D space between the spires and planet.
  - *Strategy*: Spline-driven ribbon meshes with custom vertex-shader displacement and additive emissive blending.
- **The Prismatic Horizon Haze**:
  - *Why*: Layered spectral gradient that must interact correctly with distance fog.
  - *Strategy*: Multi-layered atmospheric raymarching or stratified exponential height fog with custom spectral transfer functions.

#### Category C: Exceptionally Difficult Elements
- **The Painterly Water Surface (`The Abyssal Sea`)**:
  - *Why*: The water in `poster.jpeg` is not standard PBR ocean water—it consists of expressive, directional, opaque brushstrokes, frozen foam crests, and glowing turquoise pools. Standard realistic 3D ocean shaders (e.g., Gerstner waves with uniform micro-normal maps) instantly destroy the painterly illusion, looking like plastic video game water.
  - *Strategy*: Custom stylized water shader utilizing flow maps, painterly stylized foam textures, and camera-projected initial displacement that gradually awakens into slow, viscous undulating wave motion.
- **The Solstice Flare & Anamorphic Beam**:
  - *Why*: The flare in the reference is an intense 2D optical bloom with a razor-sharp horizontal streak crossing $85\%$ of the canvas. In 3D, a point light or generic bloom pass will look cheap and diffuse.
  - *Strategy*: Multi-element flare system: a core billboard point bloom, procedural geometry-aligned horizontal anamorphic quad, and a physical volumetric cone light casting golden amber atmospheric dust in 3D space.

---

# 7. Occlusion and Hidden-World Analysis

> [!NOTE]
> All reconstruction strategies detailed below are **Working Hypotheses for Pre-Production Prototyping**. Because the project remains in pre-production, these approaches represent creative and technical starting baselines to be validated through progressive camera-drift tests.

When the camera begins to move forward and pan, areas completely hidden in the 2D painting will become visible. The engineering and artistic teams must plan exact reconstruction strategies for every occluded zone.

```
       [OCCLUDED HIDDEN REGIONS REVEALED UNDER CAMERA DRIFT]

  (Hidden Space Behind Left Sentinel)
        \      [Hidden Body of Umbral Giant Behind Citadel]
         \             |
    /\    \            |       /\  (Hidden Reverse Facets of Citadel)
   /  \    \           |      /  \  /
  /    \    \          |     /    \/  <-- [Hidden Seawall & Waterline]
 /      \    \         v    /      \
/ Sentinel\   \       ???  / Citadel\
========================================================================
 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~
  \________________________/ \________________________________________/
     [Hidden Sea Horizon]       [Subsurface Underwater Formations]
```

### 7.1 Occluded Zones & Reconstruction Strategies

| Occluded Area | What Is Hidden in `poster.jpeg` | Exposure Condition | Artistic Reconstruction Strategy (Working Hypothesis) |
| :--- | :--- | :--- | :--- |
| **Reverse & Side Facets of the Solar Citadel** | Backside, right seawall, and deep crevasses of the right massif. | Camera moves forward ($Z > 50\text{m}$) or yaws to the right. | Procedural crystalline geometry generation continuing the angular fracture angles of the front facade. Shaded with cold cyan self-shadowing and warm subsurface light transmission from the peak flare. |
| **Reverse Facets of the Western Sentinel** | The back face and unseen western flank of the left spire. | Camera moves forward or pans left. | Sculpted crystalline obelisk with sharp vertical cleavage planes. Subtle edge-glow matching the aurora illumination. |
| **Ocean Surface Behind Citadel Base** | Ocean floor/surface spanning $x \in [58\%, 100\%], y \in [82\%, 96\%]$. | Camera drifts forward past the near midground. | Procedural wave continuation maintaining the turquoise-to-indigo color ramp, with pronounced bioluminescent churn extending in a halo around the spire footing. |
| **Umbral Giant Disk Behind Citadel** | Lower-right quadrant and planetary limb occluded by the Citadel mass. | Camera moves right or forward, exposing hidden sky. | Texture synthesis continuing the smooth spherical curvature, mauve cloud banding, and golden crescent rim glow across the entire lower limb. |
| **Peripheral Sky & Sea (Beyond 1:1 Canvas)** | The full $360^\circ$ panoramic environment outside the square crop. | Viewing on wide 16:9 displays, or free camera rotation. | Outpainting and procedural environment extension: deep space void continuing to the left and overhead; low horizon with scattered distant needles wrapping the full $360^\circ$; calm, dark alien sea extending to infinity behind the viewer. |
| **Subsurface Underwater Formations** | The physical base of the spires beneath the waterline. | Camera pitches down or gets close to transparent water crests. | Stylized underwater refraction: deep ultramarine absorption with glowing, crystalline footings tapering down into dark abyss, creating the feeling of immense iceberg-like mass. |

---

# 8. Painterly Traits We Must Preserve

The project's North Star dictates: **Preserve the painting before pursuing realism.** Under no circumstances should the 3D environment be converted into a photorealistic, physically based rendering (PBR) tech demo that erases the artistic hand.

```
+--------------------------------------------------------------------------------+
|                    PAINTERLY SOUL vs. REALISTIC 3D TRAPS                      |
+--------------------------------------------------------------------------------+
| PRESERVE THIS (Reference Qualities)    | AVOID THIS (3D Traps)                 |
+--------------------------------------------------------------------------------+
| • Expressive, non-physical light bleed | • Sterile, mathematically uniform PBR |
| • Soft, feathered brushstroke edges    | • Razor-sharp polygonal aliasing      |
| • Opaque, sculptural ocean wave crests | • Generic transparent PBR water       |
| • Saturated fuchsia/cyan complementary | • Desaturated, muddy filmic tonemapping|
| • Visible hand-painted atmospheric haze| • Uniform grey distance fog           |
| • Organic, crystalline faceting        | • Low-poly CAD / faceted blockiness   |
+--------------------------------------------------------------------------------+
```

### 8.1 Critical Visual Traits & Protective Engineering Rules

1. **Non-Physical Light Bleed & Chromatic Savor**:
   - In the reference, the golden Solstice Flare bleeds violently into the dark night sky and spills warm orange/amber light onto crystalline facets that physically should be in shadow.
   - *Rule*: Do not rely solely on physically based lighting equations ($N \cdot L$). Use custom stylized shaders with artistic light wrap, custom ambient occlusion tints (indigo instead of black), and deliberate chromatic spill.
2. **Soft, Brushwork Edges**:
   - The spires and waves do not have sterile, knife-edge polygonal borders. Their edges exhibit slight painterly softness, brush drag, and atmospheric bleeding.
   - *Rule*: Implement a post-processing edge diffusion / painterly pass (subtle Kuwahara or directional blur filter) to soften hard 3D polygon silhouettes into painted strokes.
3. **Sculptural, Viscous Ocean Wave Forms**:
   - The waves resemble carved cerulean wax and sculpted white froth rather than dynamic, transparent liquid water.
   - *Rule*: Render the water surface with high surface opacity, strong subsurface scattering of cyan light, and stylized procedural foam maps derived from the actual brushstroke shapes in `poster.jpeg`.
4. **Impossible Scale and Perspective Compression**:
   - The sheer monumental scale of the Umbral Giant looming directly over sea-level spires defies classical planetary physics.
   - *Rule*: Maintain the surreal, dreamlike proportion. Never rescale celestial bodies to obey physical astronomical distances.
5. **Localized Luminous Water Churn at Spire Base**:
   - At the base of the Solar Citadel ($x \approx 65\%, y \approx 88\%$), the water churn displays a distinctive radiant turquoise glow (observable pixel fact), interpreted as an active bioluminescent bloom or intense subsurface scatter (working hypothesis).
   - *Rule*: Implement localized point lights, emissive mesh painting, or custom shader glow at the waterline to preserve this luminous churn.

---

# 9. Color and Light Study

The color harmony of `poster.jpeg` is a masterclass in chromatic temperature contrast: **blinding, incandescent warm gold and fiery amber set against freezing cosmic indigo, deep ultramarine, and electric cyan.**

```
+--------------------------------------------------------------------------------+
|                               PALETTE BREAKDOWN                                |
+--------------------------------------------------------------------------------+
| COLOR NAME              | HEX CODE   | RGB (0-255)     | APPLICATION           |
+--------------------------------------------------------------------------------+
| Deep Cosmic Void        | #070714    | (7, 7, 20)      | Upper sky, deep space |
| Midnight Indigo         | #0E1128    | (14, 17, 40)    | Starfield transition  |
| Umbral Giant Mauve      | #2E2558    | (46, 37, 88)    | Planet shadow bands   |
| Umbral Giant Slate      | #3F367A    | (63, 54, 122)   | Planet midtone cloud  |
| Abyssal Ocean Deep      | #0B2248    | (11, 34, 72)    | Wave trough base      |
| Abyssal Ocean Mid       | #143A66    | (20, 58, 102)   | General sea surface   |
| Crystalline Base Cyan   | #2A7B9B    | (42, 123, 155)  | Spire shadowed flanks |
| Crystalline Vibrant     | #3CA5C4    | (60, 165, 196)  | Spire midtone facets  |
| Crystalline Highlight   | #8AE6FB    | (138, 230, 251) | Spire sunlit ridges   |
| Bioluminescent Seafoam  | #6EE5E6    | (110, 229, 230) | Water churn at spire  |
| Crest Foam White        | #C2F8FF    | (194, 248, 255) | Wave caps & highlights|
| Solstice Core White     | #FFFFFF    | (255, 255, 255) | Starburst center point|
| Solstice Halo Gold      | #FFE580    | (255, 229, 128) | Inner radiant flare   |
| Solstice Flare Amber    | #FFC038    | (255, 192, 56)  | Mid flare halo & beam |
| Solstice Scatter Orange | #F97A32    | (249, 122, 50)  | Outer halo diffusion  |
| Sunset Crimson/Rose     | #E0482B    | (224, 72, 43)   | Horizon sky glow      |
| Aurora Neon Magenta     | #E6358C    | (230, 53, 140)  | Aurora ribbon core    |
| Aurora Deep Fuchsia     | #D12078    | (209, 32, 120)  | Aurora ribbon trail   |
| Ember Moon Crimson      | #7E4A62    | (126, 74, 98)   | Satellite moon disk   |
| Prismatic Haze Lime     | #8BD48F    | (139, 212, 143) | Horizon spectral band |
+--------------------------------------------------------------------------------+
```

### 9.1 Lighting Dynamics & Key Light Model

```
               [KEY LIGHT: The Solstice Flare (82%, 17%)]
               Color: #FFF4D0 -> #FFC038 (Intense Warm Gold)
               Intensity: Blinding / Incandescent Core
                     /              \
                    /                \ (Direct Golden Glints)
                   v                  v
         [Umbral Giant Limb]     [Citadel Facets]
         Crescent Amber Rim      Warm Edge Lighting
                                      |
                                      v
                             [The Abyssal Sea]
                             Golden Specular Trail (Right)
                                      ^
                                      | (Turquoise Bioluminescent Churn)
     [AMBIENT LIGHT: Cosmic Sky Dome]  |
     Color: #0B1736 -> #2A7B9B        v
     Cold Cyan / Indigo Fill    [Spire Footing Glow]
```

1. **Dominant Key Light (The Solstice Flare)**:
   - Positioned at $(0.820, 0.170)$, cast from high-right toward down-left.
   - Produces brilliant warm amber/gold edge highlights on the right facets of the Citadel and a sharp golden specular trail across the right ocean surface.
   - Catches the lower-right perimeter of the Umbral Giant in a radiant crescent halo.
2. **Secondary Key Light (Aurora Emissive Radiance)**:
   - Soft, omnidirectional neon fuchsia/magenta bounce cast downward from the atmospheric ribbons onto the upper cloud decks of the Umbral Giant.
3. **Ambient Fill Light (Deep Cosmic Sky & Sea Bounce)**:
   - Non-directional fill in cold indigo and deep cyan (`#0B2248` to `#2A7B9B`), ensuring that shadows on the Western Sentinel and Citadel never clip to pure black, retaining rich painterly chrominance.
4. **Waterline Luminous Accent (Working Hypothesis: Localized Emissive / Bioluminescent Light)**:
   - The observable visual feature is a localized pool of brilliant turquoise/aquamarine light (`#6EE5E6`) at the base of the Solar Citadel ($x \approx 58\%\text{--}75\%, y \approx 84\%\text{--}94\%$).
   - Modeling this as an upward-pointing localized area light or emissive wash illuminating the lower sea ice is a lighting hypothesis for pre-production prototyping (which can also be explored as subsurface scattering or painterly reflection).

---

# 10. Motion Opportunities

The reference painting represents a frozen, timeless moment. When the visitor clicks **ENTER** and the painting begins to "awaken," motion must be introduced with extreme elegance, restraint, and hypnotic beauty. Fast, frantic, or arcade-like movement will instantly destroy the sublime mood.

> [!NOTE]
> All motion cycle times and temporal frequencies listed below (e.g., $0.08\text{ Hz}$ ocean swell, $0.05\text{ Hz}$ aurora undulation) represent **Working Hypotheses / Stylistic Starting Points** for animation prototyping. They serve as baseline aesthetic targets to prevent frantic motion and will be iteratively tuned during interactive user testing.

```
+--------------------------------------------------------------------------------------------------+
|                                    HYPNOTIC "AWAKENING" MOTION                                   |
+--------------------------------------------------------------------------------------------------+
| SYSTEM            | MOTION BEHAVIOR                    | TEMPORAL FREQUENCY (Stylistic Baselines)|
+--------------------------------------------------------------------------------------------------+
| Abyssal Sea       | Slow, heavy, viscous swell         | 0.08 Hz (12.5s cycle) [Working Hypoth.] |
| Seafoam Crests    | Gentle lateral drift & dissolution | 0.04 Hz (25s cycle)   [Working Hypoth.] |
| Aurora Veil       | Undulating sine-wave ribbons       | 0.05 Hz (20s cycle)   [Working Hypoth.] |
| Solstice Flare    | Subtle breathing core & halo pulse | 0.15 Hz (6.6s cycle)  [Working Hypoth.] |
| Anamorphic Beam   | Micro-shimmer & light crawl        | 0.30 Hz (3.3s cycle)  [Working Hypoth.] |
| Cosmic Stardust   | Floating buoyant micro-sparks      | Brownian drift        [Working Hypoth.] |
| Water Caustics    | Shimmering refractive turquoise    | 0.20 Hz (5.0s cycle)  [Working Hypoth.] |
| Camera Entry Drift| Slow forward push & gentle drift   | Continuous glide      [Working Hypoth.] |
+--------------------------------------------------------------------------------------------------+
```

### 10.1 Detailed Motion Systems

*(Note: All frequency values and rates below represent Working Hypotheses / Stylistic Starting Points)*

1. **The Heavy Ocean Swell**:
   - The alien sea should move at **0.5× realistic Earth wave speed** (working hypothesis: $\approx 0.08\text{ Hz}$ swell).
   - It should feel dense, cold, and viscous—like liquid methane or heavy brine rather than light splashy water. Waves roll forward with immense momentum, avoiding high-frequency jitter.
2. **Aurora Ribbon Undulation**:
   - The twin magenta ribbons undulate through space using smooth, layered sine-wave domain warping (working hypothesis: $\approx 0.05\text{ Hz}$).
   - Opacity pulses gently, simulating geomagnetic solar wind surges flowing across the upper atmosphere.
3. **Solstice Flare Breathing**:
   - The core starburst breathes with a slow, meditative rhythm (working hypothesis: $\approx 0.15\text{ Hz}$).
   - The horizontal anamorphic streak emits subtle, traveling chromatic shimmers along its beam line ($x \in [15\%, 100\%]$).
4. **Atmospheric Stardust Drift**:
   - Microscopic, luminous cosmic dust particles drift lazily through the air currents between the camera and the spires, catching the golden light of the Solstice Flare as they cross the beam.
5. **Waterline Luminous Churn Shimmer**:
   - The bright cyan churn at the Citadel base pulses with soft, undulating brightness, evoking bioluminescent microbial activity or active tidal luminescence in the freezing surf.

---

# 11. Sound Implied by the Image

Sound is the invisible half of the Living Poster experience. It bridges the sensory gap, transforming a visual painting into a living, breathing reality. The soundscape must feel vast, ancient, lonely, and tranquil.

> [!NOTE]
> All frequency bands, acoustic values (e.g., $35\text{--}45\text{ Hz}$ sub-bass hum), and musical tonalities represent **Working Hypotheses / Stylistic Starting Points** for spatial sound design. They provide initial scaffolding for audio composition and synthesis, subject to acoustic calibration during prototyping.

```
+--------------------------------------------------------------------------------------------------+
|                                    SPATIAL AUDIO ARCHITECTURE                                    |
+--------------------------------------------------------------------------------------------------+
| FREQUENCY BAND (Stylistic Baselines) | LAYER NAME            | SONIC CHARACTER                   |
+--------------------------------------------------------------------------------------------------+
| 20 Hz - 60 Hz [Working Hypothesis]   | Sub-Bass Planetary Hum| Deep, tectonic resonant drone     |
| 60 Hz - 250 Hz                       | Viscous Ocean Slosh   | Heavy water rolling against ice   |
| 200 Hz - 800 Hz                      | High-Altitude Wind    | Desolate, whistling cosmic airflow|
| 500 Hz - 2.5 kHz                     | Crystalline Resonator | Harmonic singing crystal glass    |
| 2 kHz - 8 kHz                        | Atmospheric Aurora Hum| Gentle electrostatic noise hum    |
| 6 kHz - 16 kHz                       | Solstice Shimmer      | Delicate celestial chimes         |
+--------------------------------------------------------------------------------------------------+
```

### 11.1 Audio Layer Breakdown

1. **Continuous Ambience (The Core Drone)**:
   - **Sub-Bass Planetary Hum (Working hypothesis: $35\text{--}45\text{ Hz}$)**: A warm, subterranean resonant drone conveying the immense gravitational presence of the Umbral Giant hanging in the sky.
   - **Ethereal Synth Pad**: A lush, slow-evolving chord (working hypothesis: open fifths in $D\text{ minor}$ or $F\text{ lydian}$) played on vintage analog-style synthesizers with long tape-delay reverb.
2. **Environmental Water & Ice**:
   - **Viscous Oceanic Slosh**: Muffled, deep rolling waves breaking gently against crystalline sea-cliffs. Distinct lack of harsh splashy high frequencies; rich in warm, low-mid aquatic thuds.
   - **Brine Swirl**: Subtle underwater churning sounds panned toward the right audio channel, corresponding to the luminous churn at $(0.65, 0.88)$.
3. **Crystalline & Atmospheric Whispers**:
   - **High-Altitude Cosmic Wind**: Gentle, desaturated wind howling softly across the needle peaks of the spires.
   - **Singing Crystal Resonance**: Subtle, intermittent glass-harmonica or singing-bowl resonant frequencies triggered as the wind catches the sharp crystal facets.
   - **Electrostatic Aurora Sizzle**: Very soft, tape-like electrostatic hiss and crackle accompanying the pulse of the magenta ribbons.
4. **The "Awakening" Entry Transition Swell**:
   - When the user activates **ENTER**, a harmonically rich, binaural rising swell (reminiscent of an orchestra tuning or a THX-style deep harmonic crescendo) rises from silence, blooming into full spatial audio exactly as the 2D image transforms into 3D space.

---

# 12. Fidelity Risks (Ranked Highest to Lowest)

To safeguard the project against artistic failure, we identify the primary technical traps and prioritize them from highest risk to lowest risk.

```
       [FIDELITY RISK HIERARCHY]
  
  [RANK 1] ===> PBR Water Sterility (Highest Risk of Ruining Illusion)
     |
  [RANK 2] ===> Generic 3D Asset Replacement for Spires
     |
  [RANK 3] ===> Flattening of Non-Physical Color Harmony
     |
  [RANK 4] ===> Incorrect Camera FOV / Perspective Mismatch
     |
  [RANK 5] ===> Abrupt 2D-to-3D Transition Cut
     |
  [RANK 6] ===> Loss of Painterly Edge Softness & Diffusion
     |
  [RANK 7] ===> Overly Rapid / Chaotic Motion (Lowest Major Risk)
```

### 12.1 Detailed Risk Analysis & Mitigation Protocols

#### Rank 1: PBR Water Sterility (Highest Risk)
- **The Threat**: Standard WebGL/Three.js ocean implementations rely on generic water shaders (transparent surface, standard normal map ripples, physical sun specular dot). This immediately looks like an early-2000s videogame and completely destroys the rich, opaque, painterly foam and turquoise brushwork of the Abyssal Sea.
- **Mitigation**: Develop a custom stylized water shader that treats the surface as an animated painterly canvas. Use custom foam masks sampled directly from `poster.jpeg`, enforce high opacity with turquoise subsurface scattering, and prohibit generic realistic water assets.

#### Rank 2: Generic 3D Asset Replacement for Spires
- **The Threat**: Substituting the bespoke, hand-painted crystalline spires with stock low-poly rock models, generic procedural Voronoi mountains, or photorealistic basalt cliffs. The original silhouettes are legendary and irreplaceable.
- **Mitigation**: Sculpt proxy geometry that matches the exact silhouette contours of the Solar Citadel and Western Sentinel using camera-matching photogrammetry. Project the original painted textures directly onto the forward-facing geometry.

#### Rank 3: Flattening of Non-Physical Color Harmony
- **The Threat**: Feeding the scene through standard ACES or Filmic tonemappers that wash out the intense saturated contrast between the warm golden flare (`#FFE580`), neon magenta ribbons (`#E6358C`), and deep cerulean ice (`#2A7B9B`).
- **Mitigation**: Use custom color grading LUTs or custom transfer curves that protect saturated primaries and maintain the vibrant painterly palette without clipping shadows to black.

#### Rank 4: Incorrect Camera FOV / Perspective Mismatch
- **The Threat**: Setting the virtual camera FOV too wide ($75^\circ\text{--}90^\circ$) or too narrow ($30^\circ$), which distorts the spatial relationship between the spires and compresses the horizon.
- **Mitigation**: Calibrate camera parameters experimentally within the working hypothesis range ($\sim 50^\circ\text{--}60^\circ\text{ FOV}$, $+7^\circ\text{--}+9^\circ\text{ pitch upward}$, targeting horizon alignment at $y \approx 84.2\%$).

#### Rank 5: Abrupt 2D-to-3D Transition Cut
- **The Threat**: Simply crossfading between a flat `<img>` tag and a WebGL canvas over 1.0 second. The viewer instantly spots the "seam" and the magic is broken.
- **Mitigation**: Prioritize testing continuous transition techniques during pre-production spikes (such as camera-matched projective texture mapping or depth-guided displacement), avoiding simple alpha dissolves that expose visual seams.

#### Rank 6: Loss of Painterly Edge Softness & Diffusion
- **The Threat**: High-resolution anti-aliased 3D geometry produces sharp, sterile vector edges that look synthetic and detached from the painted world.
- **Mitigation**: Integrate a subtle post-process edge-diffusion shader that maintains painterly brushstroke edges on distant silhouettes.

#### Rank 7: Overly Rapid / Chaotic Motion
- **The Threat**: Setting wave speeds, camera flying speeds, or aurora animations to realistic Earth rates, transforming a tranquil, majestic painting into an agitated arcade scene.
- **Mitigation**: Test subdued, time-dilated rates across motion prototypes (e.g. ~0.5× Earth baseline speed) to maintain a tranquil, contemplative mood.

---

# 13. Visual Success Criteria

To establish objective validation for the Living Poster implementation, the following measurable tests must be satisfied at runtime.

```
+---------------------------------------------------------------------------------------------------------------------+
|                                           OBJECTIVE SUCCESS VERIFICATION                                            |
+---------------------------------------------------------------------------------------------------------------------+
| TEST SUITE                    | CRITERIA                               | STATUS / TARGET PHASE                       |
+---------------------------------------------------------------------------------------------------------------------+
| 1. Silhouette IoU Test        | ≥ 95% Intersection-over-Union at t = 0 | TARGET (Pre-Production Verification Suite)  |
| 2. Landmark Position Tolerance| Within ±1.0% of Reference Coordinates  | TARGET (Pre-Production Verification Suite)  |
| 3. Horizon Line Alignment     | y = 84.2% ± 0.5%                       | TARGET (Pre-Production Verification Suite)  |
| 4. Chromaticity Delta-E Test  | ΔE < 3.0 on 12 Key Sample Points       | TARGET (Pre-Production Verification Suite)  |
| 5. The "Blink Test"           | Zero perceptible jump on frame toggle  | TARGET (Pre-Production Verification Suite)  |
+---------------------------------------------------------------------------------------------------------------------+
```

### 13.1 Concrete Verification Procedures

1. **The Silhouette Mask Alignment Test ($\ge 95\%$ IoU)**:
   - *Procedure*: Render the 3D proxy geometry from the initial camera pose at $t = 0$ as a binary silhouette mask. Compare it against the ground-truth segmentation mask of `poster.jpeg`.
   - *Requirement*: The Intersection-over-Union (IoU) metric across the Solar Citadel and Western Sentinel must exceed **$95\%$**.
2. **Landmark Position Tolerance ($\le 1.0\%$)**:
   - *Procedure*: Project the 3D world coordinates of all major landmark apices into normalized viewport coordinates $(x, y)$.
   - *Requirements*:
     - Solstice Flare Apex: $(0.820 \pm 0.005, 0.170 \pm 0.005)$
     - Western Sentinel Apex: $(0.140 \pm 0.005, 0.360 \pm 0.005)$
     - Midnight Needle Apex: $(0.545 \pm 0.005, 0.675 \pm 0.005)$
3. **Horizon Line Match ($y \approx 84.2\% \pm 0.5\%$)**:
   - The boundary between open sea water and sky in the central corridor ($x \in [0.35, 0.50]$) must lie exactly within $y \in [0.837, 0.847]$.
4. **Chromaticity Delta-E Consistency ($\Delta E < 3.0$)**:
   - *Procedure*: Sample RGB color values at 12 key pixel coordinates across the rendered 3D frame at $t = 0$ (e.g., Flare Core, Citadel Midtone, Sentinel Rim, Ocean Deep, Aurora Core, Umbral Cloud).
   - *Requirement*: The CIE Delta-E ($2000$) color difference between rendered pixels and reference pixels must remain below $3.0$ (imperceptible color shift).
5. **The Ultimate "Blink Test"**:
   - *Procedure*: Build an interactive debug toggle that flips between `reference/poster.jpeg` and the rendered 3D scene at $t = 0$ at $2\text{ Hz}$ (twice per second).
   - *Requirement*: An observer should perceive **zero jumping, shifting, popping, or snapping** of major silhouettes, colors, or horizon lines. The transition must feel completely continuous.

---

# 14. Unknowns and Questions

During pre-production analysis, several technical and creative ambiguities remain open. Documenting them now ensures deliberate decisions during prototyping rather than accidental compromises later.

```
+--------------------------------------------------------------------------------+
|                         OPEN QUESTIONS & UNKNOWNS                              |
+--------------------------------------------------------------------------------+
| QUESTION / UNKNOWN                    | IMPACT AREA    | PROPOSED PROTOTYPE    |
+--------------------------------------------------------------------------------+
| 1. Physical Fluid vs. Frozen Slush    | Water Shader   | Dual-mode shader test |
| 2. Backside World Behind Citadel      | 3D Environment | Outpainted vista proxy|
| 3. Astronomical Solstice Flare Depth  | Lighting/Camera| Hybrid light emitter  |
| 4. The 360° Reverse Horizon Vista     | Immersion/Sky  | Procedural HDRI map   |
| 5. Core Transition Engine Architecture| 2D->3D Handoff | Projective mesh warp  |
+--------------------------------------------------------------------------------+
```

### 14.1 Exploration of Key Unknowns

1. **Fluid Composition: Liquid Water, Heavy Brine, or Frozen Slush?**
   - *The Ambiguity*: The waves have sculptural, opaque white crests that could indicate liquid water under high winds, or freezing cryogenic slush/slurpee-like consistency common on sub-zero moons (e.g., Titan, Europa).
   - *Creative Path*: A slightly viscous, heavy fluid (viscosity $\sim 2\text{--}3\times$ water) creates far more poetic, slow-motion wave action that honors the heavy brushwork in the painting.
2. **The Hidden World Behind the Solar Citadel**:
   - *The Ambiguity*: The Citadel covers nearly $30\%$ of the canvas. When the visitor navigates around it, does the open ocean continue indefinitely, or is there an archipelago of crystalline spires, or a continental ice shelf?
   - *Creative Path*: In the initial prototype ("The World"), restrict camera travel to a generous viewing corridor in front of and between the spires. Suggest distant continuations via atmospheric haze rather than building an open-world continent.
3. **The Astronomical Nature of the Solstice Flare**:
   - *The Ambiguity*: Is the flare an infinite-distance star (a distant sun in a binary system) perfectly eclipsed by the spire peak, or is it a focusing crystal radiating concentrated planetary energy?
   - *Creative Path*: Treat it as a sacred cosmic alignment—a distant background sun aligned with the spire pinnacle. As the camera moves, allow a delicate parallax offset where the sun emerges from behind the crystal apex, casting blinding lens flare across the camera lens.
4. **The $360^\circ$ Reverse Camera Vista**:
   - *The Ambiguity*: The reference is strictly a forward-facing 1:1 square crop. What does the visitor see if they rotate the camera $180^\circ$?
   - *Creative Path*: The reverse hemisphere should feature the deep, silent expanse of the Abyssal Sea extending to a dark horizon under an expansive cosmic starfield, free of giant planets, providing a quiet, contemplative contrast to the dramatic proscenium ahead.
5. **Technical Transition Mechanism: Mesh Warp vs. Proxy Blend**:
   - *The Ambiguity*: How to achieve the awaken phase? Option 1: 2.5D displacement mesh directly warping the 2D image into 3D. Option 2: Pre-aligned 3D scene that starts with projective camera textures and blends into dynamic procedural shaders.
   - *Recommendation (Promising Technical Hypothesis)*: Option 2 (Proxy Geometry with Projective Texture Mapping) provides vastly superior freedom for continuous camera navigation after the transformation completes, serving as our primary candidate hypothesis for pre-production testing.

---

# Confidence Ledger

To ensure rigorous pre-production discipline, this ledger records the most consequential observations, interpretations, and engineering assumptions identified across `reference/poster.jpeg`. Every item is classified according to the Three-Tier Epistemic Framework, establishing its confidence level and project impact.

| Observation | Confidence | Classification | Why It Matters |
| :--- | :---: | :--- | :--- |
| **1:1 Square Canvas Format** ($1024 \times 1024\text{ px}$) | **HIGH** | Directly Observable | Dictates default 1:1 viewport aspect ratio, viewport letterboxing/pillarboxing on 16:9 displays, and baseline camera sensor dimensions. |
| **Low Horizon Line at $y \approx 84\%$** | **HIGH** | Directly Observable | Grants ~84% of vertical screen space to the soaring spires and celestial sky, establishing monumental upward grandeur and requiring an upward camera pitch (+7° to +9°). |
| **Solstice Flare Apex at $(82.0\%, 17.0\%)$** | **HIGH** | Directly Observable | Primary visual key light and highest-contrast focal anchor; serves as the critical landmark for camera alignment tolerance ($\le 1.0\%$). |
| **Colossal Celestial Body Disk** ($\text{diameter} \approx 78\%$ frame height) | **HIGH** | Directly Observable | Establishes extreme visual telephoto compression against local terrain; anchors upper-right celestial quadrant. |
| **Celestial Body as a Gas Giant / Distant Planetary World** | **MEDIUM** | Strong Inference | Guides surface texture design, planetary cloud banding shaders, and terminator lighting without mistaking artistic rendering for empirical astrophysics. |
| **Ember Moon Companion Disk at $(34.5\%, 2.5\%)$** | **HIGH** | Directly Observable | Balances upper-left cosmic void quadrant and establishes multi-body orbital depth in the celestial background plane. |
| **Atmospheric Ribbons Occluding Planet Behind Spires** | **HIGH** | Directly Observable | Verifies definitive spatial occlusion hierarchy: Foreground Waves $\prec$ Spires $\prec$ Atmospheric Ribbons $\prec$ Planet Disk $\prec$ Deep Starfield. |
| **Atmospheric Ribbons as Physical Ionospheric Auroral Plasma** | **MEDIUM** | Working Hypothesis | Serves as a stylistic and physical starting point for procedural spline undulation ($0.05\text{ Hz}$), particle flow, and emissive bloom shaders. |
| **Spire Silhouette Contours & Asymmetric Proscenium** | **HIGH** | Directly Observable | Forms the natural framing gateway; strict silhouette matching ($\ge 95\%$ IoU) at $t = 0$ is required to prevent visual snapping during 2D $\rightarrow$ 3D handoff. |
| **Spires Composed of Crystalline Rock or Glacial Ice** | **MEDIUM** | Strong Inference | Informs material shader development (subsurface light transmission, sharp facet roughness, cyan specular edge-bleed) rather than standard matte rock. |
| **Water Surface Chop & Opaque Sculptural Foam Crests** | **HIGH** | Directly Observable | Establishes the non-physical, painterly nature of the sea; explicitly bans generic transparent PBR water shaders in favor of stylized painterly foam masks. |
| **Luminous Water Churn at Citadel Base as Bioluminescence** | **LOW** | Working Hypothesis | Provides a creative starting point for localized cyan emissive lighting at the waterline; could alternatively be modeled as subsurface scattering or painterly reflection. |
| **Metric Scale Scaffolding** (Citadel 420m, Sentinel 180m, Depths 2m–1200m) | **LOW** | Working Hypothesis | Supplies initial numerical scaffolding for 3D spatial staging; monocular paintings contain no ground-truth metric scale, so all values are subject to prototype calibration. |
| **Camera FOV $\approx 50^\circ\text{--}60^\circ$** | **MEDIUM** | Working Hypothesis | Serves as the calibrated starting baseline for camera-matching experiments to avoid wide-angle edge distortion or excessive telephoto flattening. |
| **Camera Eye Height $\approx 1.5\text{m to } 2.5\text{m}$ Above Water** | **MEDIUM** | Working Hypothesis | Places the virtual viewer directly into the visceral ocean chop; easily adjusted during early camera navigation prototypes. |
| **Solstice Flare Astronomical Depth** (Distant Sun vs. Spire Beacon) | **MEDIUM** | Working Hypothesis | Resolves parallax breakage under camera motion by testing a hybrid model (infinite sky sun + co-located volumetric emitter at spire apex). |
| **Decoupled Celestial Sky Projection** | **MEDIUM** | Working Hypothesis | Promising candidate architecture to resolve the space-art perspective paradox (rectilinear landscape vs. telephoto planet) without terrain clipping. |
| **Projective Proxy Geometry as Handoff Technique** | **MEDIUM** | Working Hypothesis | Primary candidate handoff hypothesis for initial pre-production spikes; preserves repository flexibility while architectural decisions remain unfrozen. |

---

# 15. Final Assessment

### 15.1 Suitability for the "Living Poster" Experience
`reference/poster.jpeg` is an **exceptionally ideal candidate** for the *"I clicked on a painting, and then I was inside it"* experience:
1. **Theatrical Natural Proscenium**: The asymmetric framing provided by the Western Sentinel on the left and the Solar Citadel on the right naturally cradles the viewer, drawing the eye into the deep central gateway.
2. **Clear, Unambiguous Depth Stratification**: The scene breaks cleanly into five distinct spatial planes (Foreground Waves $\rightarrow$ Midground Spires $\rightarrow$ Horizon Needles $\rightarrow$ Atmospheric Auroras $\rightarrow$ Infinite Celestial Sky), allowing an intuitive 2D $\rightarrow$ 3D mapping.
3. **Electrifying Emotional Palette**: The contrast between freezing cyan crystal, deep cosmic indigo, and blinding golden solstice light creates an unforgettable, dreamlike atmosphere that will captivate visitors the instant it awakens.

### 15.2 The Hardest Elements to Preserve
1. **The Sculptural Painterliness of the Water**: Preventing the Abyssal Sea from degenerating into generic, transparent videogame water is the #1 graphical challenge.
2. **The Blinding Atmospheric Flare & Beam**: Preserving the raw painterly intensity and horizontal reach of the Solstice Flare without relying on muddy screen-space bloom passes.
3. **The Organic Crystal Faceting**: Retaining the hand-carved, non-Euclidean angles of the spires so they feel like sacred alien ice monuments rather than low-poly 3D models.

### 15.3 The Make-or-Break Factor
The ultimate success of the Living Poster project hinges on **the first three seconds of transition**:
> If the visitor clicks **ENTER** and witnesses the exact pixels of the painting organically gain depth, breathe with viscous motion, and smoothly yield to forward camera parallax without a perceptible cut or loss of artistic soul, the illusion is triumphant.

Everything we build must serve that transcendent moment.
