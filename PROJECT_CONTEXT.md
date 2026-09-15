# Living Poster

## Project Identity

**Living Poster** is an interactive web art experience built around one primary piece of artwork:

`reference/poster.jpeg`

The visitor initially encounters the original artwork as a flat, full-screen image.

A minimal invitation such as **ENTER** or **BEGIN** appears.

When activated, the artwork should gradually awaken, gain physical depth, and transform as continuously as possible into an explorable 3D environment.

The visitor then moves forward into that world.

The central experience is:

> "I clicked on a painting, and then I was inside it."

Everything we build should strengthen that illusion.

---

# Primary Reference

The canonical visual source is:

`reference/poster.jpeg`

This artwork is the source of truth for:

- composition
- color
- silhouettes
- lighting
- atmosphere
- scale
- environmental forms
- visual hierarchy
- landmark placement
- mood

The 3D environment must feel like this specific artwork translated into physical space.

It must not gradually become a generic science-fiction landscape that merely resembles it.

---

# Critical Creative Rule

## Preserve the painting before pursuing realism.

If there is a conflict between:

1. creating technically realistic 3D graphics

and

2. preserving the visual identity and dreamlike painted quality of `poster.jpeg`

prefer **#2**.

The intended result is not a realistic simulation of an alien planet.

It is an explorable painting.

Stylization, controlled distortion, impossible scale, painted textures, unusual lighting, exaggerated silhouettes, and other non-realistic techniques are explicitly acceptable when they help preserve the reference artwork.

---

# Major Visual Anchors

These elements strongly define the source image.

Their appearance may evolve when translated into three dimensions, but their identity should remain recognizable.

## Crystalline / icy spires

Large blue and cyan formations rise dramatically from the water.

They possess irregular, striking silhouettes.

They should remain sculptural and painterly rather than becoming ordinary mountains.

The large formations visible in the original composition should eventually act as recognizable landmarks inside the environment.

---

## Giant celestial body

A massive blue-violet planet dominates much of the sky.

Its enormous apparent size is a defining surreal feature.

Do not reduce it to a small realistic planet in the distance.

It should feel impossibly close and enormous.

---

## Horizon light

An intense white-gold celestial light sits near the horizon above one of the major spires.

The surrounding atmosphere transitions through:

- white
- gold
- orange
- pink
- magenta
- violet
- blue

The contrast between warm celestial illumination and the cold blue environment is fundamental to the image.

---

## Magenta atmospheric ribbons

Flowing pink and magenta luminous forms stretch through the atmosphere.

Their eventual implementation is intentionally undecided.

Possibilities could include:

- volumetric light
- translucent geometry
- shaders
- particles
- animated textures
- procedural effects
- generated imagery

Their visual identity matters more than their technical implementation.

---

## Ocean / frozen water

The lower portion of the artwork contains luminous blue water or an icy alien sea.

It contains strong reflected light and painterly surface detail.

It should not become generic realistic ocean water.

Its treatment should remain cold, strange, luminous, and connected to the style of the source image.

---

## Stars and distant atmosphere

The sky includes stars, atmospheric haze, soft gradients, and considerable depth.

Distance should feel mysterious rather than geometrically sterile.

Fog, haze, scattered light, soft silhouettes, and other atmospheric techniques may be used to make the environment appear much larger than the physically modeled area.

---

# Emotional Direction

Living Poster should primarily feel:

- dreamy
- tranquil
- mysterious
- enormous
- surreal
- beautiful
- slightly lonely
- cosmic
- painterly
- inviting
- otherworldly

It should not primarily feel:

- cyberpunk
- industrial
- dystopian
- militaristic
- horror-oriented
- hard-science simulation
- generic fantasy RPG
- conventional videogame level

---

# Experience States

The experience should eventually contain three major states.

## 1. THE POSTER

The original image is presented with minimal interference.

It should initially feel like the visitor is looking at a piece of artwork.

The interface should be extremely restrained.

No unnecessary HUD or conventional videogame UI should be visible.

---

## 2. THE AWAKENING

After the visitor selects ENTER or BEGIN, the artwork starts gaining depth.

This transformation is one of the most important parts of the entire project.

It should feel like the image itself is becoming spatial.

We should avoid:

- hard cuts
- obvious scene swaps
- simply fading one image out and another scene in

Potential techniques may later include:

- depth estimation
- image segmentation
- displacement
- parallax
- camera matching
- perspective projection
- generated hidden regions
- layered imagery
- fog
- bloom
- particles
- geometry emerging from painted forms
- carefully synchronized crossfades
- lighting changes
- camera movement

These are possibilities rather than predetermined requirements.

We should prototype and choose whichever techniques make the transformation most convincing.

---

## 3. THE WORLD

The transition eventually places the visitor inside a true navigable three-dimensional environment.

The visitor should be able to move beyond the original camera position and experience areas that were previously implied by the flat artwork.

The first version should remain intentionally small.

We want:

> one extraordinary explorable environment

rather than:

> a large mediocre open world

Atmosphere, distant scenery, scale, fog, and inaccessible vistas may be used to imply a much larger world.

---

# Camera Matching

The opening 3D camera must eventually reproduce the original poster composition as closely as practical.

This is extremely important.

At the beginning of the transformation, major landmarks in the rendered world should visually align with their corresponding forms in the original image.

The transition will be substantially more convincing if the viewer initially cannot easily identify the exact moment at which the flat artwork becomes the rendered world.

After the transformation completes, the camera is free to leave the original composition and explore the environment.

---

# Exploration Philosophy

This is an interactive art piece first.

It is not currently intended to become a conventional game.

Initial exploration should prioritize:

- intuitive movement
- smooth controls
- slow or graceful pacing
- visual discovery
- atmosphere
- scale
- environmental sound

Avoid adding systems merely because games normally have them.

Unless later explicitly requested, do not add:

- combat
- enemies
- inventory
- quests
- skill trees
- scoring
- conventional HUD elements

Small environmental interactions may eventually be appropriate if they strengthen immersion.

---

# Sound

Sound is expected to become an important component of Living Poster.

Possible elements include:

- ambient cosmic tones
- distant wind
- water or ice movement
- crystalline resonance
- subtle spatial sounds
- atmospheric drones
- entry-transition swell
- occasional environmental accents

AI-generated audio may be used when appropriate.

Sound should enhance the sensation of entering the artwork rather than dominate it.

---

# AI and Development Environment

This project will primarily be created using **Antigravity and Gemini 3.8 Flash**.

Use available Antigravity/Gemini capabilities aggressively when they meaningfully improve the project, including:

- code generation
- code analysis
- visual reasoning
- image analysis
- image generation
- asset generation
- audio generation
- debugging
- research
- testing
- iteration

Other models may be used selectively.

Potential escalation tools include:

- **Astra Low** for a rare, high-value architecture or reasoning pass
- **Grok 4.6 Extra High through Cursor** for unusually difficult coding, debugging, optimization, architecture, or refactoring

Antigravity should nevertheless remain the primary development environment.

---

# Technical Philosophy

The specific rendering architecture has NOT yet been finalized.

Possible technologies include Three.js, WebGL, WebGPU, shaders, generated assets, 2.5D techniques, true 3D geometry, or combinations of these.

Do not prematurely commit the project to an implementation merely because it is familiar.

Choose techniques based on how well they support the central illusion.

Engineering should favor:

- modular systems
- understandable files
- explicit state management
- incremental development
- visual testability
- measurable performance
- graceful degradation
- easy iteration

Avoid:

- giant monolithic files
- uncontrolled procedural complexity
- premature abstraction
- unnecessary dependencies
- duplicated systems
- unexplained magic numbers

---

# Performance Philosophy

Smoothness is part of the artistic experience.

The transition into the world must feel deliberate and fluid.

Prioritize stable frame delivery and graceful loading over excessive visual complexity.

Desktop browsers are the initial target.

Mobile support and adaptive quality can follow after the central experience succeeds.

Performance optimizations may eventually include:

- instancing
- geometry budgets
- texture compression
- adaptive resolution
- level of detail
- controlled particle counts
- optimized shaders
- lazy loading
- preloading during the poster state

Do not prematurely optimize systems that have not yet been proven necessary.

---

# Development Method

Do not attempt to build the entire finished experience in one generation.

Development should proceed in deliberate passes.

For every major visual system:

1. establish the smallest useful prototype
2. inspect it
3. compare it against `reference/poster.jpeg`
4. test it
5. improve it
6. only then add complexity

Visual fidelity to the reference should be checked repeatedly throughout development.

Technical correctness alone does not mean a feature is successful.

---

# Agent Behavior

Before making substantial architectural or creative decisions:

1. read this file
2. inspect `reference/poster.jpeg` when relevant
3. consider whether the proposed change strengthens the central illusion
4. avoid expanding scope without a clear benefit
5. preserve existing successful behavior
6. do not replace working systems wholesale without justification

When uncertain, favor experimentation in a small isolated prototype over committing the project to a large implementation.

Do not begin major implementation work simply because this context file exists.

Wait for an explicit development instruction.

---

# Current Phase

**PRE-PRODUCTION**

At this stage we are establishing:

- creative intent
- visual understanding
- project rules
- possible technical approaches

Do not begin building the finished 3D environment until explicitly instructed.

---

# North Star

Before any significant creative or technical decision, ask:

> "Does this make it feel more like the visitor is entering this specific painting?"

If yes, continue.

If not, reconsider the decision.