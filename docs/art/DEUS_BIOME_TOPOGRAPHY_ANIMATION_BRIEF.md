# DEUS — OVERWORLD BIOME TILESET & ANIMATED TOPOGRAPHY ART BRIEF
**Document ID:** `DEUS-ART-BRIEF-BIOME-01`  
**Target Generator:** Google Nano Banana Pro (`gemini-3-pro-image` / `generate_image`) exclusively.  
**Engine Target:** RPG Maker MZ + DEUS Custom Animated-Tile/Topography Subsystem  
**Authority:** User Directive & Art Authority (2026-09-24)  
**Status:** Canonical Production Brief & Architecture Specification  

---

## 0. Technical Architecture: DEUS Custom Animated-Tile System

$$\textbf{CRITICAL ENGINE ARCHITECTURE DISTINCTION}$$

In stock RPG Maker MZ, only **A1 autotiles (water/lava/waterfall)** natively support cyclic 3-frame animation; upper layers (**B through E tilesets**) are strictly static 48×48 px images.

Project DEUS does **NOT** awkwardly warp or overload native MZ tile sheets to force upper-layer animation. Instead:
1. **9-Cell Logical Asset Architecture:** Every visible topographical feature family is treated as a logical asset ID composed of exactly **9 source cells** (organized in a clean $3 \times 3$ grid or indexed frames):
   ```text
   FEATURE_ID/
   ├── Variation A  (Common)     -->  [Frame 1, Frame 2, Frame 3]
   ├── Variation B  (Common)     -->  [Frame 1, Frame 2, Frame 3]
   └── Variation C  (Restrained) -->  [Frame 1, Frame 2, Frame 3]
   TOTAL = 9 source frames
   ```
2. **Runtime Spatial Desynchronization (Phase Offsetting):**  
   Because features are rendered via our custom animated world subsystem (e.g. `DEUS_Visuals.js` / custom Pixi sprite/tile overlays), the engine decouples animation timing from lockstep global ticks:
   $$\text{FrameIndex}(x, y, t) = \left( \lfloor t / \text{FrameInterval} \rfloor + \text{Hash}(x, y, \text{Seed}) \right) \pmod 3$$
   $$\text{Variation}(x, y) = \text{WeightedSelect}(\text{Hash}(x, y, \text{VarSeed}), [A, B, C])$$
   This ensures that adjacent trees, grass tufts, and bushes sway with natural phase offsets rather than pulsing in unison like cartoon clockwork.
3. **Deterministic Atlas Packing:** Art generation produces clean, uncompressed 9-cell source contact sheets on transparent/chroma backgrounds. Deterministic pipeline scripts (`tools/`) slice, register, and pack them into the runtime engine registries.

---

## 1. Master Production Brief (Verbatim Specification)

```text
DEUS — OVERWORLD BIOME TILESET & ANIMATED TOPOGRAPHY ART BRIEF
TARGET: Google Nano Banana Pro
ENGINE TARGET: RPG Maker MZ + DEUS custom animated-world rendering
PURPOSE: Production-oriented biome art exploration / source-asset generation

IMPORTANT:
Do NOT freely improvise the RPG Maker sheet layout.

Generate art according to the supplied DEUS/RMMZ scale references,
canonical 48 px world grid, approved art references, and any supplied
blank templates/masks.

Where deterministic code can pack generated source cells into final
RMMZ/DEUS sheets, ART GENERATION should create the coherent source art
and CODE should perform final packing.

==================================================
1. PRIMARY GOAL
==================================================

Create the visual foundation for the DEUS overworld:

A continuous, natural-looking topography built from multiple biomes that
GRADUALLY blend into one another rather than appearing as hard,
game-board-like biome regions.

At the canonical fixed gameplay camera / zoomed-out world view:

- plains should slowly become dry grassland,
- dry grassland should slowly become scrub,
- scrub should slowly become desert,
- grassland should thicken gradually into forest,
- lowlands should gradually become marsh,
- plains should gradually become rocky hills,
- hills should gradually become mountains,
- temperate ground should gradually cool into tundra and snow,
- earth should transition naturally into shore, shallow water, and deep water.

The player should perceive:

ONE CONTINUOUS WORLD

rather than:

GREEN BIOME
| hard line |
BROWN BIOME
| hard line |
SNOW BIOME.

==================================================
2. CORE ART STYLE
==================================================

Use the established DEUS art direction:

- late-16-bit RPG readability,
- strong sprite and terrain silhouettes,
- Final Fantasy V / VI era clarity and color discipline,
- grounded Western / Ultima-like fantasy material design,
- selective grimdark atmosphere,
- original artwork,
- earthy environments,
- stronger color accents where useful,
- crisp pixel clusters,
- no blurred HD-pixel aesthetic,
- no painterly texture,
- no photorealism,
- no generic stock RPG Maker RTP appearance,
- no noisy single-pixel static everywhere.

The world may feel old, harsh, wild and weathered.

It must still be beautiful and readable.

CORE PRINCIPLE:

DARK WORLD.
READABLE GRAPHICS.

==================================================
3. WORLD SCALE
==================================================

Canonical RMMZ/DEUS world tile:

48 × 48 pixels.

Treat this as the base world-grid unit.

Use the supplied canonical DEUS character / scale-strip references whenever
available to maintain believable scale.

Do not enlarge texture details merely to fill the tile.

Examples:

- grass blades should remain small relative to a Human,
- flowers should not look like shrubs,
- pebbles should not look like boulders,
- cobblestones should not be enormous,
- tree leaves should not be helmet-sized,
- wood grain should not appear tree-sized.

The fixed gameplay camera means the assets MUST read correctly at actual
gameplay scale, not only while enlarged.

==================================================
4. FUNDAMENTAL ANIMATION RULE
==================================================

EVERY VISIBLE TOPOGRAPHICAL FEATURE SHOULD SUPPORT ANIMATION UNLESS
SPECIFICALLY EXEMPTED BY THE DEUS ART DIRECTOR.

For every applicable feature:

3 DISTINCT VISUAL VARIATIONS

AND

3 ANIMATION FRAMES PER VARIATION.

Therefore:

FEATURE
├─ Variation A
│  ├─ Frame 1
│  ├─ Frame 2
│  └─ Frame 3
│
├─ Variation B
│  ├─ Frame 1
│  ├─ Frame 2
│  └─ Frame 3
│
└─ Variation C
   ├─ Frame 1
   ├─ Frame 2
   └─ Frame 3

TOTAL:
9 source frames per animated feature family.

This requirement applies broadly to visible world features such as:

- grass,
- flowers,
- weeds,
- reeds,
- bushes,
- shrubs,
- trees,
- saplings,
- crops,
- mushrooms,
- vines,
- fallen vegetation,
- loose stones,
- rock formations,
- cliffs/walls,
- waterfalls,
- water,
- lava,
- snow effects,
- environmental props,
- other visually active topography.

Do NOT interpret animation as large cartoon movement.

Most world animation should be SUBTLE.

==================================================
5. THREE VARIATIONS MEANS ACTUAL VARIATION
==================================================

The three variations must not simply be:

same sprite shifted one pixel.

They should be recognizable members of the same art family.

Example:

GRASS TUFT

Variation A:
short narrow tuft

Variation B:
wider wind-bent tuft

Variation C:
mixed-height cluster

All three:
same biome,
same palette,
same rendering language,
same scale.

Likewise:

TREE

Variation A:
slightly broad crown

Variation B:
taller/narrower

Variation C:
asymmetric mature tree

Do not produce three completely unrelated species unless the specification
explicitly asks for that.

==================================================
6. THREE-FRAME LOOP REQUIREMENT
==================================================

Each variation must have a clean cyclic 3-frame animation:

FRAME 1
→
FRAME 2
→
FRAME 3
→
FRAME 1

No popping.

No changing object size unexpectedly.

No changing roots/ground anchors.

No changing lighting direction.

No teleporting branches/leaves/stones.

The movement should feel like the SAME object over time.

==================================================
7. ANIMATION INTENSITY BY FEATURE
==================================================

Use appropriate animation intensity.

GRASS:
very subtle wind bend.

FLOWERS:
small stem/petal movement.

BUSHES:
small leaf/canopy movement.

TREES:
slight crown/branch motion.
Trunk and root remain essentially fixed.

REEDS:
more noticeable wind/water movement.

WATER:
surface ripple/flow motion.

WATERFALL:
clear directional flow.

LAVA:
slow internal movement, bubbling, glow variation.

FIRE:
stronger animation permitted.

ROCK:
extremely subtle environmental life only where appropriate,
such as small highlight/dust/moss movement.
Do NOT make solid rocks visibly wobble.

CLIFF / WALL:
structural geometry stays fixed.
Animation may come from:
- moss,
- dripping water,
- loose dust,
- vines,
- subtle environmental variation.

STONE STRUCTURE:
DO NOT animate the masonry itself like jelly.

Animation should represent the environment affecting the structure.

==================================================
8. ANIMATE THE WORLD, NOT THE GEOMETRY
==================================================

Critical rule:

SOLID PHYSICAL GEOMETRY REMAINS STABLE.

For example:

A stone cliff does not change shape every three frames.

Instead:

frame variation might show:
- tiny moss motion,
- a drip,
- dust settling,
- slight light variation where appropriate.

A timber wall does not flex like cloth.

A rock does not breathe.

The 3-frame requirement should create environmental vitality without making
the world appear unstable.

==================================================
9. BIOME FOUNDATION
==================================================

Build a coherent palette/topography system supporting at least:

TEMPERATE
- lush grassland
- ordinary grassland
- dry grassland
- meadow
- light woodland
- dense forest

WET
- riverbank
- wet grass
- marsh
- swamp
- reeds
- muddy ground

DRY
- dry scrub
- steppe
- sandy scrub
- desert
- rocky desert
- badlands

ROCK / ELEVATION
- rocky plain
- foothill
- hills
- mountain
- exposed stone
- cliffs

COLD
- cool grassland
- tundra
- frost
- patchy snow
- full snow
- icy stone

WATER
- wet shoreline
- shore
- shallow water
- medium water
- deep water
- river flow
- pond/lake water

VOLCANIC
- dark earth
- scorched ground
- volcanic rock
- ash
- lava edge
- lava

Do not make every biome equally saturated.

==================================================
9.1 THE 6-TILESET BIOME CONTINUUM ARCHITECTURE
==================================================

USER DIRECTIVE (2026-09-24):
"For one biome, I want 6 tilesets each, with 3 variations of everything that appears, each animated 3 frames.
So for our grassy biome, I want 6 grassy full tilesets to generate from, for example."

To create a world that looks like a smooth, well-blended rainbow from afar across rolling country, procedural generation DOES NOT rely on a single tileset per biome.

Instead, EVERY MAJOR BIOME IS AUTHORED AS A SUITE OF SIX PROGRESSIVE FULL TILESETS:

Example: The 6 Grassy Biome Tilesets (G1 through G6):
- TILESET G1: Deep Canopy Shade & Ancient Moss (The Deep Woodland Tier)
- TILESET G2: Lush High-Moisture Emerald Meadow (The River Basin Tier)
- TILESET G3: Standard Temperate Field (The Heartland Tier - Canonical Baseline)
- TILESET G4: Sunlit High Meadow & Spring Pasture (The Upland Tier)
- TILESET G5: Pale Hayfield & Summer Pasture (The Fading Tier)
- TILESET G6: Olive Transitional Steppe-Border (The Dry Transition Tier)

IN EVERY SINGLE ONE OF THE 6 TILESETS:
Every visible topographical feature family that appears in that tileset gets:
- 3 DISTINCT VISUAL VARIATIONS
- 3 CYCLIC ANIMATION FRAMES PER VARIATION
= 9 SOURCE CELLS PER FEATURE FAMILY.

This guarantees that as terrain procedural moisture, fertility, and elevation roll across distance, the engine blends seamlessly through the 6 tilesets without repeating identical flora or hard palette jumps.

==================================================
10. BIOMES MUST BLEND THROUGH ECOLOGICAL INTERMEDIATES
==================================================

Never rely solely on direct:

GRASS → DESERT

Instead provide intermediate visual states.

Example:

lush grass
→
ordinary grass
→
yellowing grass
→
dry grass
→
scrub
→
sandy scrub
→
sand.

Likewise:

grass
→
grass with scattered stone
→
rocky grass
→
rock-dominated soil
→
exposed stone
→
mountain stone.

And:

temperate grass
→
cool grass
→
brown tundra
→
frosted tundra
→
patchy snow
→
snow.

==================================================
11. COLOR BLENDING PRINCIPLE
==================================================

Adjacent biome palette families must share colors.

Do not design each biome independently.

Example:

Grassland Palette
shares some greens/browns with
Dry Grassland Palette.

Dry Grassland
shares ochres with
Scrub.

Scrub
shares tans with
Desert.

This creates a COLOR CONTINUUM.

Use deliberate palette stepping.

Example conceptual progression:

deep green
→
green
→
olive
→
yellow-green
→
straw
→
ochre
→
tan
→
sand.

The player should be able to zoom out and see gentle regional gradients.

==================================================
12. MACRO TOPOGRAPHY READABILITY
==================================================

At zoomed-out gameplay scale, color should communicate the large landscape.

The player should be able to perceive:

- river valleys,
- forests,
- plains,
- dry regions,
- mountains,
- snow regions,
- volcanic regions

without hard borders.

Avoid excessive tiny color variation that destroys macro readability.

Think:

smooth regional palette gradients
+
local pixel detail.

==================================================
13. MICRO-VARIATION
==================================================

Within a biome, avoid repetitive carpeting.

Each terrain family should provide variation through:

- slight hue changes,
- grass density,
- small stones,
- bare soil patches,
- flowers,
- weeds,
- leaf litter,
- roots,
- cracks,
- moss.

But use restrained variation.

The terrain should not look like visual static.

==================================================
14. GROUND TILE VARIATION
==================================================

For major base-ground families, provide at minimum:

GROUND BASE A
GROUND BASE B
GROUND BASE C

These can also receive subtle animated texture treatment if approved.

However, base terrain animation should be MUCH subtler than vegetation.

The player should not perceive the ground itself as moving.

==================================================
15. TRANSITION FAMILY REQUIREMENT
==================================================

Every important biome pair that can naturally border should have transition
art.

Examples:

grass ↔ dry grass
grass ↔ dirt
grass ↔ forest floor
grass ↔ marsh
grass ↔ stone
grass ↔ sand

dirt ↔ mud
dirt ↔ stone
dirt ↔ sand

stone ↔ mountain
stone ↔ snow
stone ↔ volcanic

tundra ↔ snow

shore ↔ water

etc.

Do NOT attempt every possible biome pair blindly.

Build transition paths through the ecological continuum.

==================================================
16. TRANSITION WIDTH
==================================================

Avoid one-tile hard transitions whenever possible.

Design the visual system to support multi-step blending over several world
cells.

Example:

Biome A
A/A/B
A/B
B/A
B
Biome B

or equivalent DEUS terrain blending.

The procedural world generator should eventually be able to spread biome
transition stages spatially so the world gradually changes across distance.

Art should support this.

==================================================
17. FOREST GRADIENT
==================================================

Forest should not begin suddenly with:

grass
→
solid wall of trees.

Provide stages such as:

open grass
→
grass with occasional sapling
→
scattered trees
→
light woodland
→
dense woodland
→
deep forest floor.

Tree density is part of biome blending.

==================================================
18. ROCK / ELEVATION GRADIENT
==================================================

Likewise:

plain
→
rocky plain
→
broken ground
→
foothill
→
rock outcrop
→
cliff
→
mountain.

Do not treat mountains as a different colored grass biome.

They need an increasing structural presence.

==================================================
19. VEGETATION COLOR BLENDING
==================================================

Vegetation must also transition.

A tree in a lush area may use:

richer greens.

The same tree family near dry scrub may use:

olive/yellow-green ramps.

Cold regions may shift toward:

darker/desaturated greens.

Do not recolor every tree randomly.

Use biome-conditioned palette families.

==================================================
20. THREE VARIATIONS FOR TREES
==================================================

For every major tree species/family:

TREE_A
3 frames

TREE_B
3 frames

TREE_C
3 frames.

The three variations should share:

- species identity,
- trunk material,
- leaf palette,
- biological scale.

They can vary:

- crown shape,
- lean,
- branching,
- age impression.

All frames retain identical:

- ground/root anchor,
- footprint,
- collision meaning.

==================================================
21. MULTI-TILE FEATURES
==================================================

Large objects should be generated as WHOLE OBJECTS first.

Examples:

- mature trees,
- large boulders,
- cliffs,
- ruins,
- large bushes,
- walls.

Do NOT generate each 48×48 component independently.

Workflow:

generate coherent full object
→
validate scale
→
animate three coherent frames
→
create three coherent variations
→
deterministically slice/pack into tile cells.

This prevents seams.

==================================================
22. CLIFFS / NATURAL WALLS
==================================================

Remember DEUS has real Z-level topography.

Elevated terrain represents physical mass.

Art should support:

SURFACE
+
EDGE
+
VERTICAL FACE
+
BOTTOM TRANSITION
+
CORNERS
+
RAMPS.

Example:

grass surface
above
soil/rock vertical cliff face.

Do not depict raised grass as floating.

==================================================
23. WALL / CLIFF ANIMATION
==================================================

Every wall/cliff family still requires:

3 variations
×
3 frames.

But preserve structural geometry.

Good animation candidates:

- dripping water,
- swaying moss,
- vines,
- falling dust,
- small environmental highlights.

Bad:

- wall moving,
- stone changing dimensions,
- corners shifting position.

==================================================
24. WATER
==================================================

Water must be visually integrated with surrounding biome color.

Provide:

- shore wetness,
- shallow,
- medium,
- deep,
- river movement,
- pond movement,
- edge ripples,
- waterfall/vertical flow.

Each relevant visible water family:

3 visual variations
×
3 animation frames.

Animation can be more pronounced than static terrain.

Do not turn water into high-frequency flashing noise.

==================================================
25. LAVA
==================================================

Provide:

- scorched transition,
- hot rock edge,
- lava edge,
- lava interior,
- flow,
- bubbling variation.

Again:

3 variations
×
3 frames.

Lava should be strongly readable as dangerous at fixed gameplay scale.

==================================================
26. FLOWERS
==================================================

For each flower family:

3 arrangements
×
3 subtle animation frames.

Examples:

A = sparse pair
B = small cluster
C = uneven patch.

Animation:
tiny wind sway only.

Do not make flowers dominate the world palette.

==================================================
27. BUSHES / SHRUBS
==================================================

Each biome shrub family:

3 distinct shapes
×
3 animation frames.

Preserve ground footprint.

Movement:
small foliage sway.

Dry shrubs should move differently from heavy wet bushes.

==================================================
28. GRASS / WEEDS
==================================================

Provide:

short grass
tall grass
dry grass
weeds

as appropriate.

Each family:

3 variations
×
3 frames.

Avoid synchronized movement across the whole world.

The runtime should ultimately be able to offset animation phase so every
grass tile does not move simultaneously.

Art must support seamless looping regardless of phase.

==================================================
29. ROCKS
==================================================

Provide:

small rock
medium outcrop
large rock
cliff face

with 3 design variations each where appropriate.

Three-frame "animation" must remain extremely restrained.

Acceptable:
- tiny dust particle,
- moss movement,
- water drip where biome appropriate.

The actual rock silhouette should remain fixed.

==================================================
30. CONSTRUCTION / BUILT ENVIRONMENT
==================================================

Although this task focuses on overworld biome art, maintain compatibility
with the DEUS construction system.

Buildable structures use:

INTENT TO BUILD
→
UNDER CONSTRUCTION
→
COMPLETE.

Do not bake construction ghosting into natural biome tiles.

Natural terrain and constructed architecture remain separate systems.

==================================================
31. RACIAL BUILDING ART
==================================================

Do not design final racial architecture in this task.

Leave room for future:

Human architectural style
Dwarf architectural style
Elf architectural style
Halfling architectural style
Dragonborn architectural style
Gnome architectural style
Half-Orc-related cultural styles
Tiefling-related styles
etc.

Remember terminology:

RACE = race / biological / racial style.

FACTION = actual simulation faction.

Do not use those words interchangeably.

==================================================
32. CAMERA REQUIREMENT
==================================================

DEUS intends to use one canonical gameplay camera distance / display scale.

All tiles must be judged primarily at this scale.

Do NOT optimize art for extreme zoom-in inspection.

Do NOT depend on zooming in to understand important terrain.

At fixed gameplay view:

- water must read as water,
- forest must read as forest,
- cliffs must read as elevation,
- hazards must read immediately,
- plants must create texture without becoming noise.

==================================================
33. PHASE OFFSET COMPATIBILITY
==================================================

The art should permit runtime animation desynchronization.

For example:

Tree A may display Frame 1
while nearby Tree B displays Frame 3.

Therefore every frame must work as an independent visually plausible state.

Do not create animation that only makes sense if the whole world advances
in lockstep.

==================================================
34. NO CAMERA-SCALE FLICKER
==================================================

At zoomed-out gameplay scale:

Frame 1 → Frame 2 → Frame 3

must not cause dramatic total luminance changes.

This is especially important for:

grass
forest
water
lava
flowers.

Avoid strobing.

Maintain roughly consistent silhouette mass and average brightness.

==================================================
35. THREE-VARIATION DISTRIBUTION
==================================================

The three variations should be designed for procedural distribution.

The world generator may use weighted placement such as:

Variation A — common
Variation B — common
Variation C — less common

or equal weighting.

Do not create Variation C as a visually extreme "special object" unless the
asset specification says so.

==================================================
36. TILE-EDGE CONSISTENCY
==================================================

Any tile intended to repeat or connect must respect exact edge continuity.

This includes:

- base ground,
- transition ground,
- water,
- lava,
- cliffs,
- walls,
- paths,
- shoreline.

Do not place unique objects across a repeating seam unless part of a
multi-tile authored object.

==================================================
37. LIGHTING
==================================================

Use the canonical DEUS global light direction.

Do not change shadow direction between biomes.

The same stone material must feel like the same physical material across:

grassland
desert
snow
forest.

Biome color may modify ambient impression.

Material lighting logic remains coherent.

==================================================
38. BIOME MATERIAL CONTINUITY
==================================================

Avoid reinventing materials per biome.

Example:

granite in temperate mountains
and
granite under snow

should remain recognizably granite.

Snow/frost modifies it.

It does not become an unrelated rock style.

Likewise:

wet dirt
=
dirt material
+
wet state

rather than a completely unrelated texture family.

==================================================
39. SEASONAL EXTENSIBILITY
==================================================

Do not generate full seasonal sets yet unless requested.

But design source assets so future seasonal modifiers are possible.

Potential future states:

normal
autumn
winter
wet
scorched

Avoid hard-baking characteristics that make recolor/state variation
impossible.

==================================================
40. REQUIRED FIRST-PASS BIOME PACK
==================================================

For the first concept/production pass, prioritize a connected biome chain
rather than every biome simultaneously.

Recommended starting chain:

LUSH GRASSLAND
↓
TEMPERATE GRASSLAND
↓
DRY GRASSLAND
↓
SCRUB
↓
SAND / DESERT

plus perpendicular transitions:

GRASSLAND
↓
WOODLAND
↓
FOREST

and:

GRASSLAND
↓
ROCKY GROUND
↓
FOOTHILL / CLIFF

and:

GRASSLAND
↓
WET GRASS
↓
MARSH
↓
WATER.

This first pack should prove that a large map can produce visually gradual
topography at the canonical camera distance.

==================================================
41. FIRST-PASS FEATURE FAMILIES
==================================================

Generate/test representative source families for:

BASE GROUND
- grass
- dry grass
- dirt
- scrub
- sand
- rocky ground
- wet ground

VEGETATION
- short grass
- tall grass
- flowers
- bush
- sapling
- mature tree
- dry shrub
- reeds

ROCK
- small stones
- medium outcrop
- large rock
- cliff face

FLUID
- shallow water
- deep water
- river/flow edge

For every applicable feature:

THREE VARIATIONS
×
THREE FRAMES.

==================================================
42. OUTPUT ORGANIZATION
==================================================

Do NOT scatter unlabeled images.

For each generated family, preserve a deterministic organization like:

FEATURE_ID/
    variation_A/
        frame_01
        frame_02
        frame_03

    variation_B/
        frame_01
        frame_02
        frame_03

    variation_C/
        frame_01
        frame_02
        frame_03

Where production tooling supports it.

Use exact DEUS asset IDs supplied by the orchestrator.

==================================================
43. VALIDATION CONTACT SHEET
==================================================

For every family, generate a contact sheet showing:

A1 A2 A3
B1 B2 B3
C1 C2 C3

at:

1× actual pixels

and

actual DEUS gameplay presentation scale.

Also show randomized mixtures of A/B/C to verify that they look cohesive
when distributed together.

==================================================
44. BIOME BLEND TEST MAP
==================================================

Before mass production, create a test composition showing a broad gradient:

FOREST
→
WOODLAND
→
GRASSLAND
→
DRY GRASS
→
SCRUB
→
DESERT

with another branch:

GRASS
→
WETLAND
→
WATER

and:

GRASS
→
ROCKY
→
MOUNTAIN.

View it at the canonical fixed camera distance.

PASS only if:

- no obvious square biome boundaries,
- no abrupt palette jumps,
- no texture-scale mismatch,
- large regions remain readable,
- transitional areas look natural,
- three-frame animation remains subtle,
- three variations reduce repetition.

==================================================
45. CRITICAL NEGATIVE REQUIREMENTS
==================================================

DO NOT:

- paint a giant complete map instead of modular assets,
- produce hard biome borders,
- create obvious checkerboard repetition,
- make every tile equally busy,
- animate structural geometry like rubber,
- change object footprints between frames,
- shift ground anchors between frames,
- change lighting direction between variations,
- shrink or enlarge features randomly,
- use anti-aliased/blurry edges for ordinary pixel-art components,
- make all three variations animate synchronously in appearance,
- create oversized environmental texture features,
- copy FF5/FF6/Ultima/RPG Maker artwork,
- independently paint neighboring pieces that should be generated as one
  coherent multi-tile object.

==================================================
46. ART-DIRECTION TARGET
==================================================

At normal gameplay scale, the finished world should feel like:

A large, living late-16-bit Western fantasy landscape whose color,
vegetation, geology, water, and elevation gradually evolve across geography.

From far enough away to manage the settlement, the player sees:

SMOOTH TOPOGRAPHIC REGIONS.

Closer inspection reveals:

HANDCRAFTED PIXEL DETAIL.

Nothing should look like:

"a green square beside a yellow square beside a white square."

It should read as one continuous landscape.

==================================================
47. ANIMATION TARGET
==================================================

The animation should make the world feel alive without making the screen
visually restless.

Desired impression:

grass quietly moves,
leaves stir,
flowers shift,
reeds bend,
water flows,
lava churns,
fire dances,
moss/drips/dust animate cliff faces,

while:

rock remains rock,
walls remain walls,
terrain remains stable,
the player's eye can still track people and gameplay.

==================================================
48. FIRST GENERATION REQUEST
==================================================

For the FIRST iteration only:

Create concept/source tiles for:

1. Temperate Grass Base
2. Dry Grass Transition
3. Dirt/Grass Transition
4. Tall Grass Feature
5. Small Flower Cluster
6. Bush
7. Mature Temperate Tree
8. Small Rock Cluster
9. Rock Outcrop
10. Grass-to-Rock Transition
11. Wet Grass
12. Reeds
13. Shoreline
14. Shallow Water
15. Deep Water

For each applicable animated feature:

THREE VISUAL VARIATIONS
AND
THREE FRAMES PER VARIATION.

Show the resulting families together in a BIOME BLEND TEST COMPOSITION.

Do not yet generate the entire game's biome library.

We will review this first pack and either:

YEA:
promote the successful visual rules into golden references

or

NAY:
revise the prompt/art rules and regenerate.

==================================================
49. FINAL PRINCIPLE
==================================================

RMMZ supplies the 48 px world grid.

DEUS supplies the physical world scale and fixed camera.

The biome system supplies gradual ecological transitions.

The art system supplies three coherent animated variations for every
visible feature family.

The runtime distributes those variations and offsets their animation phases
to create a world that feels organic rather than tiled.

ART MUST BE:
beautiful,
readable,
modular,
seamless,
animated,
consistent,
and scalable.
```
