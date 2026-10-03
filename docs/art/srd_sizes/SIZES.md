# DEUS: pixel sizes for SRD 5.1

Source: Deus's tables from `SRD_CC_v5.1.pdf` (pdftotext -layout), moved from `scratchpad/srd-sizes/` on 2026-10-02. Files: [creatures.csv](creatures.csv) (319 rows, one per stat block), [items.csv](items.csv) (514 rows).
Deus attributes each creature's size and type to its stat block line in the PDF. Stated SRD dimensions remain labeled in the notes. Each row now labels dimensions without an explicit SRD source as real-world/art estimates, not SRD measurements. Moving these tables does not constitute a new PDF audit.

SRD material attribution and CC-BY-4.0 license record: [CREDITS.md](../../CREDITS.md#system-reference-document-51-creative-commons-cc-by-40). The Owner-approved changes and DEUS art estimates are identified here and in the row notes; they are not presented as unchanged SRD dimensions.

**APPROVED by the Owner, 2026-10-02 22:21 CT: "go large, make it cool".** Approval and the later item-art rule are recorded in [DECISIONS.md](../../DECISIONS.md), D-2026-10-02-16 and -17. These are design/reference tables; implementation is parked under **ART-SCALE-1 until the world loads green**. No sprites, runtime data, renderer or collision rules are changed by this document.

## Fixed game scale (Owner)
- Ground: 1 tile = 48 px = 5 ft. Shared High Top-Down camera. Door = 48x96. Walls total 96 px: 48 px face + 48 px cap.
- Vertical scale is about 12 px per ft (6 ft human = 72 px). Looks beat realism. Creature canvases are multiples of 12 (most are multiples of 24).
- Playable races: Halfling/Gnome 48x48, Dwarf 48x60, Human/Elf/Half-elf/Tiefling 48x72, Half-orc/Dragonborn 48x96.
- Trees: sapling 48x48 to 48x72, young 96x144, mature 144x192 to 144x240, ancient 192x288+.

## Creature rules
- Footprint follows the SRD grid with approved departures: Tiny shares a tile (up to 4 per tile). Small and Medium are 1x1, Large 2x2, Huge 3x3. Gargantuan defaults to 4x4, but Kraken, Tarrasque, ancient dragons and all other Gargantuan flyers are 6x6. Dragon Turtle and Purple Worm remain 4x4.
- Canvas width = footprint x 48. Exceptions: Medium long-bodied or winged creatures get 72 or 96 px canvases that overhang neighbours (footprint stays 1 tile). Flyers of any size include their wingspan, so Large/Huge/Gargantuan flyers overhang too. Tiny creatures use a 48x48 canvas with a visible sprite of about 16–32 px.
- Canvas height by body shape: humanoid = 12 px/ft. Quadruped = about 0.75 x width (tall-necked or tusked animals go higher, low-slung reptiles lower, with a note). Serpent/ooze/swarm = flat, square canvas. Flyer = wingspan in the width.
- Medium creatures are never taller than 96 px.
- Door: YES = 1x1 footprint and height 96 or less (Tiny/Small/Medium; a Medium canvas overhang doesn't matter because it passes through lengthwise). SQUEEZE = Large (SRD squeezing: it fits a space one size smaller, with the squeezing penalties). NO = Huge and Gargantuan.

## Item rules (Ultima VII-style: one sprite everywhere)
- Each item has exactly one sprite (`sprite_w` x `sprite_h`) at true scale of about 12 px/ft (= 1 px per inch). The same sprite is used in the world, on surfaces and inside container gumps. There is no separate inventory icon. Large ships are walkable maps, as explained below, rather than item sprites.
- Owner 22:25 CT examples: mug about 4x5 px, candle about 3x8, book about 8x10. These are approximate art targets; pre-existing CSV estimates are not exact generated-art specifications.
- Every item uses the shared High Top-Down view and a bottom-center contact point (`anchor_x`, `anchor_y`) in its future runtime data. Furniture will carry `surface_height_px` and a placement polygon/rect in tile space. Free placement, surface-relative drawing and fixture checks are specified in D-2026-10-02-17; these fields are not implemented by the CSVs.
- Small items can be tiny: coin or ring about 4 px, dagger 12 px long, potion 8x12.
- `footprint_tiles` is only for furniture, vehicles, mounts and placed objects. Loose items are `-`.
- `held_overlay` = length of the in-hand sprite on a 48x72 human (dagger 12, longsword 36, greatsword 48, pike/lance 96).
- `weight_lb` = SRD weight wherever the SRD gives one. It drives encumbrance, the only inventory limit (no volume capacity). It is blank when the SRD shows "—" or gives nothing.
- Door (items): YES fits normally. TILT = longer than 48 px, so it has to be carried upright or angled (polearms, staffs, 10-ft pole, ladder). NO = furniture or vehicles wider than 1 tile. Mounts and livestock that are Large use SQUEEZE like creatures.
- Horizontal ground lengths of placed objects use the SRD 5-ft grid (1 tile = 5 ft, about 9.6 px/ft). Heights and loose-item sprites use 12 px/ft.

## Summary per SRD size category (creatures.csv)
| SRD size | Count | Footprint | Canvas W range | Canvas H range | Typical canvases | Door |
|---|---|---|---|---|---|---|
| Tiny | 24 | 1x1 shared (up to 4) | 48 | 48 | 48x48 (visible 16–32 px) | YES |
| Small | 21 | 1x1 | 48 | 36–48 | 48x48 humanoid, 48x36 beast | YES |
| Medium | 123 | 1x1 | 48–96 | 48–96 | 48x72 humanoid, 72x60 / 96x72 quadruped, 96x72–96 winged | YES |
| Large | 104 | 2x2 | 96–192 | 48–144 | 96x72 quadruped, 96x120–144 upright, 144x96 winged | SQUEEZE |
| Huge | 32 | 3x3 | 144–288 | 72–288 | 144x192–240 giants, 192x144 adult dragons, 144x144 | NO |
| Gargantuan | 15 | 6x6 flyers/Kraken/Tarrasque; other 2 at 4x4 | 192–384 | 144–336 | 384x216 ancient dragons, 384x192 Roc, 192x192 | NO |

## 20 creature examples (range)
| Name | SRD size/type | Shape | Footprint | Canvas | Door |
|---|---|---|---|---|---|
| Rat | Tiny beast | quadruped | 1x1 (shared; up to 4 per tile) | 48x48 | YES |
| Imp | Tiny fiend (devil, shapechanger) | flyer | 1x1 (shared; up to 4 per tile) | 48x48 | YES |
| Goblin | Small humanoid (goblinoid) | humanoid | 1x1 | 48x48 | YES |
| Giant Rat | Small beast | quadruped | 1x1 | 48x36 | YES |
| Commoner | Medium humanoid (any race) | humanoid | 1x1 | 48x72 | YES |
| Gnoll | Medium humanoid (gnoll) | humanoid | 1x1 | 48x96 | YES |
| Wolf | Medium beast | quadruped | 1x1 | 72x60 | YES |
| Deva | Medium celestial | flyer | 1x1 | 96x96 | YES |
| Swarm of Rats | Medium swarm of Tiny beasts | swarm | 1x1 | 48x48 | YES |
| Gelatinous Cube | Large ooze | other | 2x2 | 96x120 | SQUEEZE |
| Ogre | Large giant | humanoid | 2x2 | 96x144 | SQUEEZE |
| Riding Horse | Large beast | quadruped | 2x2 | 96x96 | SQUEEZE |
| Griffon | Large monstrosity | flyer | 2x2 | 144x96 | SQUEEZE |
| Hill Giant | Huge giant | humanoid | 3x3 | 144x192 | NO |
| Storm Giant | Huge giant | humanoid | 3x3 | 192x288 | NO |
| Adult Red Dragon | Huge dragon | flyer | 3x3 | 192x144 | NO |
| Giant Shark | Huge beast | serpent | 3x3 | 288x144 | NO |
| Ancient Red Dragon | Gargantuan dragon | flyer | 6x6 | 384x216 | NO |
| Roc | Gargantuan monstrosity | flyer | 6x6 | 384x192 | NO |
| Tarrasque | Gargantuan monstrosity (titan) | other | 6x6 | 288x336 | NO |

## Item examples
| Item | Sprite | Footprint | Held | Door | lb |
|---|---|---|---|---|---|
| Signet ring | 4x4 | - | - | YES | - |
| Dagger | 12x4 | - | 12 | YES | 1 |
| Potion of healing | 8x12 | - | - | YES | 0.5 |
| Longsword | 36x6 | - | 36 | YES | 3 |
| Greatsword | 48x8 | - | 48 | YES | 6 |
| Pike | 96x4 | - | 96 | TILT | 18 |
| Shield | 24x30 | - | 30 | YES | 6 |
| Backpack | 18x24 | - | - | YES | 5 |
| Chest | 36x24 | 1x1 | - | YES | 25 |
| Barrel | 24x36 | 1x1 | - | YES | 70 |
| Ladder (10-foot) | 18x120 | 1x3 (lying) / 1x1 (leaning) | - | TILT | 25 |
| Cart | 96x72 | 2x1 | - | NO | 200 |
| Wagon | 144x96 | 3x2 | - | NO | 400 |
| Rowboat | 144x48 | 3x1 | - | NO | 100 |
| Galley | 1536x384 map bounds (not a sprite) | 32x8 | - | NO | - |
| Instant Fortress | 1x1 | - | - | YES | - |

Ships are **true-scale walkable tile maps**, not reduced sprites. Their horizontal decks use the ground grid: 5 ft / 48 px per tile; mast heights use 12 px/ft. The existing `sprite_w` / `sprite_h` columns hold **map pixel bounds only** for the five large vessel rows, explicitly marked `MAP BOUNDS` in each note. They do not prescribe a monolithic image. Small boats such as Rowboat remain objects with one sprite.

| Vessel | Walkable map bounds | Ground envelope | Pixel bounds |
|---|---|---|---|
| Keelboat | 10x3 tiles | 50x15 ft estimate | 480x144 |
| Longship | 15x4 tiles | 75x20 ft rounded envelope | 720x192 |
| Sailing ship | 20x5 tiles | 100x25 ft estimate | 960x240 |
| Warship | 24x5 tiles | 120x25 ft estimate | 1152x240 |
| Galley | about 32x8 tiles (Owner) | about 160x40 ft | 1536x384 |

Non-galley footprints convert the source's real-world estimates to whole-tile envelopes; these are labeled documentation estimates, not SRD dimensions or exact Owner-selected hull dimensions. The Owner's galley envelope supersedes the earlier 130x20-ft estimate. The Feather Token's 50x20-ft swan boat is a 10x4 walkable map. Folding Boat's 24x8-ft ship uses a 5x2 map envelope (240x96 px), while its box and smaller boat remain objects.

## Judgement calls
1. **Creature count = 319 stat blocks.** This includes 2 that sit inside magic-item text: Avatar of Death (Deck of Many Things) and Giant Fly (Figurine of Wondrous Power). The Appendix covers Misc. Creatures (Ape…Wolf) and NPCs (Acolyte…Veteran).
2. NPCs are "Medium humanoid (any race)". They get the Human 48x72 canvas. Swap in the race canvas if a race is chosen.
3. Lycanthropes are Medium in their stat blocks, so they're drawn in hybrid form (48x72–96). The animal forms (e.g. Large werebear bear form) need extra sprites.
4. Giants: SRD 5.1 has no Giants lore/heights. Hill/frost/fire/cloud/storm follow the Owner examples. Stone giant 144x216 is interpolated. Cloud/storm canvases (192 wide) overhang their 3x3 footprint.
5. Medium winged creatures (Deva, Erinyes, Succubus, Gargoyle, Harpy, Couatl, wyrmlings) use 96-px canvases that overhang neighbours and are height-capped at 96.
6. Large+ flyers have wingspan wider than their footprint (Large 144, Adult 192, Ancient 384, Roc 384). All 11 Gargantuan flyers use the approved 6x6 footprint. Ancient-dragon canvas widths increase to the 384-px art estimate to preserve wing overhang beyond the 288-px footprint; existing heights stay 216 px. Roc already has sufficient overhang at 384x192.
7. Horses, camel, elk, elephant, mammoth, T-rex are taller than the 0.75 rule (neck/head/tusks). Crocodiles and giant lizard are lower.
8. Sharks use SRD lengths: reef shark 6–10 ft (drawn 96), hunter shark 15–20 ft (drawn 192), giant shark 30 ft (drawn 288, true 360). The killer whale's length isn't in the SRD (drawn 192).
9. Tarrasque and Kraken are 6x6 and 288x336 / 288x288. The SRD gives no heights.
10. Treant and Awakened Tree match the mature-tree band (144x240 / 144x192).
11. Gelatinous Cube is a 10-ft cube shown top + front (96x120). Rug of Smothering is flat (96x48). Oozes are square canvases with low visible bodies.
12. Small winged mephits keep wings inside 48 px; Medium winged creatures may overhang up to 96 px wide, and Large+ flyers overhang their footprints.
13. Grid vs. vertical scale: 1 tile = 5 ft on the ground (SRD grid) but 4 ft vertically (12 px/ft). Ground footprints follow the grid, heights follow 12 px/ft.
14. Item sprites are at 1 px/inch, so many are smaller than 12 px and not multiples of 12. This is on purpose (Owner change for Ultima VII-style gumps).
15. Armor sprites are a folded suit (24x30). The worn look is a paper-doll layer on the race canvas.
16. Magic items "any sword/axe/armor" use the base item's sprite. Default shown is longsword or the base armor.

## SRD gaps (sizes not in the SRD; estimated)
- Where no dimension is explicitly sourced in a row, weapon, armor, gear, tool, vehicle, ship and creature dimensions are real-world/art estimates, labeled per row. Source-stated dimensions such as the 10-ft pole and magic-item forms remain identified. The 12-ft rowboat in Robe of Useful Items and Folding Boat's 10x4-ft boat are distinct references, not a single set of dimensions.
- No SRD heights for any monster except the SRD-text lengths above. Heights come from the rules here.
- Livestock trade goods (chicken, sheep, pig, cow, ox) have no stat blocks. They're sized by analogy and listed in items.csv.
- SRD magic-item dimensions used: Bag of Holding (2 ft mouth, 4 ft deep, 15 lb), Carpet of Flying (3x5 to 6x9 ft), Crystal Ball (~6 in), Cube of Force (3 in), Cubic Gate (3 in), Folding Boat (box/boat/ship), Instant Fortress (1 in cube; 20x20x30 ft tower), Portable Hole / Well of Many Worlds (6 ft circle), Sphere of Annihilation (2 ft), Mirror of Life Trapping (4 ft, 50 lb), Bowl (1 ft), Censer (6 in x 1 ft), Iron Bands (3 in), Restorative Ointment (3 in jar), Orb of Dragonkind (10→20 in), Chime of Opening (1 ft), Feather Token (60-ft tree, 50x20-ft boat), Robe of Useful Items patches, Apparatus of the Crab (Large barrel, 500 lb).
- Not sized: spell-created effects (walls, Tiny Hut, Floating Disk, etc.) and services (stabling, lifestyle).
