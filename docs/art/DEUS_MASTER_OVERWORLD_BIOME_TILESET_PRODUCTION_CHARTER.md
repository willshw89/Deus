<USER_REQUEST>
Yes. I’d make this a **master production charter**, not a loose image prompt.

I’m interpreting your requirement as:

> **6 biomes × 5 Z layers × 6 complete RMMZ tileset variants = 180 full tileset packages.**

If a “full tileset” is the standard MZ A1–A5 + B–E package, that is potentially **1,620 final packed tileset sheets**, before source animation frames and transition material. Gemini should therefore build this as a validated production pipeline and generate it in approved batches—not fire off 1,620 uncontrolled images.

Paste this into the dedicated Gemini/Antigravity art-production conversation:

```text
DEUS — MASTER OVERWORLD BIOME TILESET PRODUCTION CHARTER
TASK FAMILY: WORLDART-BIOMES
COORDINATOR: GEMINI / ANTIGRAVITY TERMINAL
IMAGE GENERATOR: GOOGLE NANO BANANA PRO ONLY
ENGINE TARGET: RPG MAKER MZ + DEUS CUSTOM WORLD RENDERING

======================================================================
0. ABSOLUTE IMAGE-GENERATION RULE
======================================================================

ALL generative image creation for this task MUST use:

GOOGLE NANO BANANA PRO

and NO OTHER image-generation model.

Do NOT use:

- Nano Banana non-Pro variants
- Imagen
- DALL-E
- Midjourney
- Stable Diffusion
- Fable image generation
- any alternate image model
- any automatic model substitution

Gemini is the production coordinator.

Nano Banana Pro is the sole generative artist.

Deterministic code MAY be used for:

- templates
- masks
- cropping
- slicing
- atlas packing
- palette validation
- animation packing
- file naming
- metadata
- contact sheets
- mechanical validation

Code may assemble art.

Code may NOT procedurally invent replacement artwork.

If Nano Banana Pro is unavailable:

STOP.

Do not silently substitute another generator.

======================================================================
1. PRIMARY WORLD-ART REQUIREMENT
======================================================================

DEUS requires:

6 DISTINCT MAJOR BIOMES

distributed coherently through:

5 PHYSICAL Z LEVELS:

Z+2
Z+1
Z0
Z-1
Z-2

Every biome must have a distinct identity on every Z level.

However:

THE FIVE Z VERSIONS OF ONE BIOME MUST FEEL LIKE FIVE VERTICAL SLICES OF
THE SAME PHYSICAL REGION,

not five unrelated maps.

For EACH biome × EACH Z level:

create:

6 COMPLETE COORDINATED TILESET VARIANTS.

Therefore planned production scope is:

6 biomes
×
5 Z levels
×
6 tileset variants

=
180 FULL TILESET PACKAGES.

If the current canonical DEUS/RMMZ documentation defines “full tileset
package” differently, REPORT that discrepancy before generation.

Do not silently reduce this scope.

======================================================================
2. WHY SIX TILESETS PER BIOME/Z
======================================================================

The six tilesets are NOT six unrelated art styles.

They exist to provide:

- gradual hue transitions
- gradual value transitions
- gradual vegetation-density changes
- gradual moisture changes
- gradual geological variation
- repetition reduction
- biome-edge compatibility
- macro-scale topographic blending

Example:

TEMPERATE GRASS

must not have one green.

It should have a controlled continuum of approximately six related visual
states such as:

GREEN_01
GREEN_02
GREEN_03
GREEN_04
GREEN_05
GREEN_06

These should feel like members of one palette family.

The world generator can then distribute them gradually across geography.

From the fixed gameplay camera, the result should look like:

continuous terrain coloration

rather than:

large flat single-color biome patches.

======================================================================
3. GLOBAL BIOME PALETTE LATTICE
======================================================================

BEFORE generating production tiles, design a GLOBAL PALETTE LATTICE.

Do NOT design each biome's colors independently.

The six biome palettes must intentionally share transition colors.

For each biome define:

- six internal palette bands
- core palette
- light/dark range
- moisture influence
- temperature influence
- geological influence
- edge palettes toward every other biome

There are six major biomes.

Therefore there are 15 possible biome-pair relationships.

Create a transition matrix covering:

Biome A ↔ Biome B

for all meaningful pairings.

Rare transitions may use intermediary terrain, but NO biome should exist as
a disconnected color island.

Example:

lush green
→ ordinary green
→ olive
→ straw
→ ochre
→ sand

and:

green
→ cool green
→ gray-green
→ frost brown
→ pale frost
→ snow

and:

grass
→ grass/stone
→ rocky grass
→ exposed rock
→ mountain stone.

The GLOBAL PALETTE LATTICE is authoritative.

Production tilesets derive from it.

======================================================================
4. SIX MAJOR BIOMES
======================================================================

Use the following six major biome families unless repository canon already
defines better authoritative names.

If names are provisional, mark them provisional but preserve the ecological
roles.

--------------------------------------------------
BIOME 1 — TEMPERATE / VERDANT
--------------------------------------------------

Primary identity:

- grassland
- meadow
- ordinary temperate forest
- woodland
- fertile earth
- flowers
- broadleaf/conifer mix where appropriate

Color identity:

greens
earth browns
warm vegetation
moderate moisture

--------------------------------------------------
BIOME 2 — WETLAND / RIVERLAND
--------------------------------------------------

Primary identity:

- wet grass
- marsh
- swamp
- fen
- reeds
- mud
- shallow water
- riverbank
- moss

Color identity:

deep greens
blue-greens
mud browns
muted water tones

--------------------------------------------------
BIOME 3 — ARID / STEPPE / DESERT
--------------------------------------------------

Primary identity:

- dry grass
- steppe
- scrub
- sandy ground
- desert
- rocky desert
- dry vegetation

Color identity:

straw
ochre
tan
muted orange-brown
desaturated olive

--------------------------------------------------
BIOME 4 — HIGHLAND / MOUNTAIN
--------------------------------------------------

Primary identity:

- rocky plain
- foothill
- broken terrain
- exposed stone
- cliff
- mountain
- sparse highland vegetation

Color identity:

stone grays
brown-gray
cool rock
muted alpine vegetation

--------------------------------------------------
BIOME 5 — COLD / TUNDRA / SNOW
--------------------------------------------------

Primary identity:

- cool grassland
- tundra
- frost
- frozen earth
- patchy snow
- full snow
- icy rock

Color identity:

cool gray-green
brown tundra
blue-gray
off-white
snow white

--------------------------------------------------
BIOME 6 — VOLCANIC / ASHLAND
--------------------------------------------------

Primary identity:

- scorched earth
- ash
- basalt
- volcanic stone
- obsidian-like dark rock
- sulfur/mineral coloration
- lava transitions

Color identity:

charcoal
dark brown
black-gray
muted red
hot orange used selectively
lava highlights

Do not make Volcanic equal “everything glowing red.”

======================================================================
5. FIVE-Z VERTICAL WORLD MODEL
======================================================================

DEUS Z levels are physical adjacent slices of ONE volumetric world.

They are NOT disconnected themed maps.

Use this semantic model:

Z+2 = highest exposed terrain
Z+1 = raised terrain / upland
Z0  = principal surface
Z-1 = shallow subsurface
Z-2 = deep subsurface

Every biome must express these five layers coherently.

======================================================================
6. VERTICAL COHERENCE RULE
======================================================================

For any (x,y) biome column:

Z+2
Z+1
Z0
Z-1
Z-2

should tell one geological/ecological story.

Changes with depth/elevation should feel causally related.

Examples:

surface plants
→ roots
→ soil
→ stone
→ deep bedrock

or:

marsh
→ peat
→ waterlogged earth
→ flooded rock
→ deep wet cavern

or:

volcanic ash
→ basalt
→ fractured hot rock
→ geothermal cavern
→ magma-adjacent stone.

Do NOT create:

green forest at Z0
random purple cave at Z-1
unrelated blue crystal world at Z-2

unless a separate gameplay phenomenon explicitly causes that.

======================================================================
7. BIOME 1 VERTICAL PROFILE — TEMPERATE
======================================================================

Z+2:
windswept temperate ridge / stony upland
- thinner grasses
- exposed stone
- hardy shrubs
- reduced tree density
- brighter wind-exposed vegetation

Z+1:
wooded hills / raised meadow
- mixed grass
- shrubs
- rocks
- ordinary trees
- slopes/cliffs

Z0:
canonical temperate surface
- meadow
- grassland
- woodland
- fertile dirt
- flowers
- ordinary forest

Z-1:
rooted shallow earth / soil caverns
- roots
- packed soil
- damp stone
- occasional seepage
- buried organic traces

Z-2:
deep temperate bedrock
- limestone/granite-type stone according to world geology
- dark mineral variation
- sparse moisture
- deep cave character

Vertical connection cues:
roots
soil strata
stone continuity
water seepage
fallen rock
mineral bands.

======================================================================
8. BIOME 2 VERTICAL PROFILE — WETLAND
======================================================================

Z+2:
wet rocky upland / raised moss terraces
- sparse wet vegetation
- mossy stone
- wind-bent plants
- water channels where plausible

Z+1:
raised fen / marsh terrace
- saturated grass
- reeds
- moss
- wet soil
- pools

Z0:
canonical marsh/swamp
- wet grass
- mud
- reeds
- pools
- shallow water
- swamp vegetation

Z-1:
peat / saturated soil / shallow aquifer
- dark organic earth
- roots
- seepage
- standing underground water
- mud

Z-2:
flooded stone cavern
- wet rock
- mineral deposits
- dark pools
- flowing subterranean water

Vertical connection cues:
water seepage
peat
roots
moss
drips
water staining.

======================================================================
9. BIOME 3 VERTICAL PROFILE — ARID
======================================================================

Z+2:
bare mesa / sun-exposed ridge
- hard exposed stone
- very sparse vegetation
- wind erosion
- light/dry rock

Z+1:
rocky scrub plateau
- dry brush
- scattered stone
- thin dry grasses

Z0:
canonical steppe/desert
- dry grass
- scrub
- sand
- cracked earth
- dry rock

Z-1:
sandstone / dry shallow cavern
- dry earth
- layered sandstone
- roots near surface
- salt/mineral hints

Z-2:
deep arid stone / mineral cavern
- darker dry rock
- salt/mineral deposits
- sparse or zero vegetation

Vertical connection cues:
sediment bands
sandstone
dry roots
collapsed sand
salt/mineral deposits.

======================================================================
10. BIOME 4 VERTICAL PROFILE — HIGHLAND
======================================================================

Z+2:
alpine peak / exposed ridge
- bare rock
- tiny hardy vegetation
- snow traces where transitioning toward cold

Z+1:
mountain slope / cliff
- rock outcrops
- sparse grass
- broken stone
- cliff faces

Z0:
foothill / rocky upland
- grass-and-rock mixture
- stones
- shrubs
- exposed bedrock

Z-1:
shallow mountain tunnel
- hard rock
- fractured stone
- mineral traces

Z-2:
deep mountain bedrock / mineral cavern
- dense stone
- stronger mineral/ore visual language
- deep cave character

Vertical connection cues:
same stone families
fracture lines
strata
ore traces
rock debris.

======================================================================
11. BIOME 5 VERTICAL PROFILE — COLD
======================================================================

Z+2:
snow ridge / icy highland
- snow
- exposed icy rock
- sparse alpine plants
- windblown snow

Z+1:
frost heath / cold slope
- patchy snow
- frost
- frozen shrubs
- rocky cold terrain

Z0:
canonical tundra
- cold grass
- brown heath
- frost patches
- snow transition
- cold forest where appropriate

Z-1:
permafrost / frozen soil
- frozen earth
- roots trapped in frost
- ice pockets
- cold stone

Z-2:
deep frozen cavern
- stone
- ice
- frozen water
- mineral/ice formations

Vertical connection cues:
frost penetration
ice seams
frozen roots
snowmelt channels
cold stone.

======================================================================
12. BIOME 6 VERTICAL PROFILE — VOLCANIC
======================================================================

Z+2:
obsidian/basalt ridge
- exposed volcanic stone
- hot fissures
- sparse or absent vegetation

Z+1:
basalt escarpment
- dark stone
- ash
- volcanic rubble
- occasional heat vent

Z0:
canonical ashland
- scorched earth
- ash
- basalt
- sparse burned vegetation
- lava-adjacent transitions

Z-1:
warm fractured basalt tunnels
- hot rock
- sulfur/mineral stains
- vents
- cracked geology

Z-2:
deep geothermal / magma-adjacent cavern
- basalt
- dark mineral deposits
- intense heat cues
- lava where physical simulation places it

Vertical connection cues:
basalt strata
heat cracks
ash
sulfur/mineral staining
lava channels
geothermal vents.

======================================================================
13. SIX TILESET VARIANTS PER BIOME × Z
======================================================================

For EVERY biome at EVERY Z level:

produce SIX COMPLETE RMMZ tileset packages:

VARIANT 01
VARIANT 02
VARIANT 03
VARIANT 04
VARIANT 05
VARIANT 06

These are not quality tiers.

They are compatible visual bands.

Example:

Temperate Z0:

T_Z0_01 = richest/coolest lush green
T_Z0_02
T_Z0_03
T_Z0_04
T_Z0_05
T_Z0_06 = driest/warmest edge-compatible green

The six should blend into one another without obvious seams.

The world generator may place:

01 → 02 → 03 → 04 → 05 → 06

over distance.

Do not create six unrelated tilesets.

======================================================================
14. EDGE-COLOR COMPATIBILITY
======================================================================

Each biome's outer palette states must intentionally connect with neighboring
biome transition palettes.

Examples:

TEMPERATE warm/dry edge
↔
ARID steppe edge

TEMPERATE wet edge
↔
WETLAND edge

TEMPERATE rocky edge
↔
HIGHLAND edge

TEMPERATE cold edge
↔
COLD edge

HIGHLAND dark/mineral edge
↔
VOLCANIC edge

ARID rocky/dark edge
↔
VOLCANIC ash edge.

For all 15 biome-pair combinations:

define either:

DIRECT TRANSITION

or:

INTERMEDIATE TRANSITION PATH.

No arbitrary hard border.

======================================================================
15. FULL RMMZ TILESET PACKAGE
======================================================================

Unless the audited local RMMZ installation / DEUS technical bible says
otherwise, treat a complete MZ tileset package as:

A1
A2
A3
A4
A5
B
C
D
E

Use the exact dimensions, packing rules, autotile conventions, blank-cell
requirements, and naming rules from:

DEUS_TILESET_SCALE_STANDARD (authoritative size and tree scale specification)
DEUS_SCALE_AND_ASSET_MASTER_BIBLE
RMMZ_CHARACTER/VISUAL ASSET TECHNICAL REFERENCE
current local RPG Maker MZ installation.

Do NOT trust memory over local audited documentation.

Expected standard MZ geometry should be VERIFIED locally before packing.

Do not reinterpret these sheets as paintings.

They are structured engine data.

======================================================================
16. OVERWORLD USE OF A-SHEETS
======================================================================

Populate the A-sheets appropriately for the biome/Z package.

A1:
native animated water/lava/waterfall-type autotiles as appropriate.

A2:
ground/autotile terrain.

A3/A4:
use only where appropriate for the DEUS terrain/wall implementation and
RMMZ rules.

A5:
ordinary lower-layer tiles.

Do not fill slots merely because they exist.

Maintain deterministic compatibility.

======================================================================
17. B–E CONTENT
======================================================================

B/C/D/E should provide a rich biome-specific library of modular upper-layer
objects such as:

- grass tufts
- weeds
- flowers
- mushrooms
- bushes
- shrubs
- saplings
- trees
- dead vegetation
- reeds
- roots
- stones
- boulders
- rock outcrops
- cliff details
- rubble
- fallen logs
- stumps
- natural debris
- biome-specific ground clutter
- water-edge vegetation
- cave/subsurface details appropriate to Z
- mineral/geological details appropriate to Z.

Keep racial architecture OUT of these biome sets unless the asset is a
neutral natural/ruin feature explicitly approved.

Racial building art is a separate art system.

Faction UI art is a separate system.

Terminology:

RACE = biological/racial style.

FACTION = simulation faction.

Do not confuse them.

======================================================================
18. ANIMATION RULE
======================================================================

ANY FEATURE THAT SHOULD VISIBLY MOVE MUST HAVE EXACTLY:

3 ANIMATION FRAMES.

Frame 1
Frame 2
Frame 3
→ seamless return to Frame 1.

This includes, as appropriate:

- grass tufts
- tall grass
- flowers
- reeds
- bushes
- shrubs
- tree foliage
- saplings
- crops if present
- vines
- hanging moss
- water
- waterfalls
- lava
- fire
- smoke where appropriate
- drips
- small environmental ambient features.

Do NOT animate solid geometry merely because a 3-frame system exists.

======================================================================
19. STRUCTURAL-STABILITY ANIMATION RULE
======================================================================

Things that are physically rigid should retain an identical structural
silhouette across frames.

ROCK:
does not wobble.

CLIFF:
does not breathe.

WALL:
does not flex.

BOULDER:
does not shift.

Animation may instead affect:

- moss
- vine
- drip
- dust
- tiny debris
- environmental highlight
- water running over surface.

The actual physical collision/geometry silhouette remains stable.

======================================================================
20. THREE-FRAME CONSISTENCY
======================================================================

For every animated feature:

preserve exact:

- ground anchor
- footprint
- collision silhouette
- object identity
- lighting direction
- palette family
- scale.

Do not:

- translate object between frames
- grow/shrink object
- change species
- change trunk location
- move roots
- move rock boundaries.

Animation should look like time passing.

Not like three different objects.

======================================================================
21. ANIMATION PHASE DESYNCHRONIZATION
======================================================================

DEUS will be able to offset animation phases among nearby objects.

Therefore every frame must independently look valid.

Example:

Tree A may be on frame 1.
Nearby Tree B may be on frame 3.

This prevents:

"the entire forest inhales simultaneously."

Do not design animation requiring all objects to be synchronized.

======================================================================
22. RMMZ ANIMATION DISTINCTION
======================================================================

Native RMMZ A1 supports certain animated autotiles.

DO NOT force every animated DEUS feature into A1.

For non-A1 animated terrain/objects such as:

- grass
- flowers
- bushes
- trees
- vines
- ambient cliff details

generate three approved source frames and use the DEUS custom animated-world
renderer / metadata architecture.

Gemini should:

- preserve RMMZ-compatible static packing where appropriate
- preserve animation triplets separately
- associate them via stable asset IDs.

Do not claim ordinary B–E tiles natively animate in stock MZ.

======================================================================
23. HUMAN SCALE REFERENCE
======================================================================

EVERY art-generation request involving object size should receive the
approved canonical DEUS scale reference.

Use:

DEUS_SCALE_STRIP_V1

and approved Human Adult Average reference.

The Human establishes physical visual scale.

Things should be sized relative to the person, not merely to available
pixels.

Examples:

grass:
small relative to Human legs.

bush:
roughly knee/waist/chest scale depending family.

door-sized natural opening:
larger than Human.

tree:
standard common tree is ~2.0x Human (~72-96 px, target ~84 px oak; large accent ~96-124 px; hero landmark ~120-160+ px; see DEUS_TILESET_SCALE_STANDARD.md).

boulder:
appropriately body-scaled.

flowers:
small.

mushrooms:
small unless explicitly giant fantasy variety.

======================================================================
24. SCALE IS MORE IMPORTANT THAN FILLING THE TILE
======================================================================

Do NOT make an object bigger merely because the source cell has empty space.

A small flower may occupy only a small fraction of a 48×48 region.

A tree may occupy several tiles.

Correct scale wins.

For every multi-tile object:

generate the WHOLE OBJECT first.

Then:

validate against Human
→
slice deterministically
→
pack into tileset.

Never separately generate individual slices of the same tree/boulder/cliff.

======================================================================
25. TERRAIN TEXTURE FREQUENCY
======================================================================

Control feature size carefully.

Avoid:

- giant grass blades
- huge pebbles
- oversized cobblestones
- massive leaves
- tree-sized wood grain
- fist-sized mail-like environmental texture
- over-detailed dirt.

At fixed camera distance, terrain must read as texture, not as a field of
oversized symbols.

======================================================================
26. FIXED CAMERA AUTHORITY
======================================================================

DEUS intends to use ONE canonical gameplay camera distance.

Use the current frozen/candidate camera standard from the repository.

If camera distance is not yet visually approved:

use the current candidate and flag it.

Do NOT optimize art for arbitrary zoom levels.

All assets must be judged at:

actual gameplay scale.

======================================================================
27. NATURAL Z-GEOMETRY
======================================================================

Natural elevated terrain must represent physical mass.

If a natural surface exists at Z+1:

the corresponding world geometry below should visually support that elevation
unless explicitly carved/open.

If surface exists at Z+2:

the vertical terrain mass below should read coherently.

Art needs compatible families for:

- horizontal surface
- edge/cap
- vertical face
- inner corner
- outer corner
- ramp
- transition to lower elevation
- damaged/exposed states later.

Do not depict floating upper land.

======================================================================
28. Z-SPECIFIC COLOR BEHAVIOR
======================================================================

Within each biome, Z level should influence palette without destroying
biome identity.

General guidance:

Z+2:
more exposed
more wind/weather
slightly stronger stone presence
often lighter/drier/cooler depending biome

Z+1:
upland transition

Z0:
canonical biome palette

Z-1:
darker
earthier
less vegetation
more roots/soil/stone
less direct sunlight

Z-2:
deepest
most geological
least biological
strongest bedrock/mineral identity

Do NOT simply darken the same tile five times.

Each level needs actual ecological/geological art differences.

======================================================================
29. SIX-VARIANT COLOR PROGRESSION
======================================================================

Within one biome/Z layer:

the six tilesets should form a controlled progression.

Example conceptual structure:

01 = cool/deep/rich
02 = slightly less saturated
03 = balanced core
04 = warmer/lighter
05 = transition-biased
06 = strongest edge-transition tone

This is guidance, not a universal hue rule.

Wetland, Cold and Volcanic may require different progression behavior.

The GLOBAL PALETTE LATTICE determines exact ramps.

======================================================================
30. TRANSITION TILES
======================================================================

Every package must support transitions to adjacent internal variant bands.

For example:

VARIANT 01 ↔ 02
02 ↔ 03
03 ↔ 04
04 ↔ 05
05 ↔ 06.

Biome boundaries must additionally use the global biome-transition system.

Do not rely on hard palette jumps.

======================================================================
31. MACRO-SCALE TEST
======================================================================

The reason for six tilesets per biome is most visible when zoomed out.

Create a macro blend test showing broad terrain using:

multiple variants of the SAME biome

followed gradually by:

the neighboring biome.

Example:

Temperate:
01 → 02 → 03 → 04 → 05 → 06
→
Arid transition
→
Arid 01 → 02 → etc.

At canonical camera distance, this should read as one slowly changing
landscape.

======================================================================
32. MICRO-SCALE TEST
======================================================================

Then inspect at native pixel scale.

The tiles must remain:

- crisp
- attractive
- tileable
- not muddy
- correctly scaled
- free of obvious seams
- consistent with DEUS art standards.

Both macro and micro views must pass.

======================================================================
33. AUTOTILE RULES
======================================================================

For A1–A4:

follow the EXACT audited RPG Maker MZ autotile structure.

Do NOT ask Nano Banana Pro to guess:

- quarter-tile arrangement
- adjacency masks
- animation packing
- waterfalls
- wall packing.

Preferred workflow:

Nano Banana Pro creates coherent source material / approved source templates.

Deterministic DEUS tooling:

- assembles quadrants
- packs autotiles
- verifies seam rules
- outputs final RMMZ sheets.

Use art generation for ART.

Use deterministic code for ENGINE GEOMETRY.

======================================================================
34. SEAMLESSNESS
======================================================================

Any repeating terrain must pass seam testing.

Validate:

left edge ↔ right edge

top edge ↔ bottom edge

and all relevant autotile connections.

No visible 1-pixel seams.

No sudden texture repetition line.

No disconnected grass clusters across tile boundaries.

======================================================================
35. TOP-DOWN / RMMZ PERSPECTIVE
======================================================================

Maintain the current DEUS/RMMZ top-down / elevated map perspective.

Do not produce:

- true isometric tiles
- side-view environment art
- perspective-painted landscapes
- pseudo-3D renders
- oblique environment objects inconsistent with the map renderer.

Use the established DEUS world perspective references.

======================================================================
36. LIGHTING CONSISTENCY
======================================================================

Use one canonical art-baked light direction.

Do NOT change light direction by biome or tileset variant.

Biome ambient color may shift.

Material lighting logic remains constant.

The same rock under snow should still read as the same rock material.

======================================================================
37. MATERIAL CONTINUITY
======================================================================

Use shared material families.

Example:

wet granite
=
granite
+
wet treatment.

snowy granite
=
granite
+
snow/frost treatment.

volcanic basalt
may be a different rock family.

Do not completely reinvent materials whenever biome changes.

======================================================================
38. WATER
======================================================================

Water is a physical fluid system in DEUS.

Art should provide a coherent presentation library for:

- wet shore
- water edge
- shallow water
- medium water
- deep water
- moving river
- pond/lake
- vertical waterfall/drop
- foam/ripple where useful.

All animated water assets:

3 frames.

Fluid simulation depth remains gameplay data.

Art may group multiple depths into visually sensible ranges.

Do not make separate physical rules in the artwork.

======================================================================
39. LAVA
======================================================================

Provide:

- scorched transition
- lava edge
- lava interior
- flow
- bubble/hot spots
- vertical flow where supported.

3 animation frames for every moving lava presentation.

Lava should be immediately dangerous/readable at fixed gameplay scale.

======================================================================
40. VEGETATION
======================================================================

For each relevant biome/Z layer supply appropriate:

- grass
- tall grass
- flowers
- weeds
- bush
- shrub
- sapling
- tree
- dead vegetation
- reeds
- moss/vines
- roots underground where appropriate.

Do not place full surface vegetation in deep Z-2 unless biome geology/ecology
supports it.

======================================================================
41. TREE SCALE
======================================================================

Trees should generally be MULTI-TILE visual objects.

Do not compress mature trees into one tiny 48×48 tile merely for convenience.

Use:

canonical Human reference
+
logical trunk footprint
+
larger visible canopy.

Root/ground anchor stays stable across all three animation frames.

Only foliage/branches subtly move.

======================================================================
42. ROCK / CLIFF SCALE
======================================================================

Small stones:
sub-tile.

Boulders:
human-relative.

Outcrops:
multi-tile where needed.

Cliffs:
physical Z geometry.

Do not make all rocks identical 48×48 decorative lumps.

======================================================================
43. UNDERGROUND ART
======================================================================

Z-1 and Z-2 MUST receive full art treatment.

Do not treat them as:

“surface tiles but darker.”

Provide:

- roots
- strata
- stone variation
- cave debris
- underground water
- mineral stains
- geological transitions
- biome-specific underground identity.

The underground should feel authored and connected to surface geology.

======================================================================
44. PATHS / NATURAL TRAVEL
======================================================================

Provide natural transition-compatible path surfaces:

- trampled grass
- dirt
- muddy path
- rocky path
- sandy track
- snowy track
- ash track

where appropriate.

Do not generate racial paved-road architecture in this biome pack.

Constructed roads may later overlay biome ground.

======================================================================
45. NEUTRAL RUINS / NATURAL REMAINS
======================================================================

Generic ancient/non-cultural natural ruin-like objects may only be included
if approved.

Do not accidentally define racial architecture through biome tiles.

Racial building graphics are separate.

======================================================================
46. ART STYLE
======================================================================

Follow canonical DEUS ART_STANDARD.

The intended identity remains:

GROUNDED WESTERN DARK FANTASY
rendered with
HIGH-READABILITY LATE-16-BIT PIXEL ART.

Traits:

- late-SNES clarity
- FFV/FFVI-era color discipline and silhouette readability
- old-school Western/Ultima-like material grounding
- selective grimdark
- strong contrast
- no muddy darkness
- beautiful restrained color
- clear topography
- original art.

Do NOT copy any existing game asset.

======================================================================
47. NO STOCK-RTP LOOK
======================================================================

Do not default to generic RPG Maker visual language.

RMMZ defines:

- geometry
- file format
- map rules.

DEUS defines:

- appearance.

The assets should look like DEUS while being technically correct for RMMZ.

======================================================================
48. AI ART CONSISTENCY
======================================================================

Every Nano Banana Pro generation must receive:

- current ART_STANDARD
- SCALE_AND_ASSET_MASTER_BIBLE
- canonical Human scale reference
- global palette lattice
- biome style profile
- Z-layer profile
- selected tileset-variant profile
- exact RMMZ template/mask
- approved golden references
- editable region where appropriate.

Do NOT rely on conversation memory alone.

======================================================================
49. GENERATION PROMPTS MUST BE COMPILED
======================================================================

Do not hand-write thousands of independent prompts.

Use structured asset specs.

Conceptually:

assetId
biome
zLevel
variant
sheetType
tileFamily
animationFrame
dimensions
paletteProfile
transitionTargets
scaleReference
template
mask
goldenReferences

→ Prompt Compiler
→ Nano Banana Pro.

This is mandatory for consistency.

======================================================================
50. SOURCE-ART / FINAL-PACKING SEPARATION
======================================================================

Nano Banana Pro does NOT need to paint every complete final sheet at once if
doing so reduces precision.

Preferred production:

generate exact source assets
→ validate
→ deterministic packing
→ complete A/B/etc. sheet
→ final validation.

No manual arbitrary repositioning.

======================================================================
51. FILE / ASSET LIFECYCLE
======================================================================

Use:

CANDIDATE
→
VALIDATED
→
APPROVED.

Nano Banana output goes to CANDIDATE.

It does not immediately overwrite canonical game art.

APPROVED assets become source material for later generations.

======================================================================
52. QC REQUIREMENTS
======================================================================

Every final asset must pass all applicable current DEUS art QC.

Including:

- correct dimensions
- correct RMMZ packing
- exact allowed palette policy
- correct transparency
- nearest-neighbor compatibility
- scale correctness
- seam checking
- texture-frequency check
- animation-frame consistency
- frame-to-frame ground-anchor stability
- no accidental geometry movement
- no style drift
- macro blend test
- actual-camera screenshot inspection.

Do not declare an asset approved solely because it looks attractive enlarged.

======================================================================
53. ANIMATION QC
======================================================================

For every 3-frame asset validate:

- identical ground footprint
- stable silhouette where structurally required
- no hue flash
- no luminance strobe
- no unintended pixel crawl
- seamless Frame3 → Frame1 loop
- looks valid under phase desynchronization
- correct scale in every frame.

======================================================================
54. GLOBAL PALETTE QC
======================================================================

Verify that the six internal variants of one biome:

blend progressively.

Verify that biome transition colors:

share enough values/hues to avoid hard visible borders.

Create palette-strip visualization showing all:

6 biomes
×
5 Z layers
×
6 variants

before final production.

This palette map must be user-reviewable.

======================================================================
55. HUGE PRODUCTION WARNING
======================================================================

This project is intentionally large.

DO NOT begin by attempting all:

180 complete tileset packages.

That would waste enormous generation cost if the style/scale/blend system
requires revision.

Use staged proof.

======================================================================
56. PHASE A — DESIGN MATRIX
======================================================================

Before image generation, produce:

1. six-biome definitions
2. five-Z vertical profiles
3. six-variant logic
4. global palette lattice
5. 15-pair biome transition matrix
6. tileset content manifest
7. animation manifest
8. RMMZ sheet/template plan
9. deterministic packing plan
10. naming/versioning plan.

Return for coordinator review.

======================================================================
57. PHASE B — FIRST VISUAL PROOF
======================================================================

After the design matrix is accepted:

use NANO BANANA PRO ONLY to create ONE complete proof column:

TEMPERATE BIOME
Z0
ALL SIX TILESET VARIANTS.

This means:

Temperate_Z0_01
Temperate_Z0_02
Temperate_Z0_03
Temperate_Z0_04
Temperate_Z0_05
Temperate_Z0_06.

Produce enough of the complete RMMZ package to genuinely validate:

- ground/autotiles
- grass shades
- dirt
- vegetation
- tree scale
- rocks
- water edge
- cliffs
- animation triplets
- B–E object density
- transitions among all six variants.

Do not fake the test with one concept painting.

Use engine-ready source geometry.

======================================================================
58. PHASE C — BLEND PROOF
======================================================================

Create a deterministic RMMZ test map using all six Temperate Z0 variants.

The landscape must gradually transition:

01 → 02 → 03 → 04 → 05 → 06.

Place:

- Human scale reference
- trees
- rocks
- grass
- flowers
- water
- cliff/elevation
- paths.

Run at canonical fixed gameplay camera.

Capture screenshots.

User will YEA or NAY.

STOP at this gate.

Do not continue mass production until explicit approval.

======================================================================
59. PHASE D — FIRST BIOME EDGE PROOF
======================================================================

After Temperate internal blending is accepted:

generate the first cross-biome edge:

TEMPERATE
↔
WETLAND

and/or the most informative transition selected by the coordinator.

Prove:

six-shade internal gradient
+
cross-biome gradient.

Again show actual RMMZ test map.

Require approval.

======================================================================
60. PHASE E — VERTICAL PROOF
======================================================================

After horizontal biome blending is accepted:

produce the same biome through:

Z+2
Z+1
Z0
Z-1
Z-2.

Test a vertical column showing:

surface
upland
cliff
shallow underground
deep underground

and confirm it feels like one coherent physical geography.

User approval required.

======================================================================
61. PHASE F — SCALED PRODUCTION
======================================================================

Only after:

- internal shade proof
- cross-biome proof
- vertical-Z proof
- animation proof
- camera/scale proof

are approved:

begin full production of the remaining 180-package matrix.

Generate in bounded batches.

Do not generate everything in one uninterrupted run.

======================================================================
62. BATCH SIZE
======================================================================

Use small enough production batches that style drift can be detected.

Recommended maximum:

ONE biome × ONE Z layer × SIX variants

per review batch initially.

Once repeated batches demonstrate strong consistency, Gemini may propose a
larger batch size.

Do not increase without evidence.

======================================================================
63. PRODUCTION MATRIX
======================================================================

Maintain a machine-readable production matrix for all:

BIOMES:
6

Z LEVELS:
5

VARIANTS:
6

Total:
180 entries.

Each entry tracks:

NOT_STARTED
CANDIDATE
VALIDATED
APPROVED
REJECTED
SUPERSEDED.

No missing cells.

======================================================================
64. ANIMATED ASSET MATRIX
======================================================================

For each package track every feature requiring:

FRAME_1
FRAME_2
FRAME_3.

Do not allow an animated feature to be considered complete with only one or
two frames.

======================================================================
65. REUSE WITHOUT CHEATING
======================================================================

Reuse is allowed when logically correct.

Examples:

same geological stone family across neighboring variants

with palette/environment treatment differences.

But do not claim:

copy-paste exact tileset six times

meets the six-variant requirement.

Each variant must visibly contribute to gradual landscape variation.

======================================================================
66. NO MANUAL PATCHWORK PIPELINE
======================================================================

Avoid a workflow where every generated sheet requires hours of manual
Photoshop repair.

The purpose of:

- templates
- masks
- prompt compiler
- deterministic packing
- QC
- iterative Nano Banana correction

is to make production scalable.

If a repeated defect requires manual repair:

fix the pipeline or prompt standard.

Do not normalize recurring manual cleanup.

======================================================================
67. PERFORMANCE CONSTRAINT
======================================================================

Remember DEUS's runtime target:

60 FPS
+
4× simulation.

Do not create an animation architecture that requires:

every tile on the entire 256×256×5 world

to update visually every frame.

Only visible/cached world presentation should animate.

Use shared frame references and phase offsets.

Art design must permit this.

======================================================================
68. ANIMATION SHOULD BE CHEAP
======================================================================

A topographical animation is:

frame index selection

not:

runtime image deformation.

No live warping.

No skeletal terrain animation.

No expensive per-pixel effects for ordinary grass/tree movement.

Use prepared 3-frame art.

======================================================================
69. OUTPUT NAMING
======================================================================

Use deterministic IDs.

Example concept:

BIO_TEMPERATE_Z0_V01_A2
BIO_TEMPERATE_Z0_V01_TREE_OAK01_F01

etc.

Use actual existing DEUS naming conventions if different.

Do not invent inconsistent filenames during generation.

======================================================================
70. GOLDEN REFERENCES
======================================================================

The first approved:

- ground
- grass
- tree
- bush
- rock
- cliff
- water
- transition

become GOLDEN biome references.

Future generation uses them.

Do not silently replace them.

======================================================================
71. REQUIRED FIRST RETURN BEFORE GENERATION
======================================================================

BEFORE invoking Nano Banana Pro, return:

1. current HEAD
2. git status
3. canonical art docs read
4. canonical RMMZ technical docs read
5. exact interpretation of “full tileset package”
6. confirmation of 180-package production matrix
7. six biome definitions
8. five-Z vertical profile matrix
9. six-variant strategy
10. global palette lattice proposal
11. 15-pair biome transition matrix
12. RMMZ A1–E content allocation
13. animated feature manifest
14. 3-frame storage/metadata architecture
15. Human scale-reference plan
16. deterministic atlas-packing plan
17. QC plan
18. pilot-generation asset list
19. estimated number of Nano Banana Pro generation jobs for the pilot
20. exact directories/files to be written
21. stop/approval boundary.

Do NOT call Nano Banana Pro until the production matrix and templates have
been checked against the current repository.

======================================================================
72. NANO BANANA PRO GENERATION RULE
======================================================================

After the coordinator confirms the first pilot:

Generate ONLY using:

GOOGLE NANO BANANA PRO.

Every generation call receives:

GLOBAL DEUS ART STANDARD
+
RMMZ TEMPLATE
+
DEUS SCALE STRIP
+
Human scale reference
+
GLOBAL PALETTE LATTICE
+
BIOME PROFILE
+
Z PROFILE
+
VARIANT PROFILE
+
existing GOLDEN references
+
specific asset spec.

Do not send vague:

"make forest tiles."

Every request must be structurally constrained.

======================================================================
73. FINAL VISUAL TARGET
======================================================================

At fixed gameplay camera distance:

DEUS should look like ONE CONTINUOUS PHYSICAL WORLD.

A player looking across a large landscape should see:

slow changes in green
→
changes in plant density
→
changes in moisture
→
changes in rock
→
changes in elevation
→
another biome

without seeing obvious rectangular biome borders.

Looking vertically:

Z+2
→
Z+1
→
Z0
→
Z-1
→
Z-2

should feel like moving through the altitude and geology of the SAME region.

The world should be:

beautiful
coherent
animated
alive
physical
readable
and unmistakably DEUS.

======================================================================
74. FINAL HARD RULES
======================================================================

NANO BANANA PRO ONLY for generated imagery.

6 biomes.

5 physical Z layers.

6 complete tileset variants per biome per Z.

180 full production packages.

Three frames for every feature that should animate.

Correct RMMZ geometry.

Correct Human-relative scale.

Smooth internal palette blending.

Smooth cross-biome blending.

Meaningful vertical continuity.

No hard biome borders.

No floating upper terrain.

No stock-RTP appearance.

No alternate image generator.

No mass production until the first pilot is visually approved.
```

This gives Gemini enough freedom to solve the enormous packing problem while making the **non-negotiables** unambiguous.

The part I especially would not compromise on is the pilot sequence:

**six Temperate Z0 sets → blended test map → your yea/nay → first cross-biome transition → your yea/nay → five-Z vertical stack → your yea/nay → mass production.**

That way you don't discover 100 tilesets later that the six shades are too close together, too different, the trees are the wrong scale, or the three-frame vegetation animation looks bad.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-09-24T13:15:12-05:00.

The user's current state is as follows:
Active Document: c:\Users\snewt\OneDrive\Desktop\UF\docs\art\DEUS_BIOME_TOPOGRAPHY_ANIMATION_BRIEF.md (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- c:\Users\snewt\OneDrive\Desktop\UF\docs\DIVISION_OF_LABOR.md (LANGUAGE_UNSPECIFIED)
- c:\Users\snewt\OneDrive\Desktop\UF\docs\art\DEUS_ARTISTIC_STYLE_PROPOSALS.md (LANGUAGE_UNSPECIFIED)
- c:\Users\snewt\OneDrive\Desktop\UF\tools\build_interactive_sprite_viewer.js (LANGUAGE_UNSPECIFIED)
- c:\Users\snewt\OneDrive\Desktop\UF\game\js\plugins\UF_Levels.js (LANGUAGE_UNSPECIFIED)
- c:\Users\snewt\OneDrive\Desktop\UF\game\data\UF_WorldCatalog.json (LANGUAGE_UNSPECIFIED)
</ADDITIONAL_METADATA>