# SRD Spell-Effect Audit (SIM.60.01, design only)

- **Task:** SIM.60.01 · **Lane:** lane-p · **Writer:** Claude · **Reviewer:** Grok (independent; review pending) · **Date:** 2026-09-26
- **Status:** Submitted for independent review. The writer does not certify this work.
- **Authority:** DEC-018 (`docs/OWNER_DECISIONS.md`), PM directive 0028-AC §5, `tasks/SIM.60.01/lane-p/BRIEF.md`.
- **Data:** `docs/audits/srd_spell_effect_audit.json` has one record per spell. Where this document and the JSON differ, the JSON is the record.
- **Base commit** (`git rev-parse` of the branch base; `spells.json` is unchanged between the base and the branch head): `b612bc7217349bce695e15395bd041f63673b89b`
- **No code, no art.** This is a design document. Nothing here changes `game/`, `tools/` or any coordinator file.

## Contents
0. Summary
1. Method, inputs and counts
2. Classification by world system
3. Spell-effect schema proposal
4. Dependencies and implementation order
5. Conjured matter versus LIFE-001 (Owner question)
6. Owner questions
7. Source disagreements, escalation and limits

---

## 0. Summary

- **Coverage.** `game/data/srd51/spells.json` has 327 entries: 319 with `kind: "spell"` and 8 class spell lists (`kind: "spell-list"`). The JSON has 319 records, one per spell, matched by `id`, with no extras. The 8 spell lists are out of scope and are listed under `outOfScope`.
- **How many spells change the world.** 111 spells (35%) need at least one physical world system. 208 (65%) are `NONE`: they affect only creature stats, minds or senses, or they are divination, illusion, transport, summoning or meta-magic. Each `NONE` record gives its reason.
- **Systems** (a spell can need several): LIFE 35, FORCE 27, LIGHT 26, EARTH 25, HEAT 23, AIR 12, WATER 11, COLD 10.
- **Primitives.** 28 draft primitives. 22 are physical (heat, cold, force, fluids, earth, light, life, air), 2 are entity or object level (`animate`, `objectTransform`) and 4 are meta (`magicSuppress`, `magicEnd`, `extraplanarHold`, `castStored`). Every primitive used by a record is defined in the schema draft (§3.2, §3.6).
- **Crossing layers.** 13 spells can breach a floor, 15 make matter, gas or creatures fall or flow to lower layers, 206 reach other layers only through openings (3D targeting, areas, light, teleport destinations), and 85 stay on the caster or one target.
- **Conservation.** 24 create matter (conjured source), 1 destroys matter permanently (conjured sink), 51 change matter's form or place (transform, including fuel burned and floors broken), and 243 change no matter.
- **Much of the physics is already in the SRD text.** Examples: Fireball "ignites flammable objects"; Cloudkill's vapours "sink to the lowest level of the land, even pouring down openings"; Wall of Stone must be "solidly supported by existing stone" and needs supports for spans over 20 feet; Earthquake deals 50 bludgeoning damage per turn to structures and opens fissures up to 100 feet deep; Freezing Sphere freezes water "to a depth of 6 inches over an area 30 feet square"; Gust of Wind "extinguishes candles, torches, and similar unprotected flames"; Fog Cloud disperses in wind of "at least 10 miles per hour". Each record separates what the SRD states ("SRD:") from what DEUS adds on top ("Added:"). The additions follow the rules in §3.1.
- **Schema.** A JSON Schema 2020-12 draft is in §3.6. It never copies SRD numbers: effects point into the SRD baseline (`/area/0`, `/damage/0`, `/duration`). The five worked examples in §3.7 validate against it, and nine deliberately broken variants are rejected (temp ajv run; the commands and output are in `tasks/SIM.60.01/lane-p/REPORT.md`).
- **Gaps with no WBS row:** a stored temperature field (G-TEMP, 19 records), gas and smoke volumes (G-GAS, 8 records), and a simulation-side light field (G-LIGHT, 26 records). See §4.3.
- **Blocking disagreement.** The sources give four different game-time scales, so an SRD "1 minute" can last from about 1/6 of a real second to 1 real second or 60 action seconds. This is escalated in `tasks/SIM.60.01/lane-p/escalation.md` and is Owner question Q2.
- **Owner questions** (§6), none answered here: Q1 conjured matter and the conservation ledger (five parts), Q2 the time scale for spell durations, Q3 physical effects for damage types the ruling does not name (acid, lightning conduction, necrotic, radiant), Q4 SRD-silent properties of magical substances and barriers.

---

## 1. Method, inputs and counts

### 1.1 Inputs

| Input | Detail |
|---|---|
| `game/data/srd51/spells.json` | sha256 `7372eccda0bcfd3c27e77822ef5226422b238955636ad69bbbae69ef78d58e94`, `schemaVersion` 1, generator `tools/build_srd_catalog.js`, `dormant: true`. 327 entries: 319 `spell` + 8 `spell-list`. Of the spells, 317 are `readiness: "parsed"` and 2 are `"verified"` (alter-self, teleport). This audit changes no readiness state. |
| `game/data/srd51/rules.json` | `srd:condition:petrified` only, for Flesh to Stone and Prismatic Spray ("Its weight increases by a factor of ten"). |
| Decisions | DEC-013 (32 layers, 5-ft cells, 10-ft layers, 2-ft strata, cross-layer blast §4), DEC-018 (this ruling), DEC-019 (height and falling), DEC-022 (cross-layer 3D targeting and volume damage). |
| WBS | `docs/worldgen/DEUS_WORLDGEN_WBS.md` rows SIM.00.00-.04, SIM.40.01-.10, SIM.50.01-.10, SIM.60.01-.04, GP.07.02, WG.00.17-.21, WG.61.02, WG.65.15. |
| ADR-003 Rev 2 | `docs/adr/ADR-003_sim_render_split_and_lod.md` at `c456cb73` on `task/lane-m` (read with `git show`; PROPOSED; Rev 3 is in progress in Lane M). Used for the ledger (§7.8), tick (§3.1-3.2) and LOD rules. |
| Code (read only) | Cited in §4.2. |

**Count disagreement, settled by the brief.** WBS row SIM.60.01 says "Classify all 327 spells". 327 is the total entry count, including the 8 class spell lists. The brief says 319 `kind: "spell"` records, with the spell lists listed separately. This audit follows the brief.

### 1.2 Method

1. **Extraction.** A temporary node script outside the repo (not committed, per the brief's no-code rule) did the following:
   - Copied `level`, `school`, `ritual`, `castingTime`, `range`, `components` (the whole object), `duration` and `concentration` verbatim from each entry's `data`.
   - Found area, saving throw, spell attack and damage phrases in `data.range` and `data.description` with regular expressions. Each is stored as an exact substring (`quote`), with `from` naming the field, plus parsed numbers (for example `radiusFt`).
   - Stored `higherLevels.atHigherLevels` as `data.atHigherLevels` verbatim, and `cantripScaling` as the description sentence containing "when you reach 5th level".
   - Kept PDF text artefacts as they are (for example "60-foot- radius sphere"), because the quotes must match the source.
2. **Classification by hand.** The writer read every spell's full description and wrote `systems`, `primitives`, `physicalEffects`, `crossLayer`, `conservation`, `confidence` and `notes`, following the definitions in §1.3 and the rules in §3.1. Where the regex areas were wrong or missing (for example Control Water's "a cube up to 100 feet on a side"), the area was set by hand, still as an exact quote.
3. **Assembly and checks.** A temporary script merged the two and refused to write output unless all of these held:
   - every quote is a substring of its source field;
   - the copied fields equal the source;
   - there is exactly one record per spell id;
   - every enum value is valid;
   - `NONE` stands alone and has a written reason;
   - every system is supported by at least one primitive, and every physical primitive falls under one of the record's systems;
   - `conjureMatter` and `fluidSource` imply `conjured-source`;
   - `ignite`, `volumeDamage` and `terrainEdit` imply a conservation value other than `none`;
   - `volumeDamage` implies `breaches-floor` unless the notes limit it to objects;
   - every double-quoted phrase in `physicalEffects` and `notes` is found in the SRD text and replaced by the exact source substring.

   The first full run reported 16 problems (non-SRD phrases in double quotes, three system/primitive mismatches), which were fixed. This shows the checks can fail.
4. **Derived fields.** `wbsDeps` and `wbsGaps` are derived mechanically from `primitives`, `crossLayer` and `conservation` with the tables in `meta.primitiveWbs`, `meta.crossLayerWbs`, `meta.conservationWbs` and `meta.primitiveGaps` (§4.1), plus a few named per-record additions.

### 1.3 Field definitions

**Systems** (`systems[]`). Only the nine names in the brief are used. No system was added:
- Acid, lightning conduction and sound are handled as Owner question Q3 and as a noise note (§4.3).
- Lightning ignition is HEAT, following the SRD Lightning Bolt clause.

| System | Meaning in this audit | Main WBS rows |
|---|---|---|
| HEAT | Fire and heat: ignition, burning, extinguishing, heat transfer (drying fuel, melting, red-hot metal) | SIM.50.05, SIM.50.06 |
| COLD | Heat removal: chilling, freezing water to ice | SIM.50.06, SIM.50.02 |
| FORCE | Kinetic and structural: pushes and lifts (`impulse`), damage to strata, structures and objects (`volumeDamage`), massless force barriers | SIM.40.01-.02, GP.07.02 |
| WATER | Liquids: create, destroy or move water, flooding, freezing and melt | SIM.50.02 |
| EARTH | Ground: strata edits, conjured stone or metal, ground-surface state (difficult terrain, slick, spikes) | SIM.40.01-.02, SIM.00.04, WG.65.15 |
| LIGHT | Light and magical darkness | WG.00.18 (presentation), G-LIGHT |
| LIFE | Plants, food and organic matter, bodies and corpses: growth, decay, conjured organics, body transforms, animated remains | SIM.50.04, SIM.40.07, SIM.40.10 |
| AIR | Gases and wind: fog, poison clouds, smoke, wind, weather | SIM.50.06, G-GAS |
| NONE | No physical world system. Creature stats, conditions, minds, senses, healing, divination, illusion, transport, summons or meta-magic. May still list an entity or meta primitive (for example `animate` for Animate Objects, `extraplanarHold` for Secret Chest). | — |

**`physicalEffects`.** One or two sentences. Text after "SRD:" quotes or closely paraphrases the spell. Text after "Added:" is a DEUS physical consequence under DEC-018. SRD numbers are never changed; they appear only as quotes.

**`crossLayer`** (one value per record; if several apply, the first in this order wins: `breaches-floor` > `falls/flows-down` > `targets-through-openings` > `none`):

| Value | Meaning |
|---|---|
| `breaches-floor` | The effect can damage or open a floor or ceiling and so reach the layer below (DEC-013 §4, DEC-022 §4). This includes non-destructive openings (Passwall, Stone Shape), noted in their records. |
| `falls/flows-down` | The effect creates or moves matter, gas or creatures that then fall or flow to other layers under gravity (conjured water, heavy gas, unsupported conjured stone, creatures dropped at the end of Fly or Rope Trick). Reverse Gravity is included with its direction noted. |
| `targets-through-openings` | The target, point of origin, destination or area can be on another layer, reached along open paths: DEC-022 line of sight through shafts, ravines and stairwells, an area or light radius spreading through openings, or a teleport destination. No structural damage and no gravity-driven movement. Every record with `lightEmit` or `darken` is at least this value, because light and darkness radii spread through openings. |
| `none` | Self or touch effects with no area, whose effect stays with one creature or object. |

**`conservation`** (ledger effect, ADR-003 Rev 2 §7.8 and LIFE-001; one value per record; precedence `conjured-source` > `conjured-sink` > `transform` > `none`):
- `conjured-source`: matter appears that did not exist (created water, conjured stone, food or ice, new body tissue). Includes temporary matter with a paired sink when the spell ends.
- `conjured-sink`: matter leaves the world permanently (Secret Chest's "irretrievably lost").
- `transform`: matter changes form or place with the total kept. This includes downstream transforms the spell starts (fuel to ash when it ignites something, strata to rubble when it breaks a floor, corpse to undead, water to ice, planar storage).
- `none`: no matter changes.

Multi-mode spells carry the dominant value. The schema (§3.6) records each effect's own ledger entry separately. For example, Create or Destroy Water is `conjured-source` in the audit, while its schema entries carry one source and one sink.

**`confidence`:**
- HIGH: the SRD states the physical effect, or clearly has none.
- MEDIUM: the effect is an addition under §3.1, or the SRD text allows more than one reading.
- LOW: the spell is open-ended or its physics is mostly unstated (Wish, True Polymorph, Imprisonment, Gate, Control Water, Conjure Elemental).

**`wbsDeps`** lists WBS rows that must exist for the physical effect (§4.1). The schema and runtime rows SIM.60.02 and SIM.60.03 apply to every non-`NONE` record and are not repeated. **`wbsGaps`** names needs with no WBS row (§4.3).

### 1.4 Counts

By system (a spell can count under several):

| System | Records |
|---|---|
| HEAT | 23 |
| COLD | 10 |
| FORCE | 27 |
| WATER | 11 |
| EARTH | 25 |
| LIGHT | 26 |
| LIFE | 35 |
| AIR | 12 |
| NONE | 208 |

By school (physical means at least one system other than NONE):

| School | Spells | Physical | NONE |
|---|---|---|---|
| abjuration | 39 | 7 | 32 |
| conjuration | 49 | 19 | 30 |
| divination | 29 | 0 | 29 |
| enchantment | 29 | 0 | 29 |
| evocation | 62 | 42 | 20 |
| illusion | 27 | 4 | 23 |
| necromancy | 25 | 10 | 15 |
| transmutation | 59 | 29 | 30 |
| **total** | 319 | 111 | 208 |

By level:

| Level | Spells | Physical | NONE | Breaches floor |
|---|---|---|---|---|
| 0 (cantrip) | 24 | 7 | 17 | 0 |
| 1 | 49 | 11 | 38 | 1 |
| 2 | 54 | 15 | 39 | 1 |
| 3 | 42 | 14 | 28 | 2 |
| 4 | 31 | 12 | 19 | 2 |
| 5 | 37 | 14 | 23 | 1 |
| 6 | 31 | 12 | 19 | 2 |
| 7 | 20 | 11 | 9 | 2 |
| 8 | 16 | 7 | 9 | 1 |
| 9 | 15 | 8 | 7 | 1 |
| **total** | 319 | 111 | 208 | 13 |

By cross-layer value, conservation value and confidence:

| crossLayer | Records |
|---|---|
| breaches-floor | 13 |
| falls/flows-down | 15 |
| targets-through-openings | 206 |
| none | 85 |

| conservation | Records |
|---|---|
| conjured-source | 24 |
| conjured-sink | 1 |
| transform | 51 |
| none | 243 |

| confidence | Records |
|---|---|
| HIGH | 234 |
| MEDIUM | 79 |
| LOW | 6 |

Primitive use (records that list each primitive):

| Primitive | Records |
|---|---|
| `ignite` | 20 |
| `extinguish` | 4 |
| `heatFlux` | 18 |
| `freezeFluid` | 3 |
| `volumeDamage` | 14 |
| `impulse` | 12 |
| `forceBarrier` | 9 |
| `conjureMatter` | 14 |
| `terrainEdit` | 5 |
| `surfaceState` | 16 |
| `fluidSource` | 5 |
| `fluidSink` | 1 |
| `fluidMove` | 1 |
| `gasVolume` | 7 |
| `gasDisperse` | 1 |
| `windField` | 4 |
| `weatherOverride` | 3 |
| `lightEmit` | 24 |
| `darken` | 4 |
| `growth` | 2 |
| `decay` | 2 |
| `bodyTransform` | 16 |
| `animate` | 6 |
| `objectTransform` | 2 |
| `magicSuppress` | 2 |
| `magicEnd` | 3 |
| `extraplanarHold` | 5 |
| `castStored` | 3 |

---

## 2. Classification by world system

Each table lists the records whose `systems` include that system. The JSON field names are given in the headers. "Cross-layer" abbreviations: BF = breaches-floor, FD = falls/flows-down, TO = targets-through-openings, — = none. "Ledger" abbreviations: SRC = conjured-source, SNK = conjured-sink, TF = transform, — = none.

### 2.1 HEAT
23 records.

| Spell (`name`) | Lvl | School | `systems` | `primitives` | Cross-layer | Ledger | Conf. |
|---|---|---|---|---|---|---|---|
| Druidcraft | 0 | transmutation | HEAT, LIFE | `ignite`, `extinguish`, `growth` | TO | TF | H |
| Fire Bolt | 0 | evocation | HEAT | `ignite` | TO | TF | H |
| Prestidigitation | 0 | transmutation | HEAT, COLD | `ignite`, `extinguish`, `heatFlux` | TO | TF | H |
| Burning Hands | 1 | evocation | HEAT | `ignite`, `heatFlux` | TO | TF | H |
| Create or Destroy Water | 1 | transmutation | WATER, AIR, HEAT | `fluidSource`, `fluidSink`, `gasDisperse`, `extinguish` | FD | SRC | H |
| Flame Blade | 2 | evocation | HEAT, LIGHT | `ignite`, `lightEmit` | TO | TF | M |
| Flaming Sphere | 2 | conjuration | HEAT, LIGHT | `ignite`, `heatFlux`, `lightEmit` | TO | TF | H |
| Heat Metal | 2 | transmutation | HEAT | `heatFlux`, `ignite` | TO | TF | M |
| Scorching Ray | 2 | evocation | HEAT | `ignite` | TO | TF | M |
| Call Lightning | 3 | conjuration | HEAT, AIR | `gasVolume`, `ignite` | TO | TF | M |
| Fireball | 3 | evocation | HEAT, FORCE | `ignite`, `heatFlux`, `volumeDamage` | BF | TF | H |
| Glyph of Warding | 3 | abjuration | HEAT, COLD, FORCE | `ignite`, `heatFlux`, `impulse`, `volumeDamage`, `castStored` | BF | TF | M |
| Lightning Bolt | 3 | evocation | HEAT | `ignite` | TO | TF | H |
| Sleet Storm | 3 | conjuration | COLD, WATER, EARTH, HEAT | `fluidSource`, `conjureMatter`, `heatFlux`, `surfaceState`, `extinguish` | FD | SRC | M |
| Wall of Fire | 4 | evocation | HEAT, LIGHT | `heatFlux`, `ignite`, `lightEmit` | TO | TF | M |
| Flame Strike | 5 | evocation | HEAT | `ignite`, `heatFlux` | TO | TF | M |
| Chain Lightning | 6 | evocation | HEAT, FORCE | `ignite`, `volumeDamage` | TO | TF | M |
| Delayed Blast Fireball | 7 | evocation | HEAT, FORCE | `ignite`, `heatFlux`, `volumeDamage` | BF | TF | H |
| Fire Storm | 7 | evocation | HEAT, FORCE | `ignite`, `heatFlux`, `volumeDamage` | BF | TF | H |
| Control Weather | 8 | transmutation | AIR, WATER, COLD, HEAT | `weatherOverride` | TO | — | M |
| Incendiary Cloud | 8 | conjuration | HEAT, AIR | `gasVolume`, `ignite`, `heatFlux` | TO | TF | M |
| Meteor Swarm | 9 | evocation | HEAT, FORCE | `ignite`, `heatFlux`, `volumeDamage` | BF | TF | H |
| Storm of Vengeance | 9 | conjuration | AIR, WATER, COLD, HEAT, FORCE, EARTH | `weatherOverride`, `gasVolume`, `fluidSource`, `ignite`, `volumeDamage`, `windField`, `surfaceState`, `heatFlux` | FD | SRC | M |

### 2.2 COLD
10 records.

| Spell (`name`) | Lvl | School | `systems` | `primitives` | Cross-layer | Ledger | Conf. |
|---|---|---|---|---|---|---|---|
| Prestidigitation | 0 | transmutation | HEAT, COLD | `ignite`, `extinguish`, `heatFlux` | TO | TF | H |
| Glyph of Warding | 3 | abjuration | HEAT, COLD, FORCE | `ignite`, `heatFlux`, `impulse`, `volumeDamage`, `castStored` | BF | TF | M |
| Sleet Storm | 3 | conjuration | COLD, WATER, EARTH, HEAT | `fluidSource`, `conjureMatter`, `heatFlux`, `surfaceState`, `extinguish` | FD | SRC | M |
| Ice Storm | 4 | evocation | COLD, FORCE, WATER, EARTH | `conjureMatter`, `volumeDamage`, `heatFlux`, `surfaceState` | BF | SRC | M |
| Cone of Cold | 5 | evocation | COLD, WATER | `heatFlux`, `freezeFluid` | TO | TF | M |
| Freezing Sphere | 6 | evocation | COLD, WATER | `heatFlux`, `freezeFluid` | TO | TF | H |
| Wall of Ice | 6 | evocation | COLD, WATER | `conjureMatter`, `heatFlux` | FD | SRC | M |
| Simulacrum | 7 | illusion | COLD, WATER | `animate`, `freezeFluid` | — | TF | M |
| Control Weather | 8 | transmutation | AIR, WATER, COLD, HEAT | `weatherOverride` | TO | — | M |
| Storm of Vengeance | 9 | conjuration | AIR, WATER, COLD, HEAT, FORCE, EARTH | `weatherOverride`, `gasVolume`, `fluidSource`, `ignite`, `volumeDamage`, `windField`, `surfaceState`, `heatFlux` | FD | SRC | M |

### 2.3 FORCE
27 records.

| Spell (`name`) | Lvl | School | `systems` | `primitives` | Cross-layer | Ledger | Conf. |
|---|---|---|---|---|---|---|---|
| Floating Disk | 1 | conjuration | FORCE | `forceBarrier` | TO | — | H |
| Thunderwave | 1 | evocation | FORCE | `impulse`, `volumeDamage` | BF | TF | M |
| Gust of Wind | 2 | evocation | AIR, FORCE | `windField`, `impulse` | TO | — | H |
| Levitate | 2 | transmutation | FORCE | `impulse` | TO | — | M |
| Shatter | 2 | evocation | FORCE | `volumeDamage`, `impulse` | BF | TF | H |
| Fireball | 3 | evocation | HEAT, FORCE | `ignite`, `heatFlux`, `volumeDamage` | BF | TF | H |
| Glyph of Warding | 3 | abjuration | HEAT, COLD, FORCE | `ignite`, `heatFlux`, `impulse`, `volumeDamage`, `castStored` | BF | TF | M |
| Tiny Hut | 3 | evocation | FORCE, AIR, LIGHT | `forceBarrier`, `weatherOverride`, `lightEmit`, `darken` | TO | — | M |
| Wind Wall | 3 | evocation | AIR, FORCE | `windField`, `impulse` | TO | — | H |
| Control Water | 4 | transmutation | WATER, FORCE | `fluidMove`, `fluidSource`, `impulse`, `volumeDamage` | FD | SRC | L |
| Ice Storm | 4 | evocation | COLD, FORCE, WATER, EARTH | `conjureMatter`, `volumeDamage`, `heatFlux`, `surfaceState` | BF | SRC | M |
| Resilient Sphere | 4 | evocation | FORCE | `forceBarrier`, `impulse` | TO | — | H |
| Arcane Hand | 5 | evocation | FORCE | `forceBarrier`, `impulse`, `volumeDamage` | TO | TF | M |
| Telekinesis | 5 | transmutation | FORCE | `impulse` | FD | — | H |
| Wall of Force | 5 | evocation | FORCE | `forceBarrier` | TO | — | H |
| Blade Barrier | 6 | evocation | FORCE, EARTH | `forceBarrier`, `surfaceState` | TO | — | M |
| Chain Lightning | 6 | evocation | HEAT, FORCE | `ignite`, `volumeDamage` | TO | TF | M |
| Disintegrate | 6 | transmutation | FORCE, EARTH | `volumeDamage`, `terrainEdit`, `magicEnd` | BF | TF | M |
| Delayed Blast Fireball | 7 | evocation | HEAT, FORCE | `ignite`, `heatFlux`, `volumeDamage` | BF | TF | H |
| Fire Storm | 7 | evocation | HEAT, FORCE | `ignite`, `heatFlux`, `volumeDamage` | BF | TF | H |
| Forcecage | 7 | evocation | FORCE | `forceBarrier`, `impulse` | TO | — | H |
| Reverse Gravity | 7 | transmutation | FORCE | `impulse` | FD | — | M |
| Earthquake | 8 | evocation | EARTH, FORCE | `terrainEdit`, `volumeDamage`, `surfaceState` | BF | TF | M |
| Imprisonment | 9 | abjuration | FORCE, LIFE | `forceBarrier`, `extraplanarHold`, `bodyTransform` | TO | TF | L |
| Meteor Swarm | 9 | evocation | HEAT, FORCE | `ignite`, `heatFlux`, `volumeDamage` | BF | TF | H |
| Prismatic Wall | 9 | abjuration | LIGHT, FORCE | `lightEmit`, `forceBarrier` | TO | — | M |
| Storm of Vengeance | 9 | conjuration | AIR, WATER, COLD, HEAT, FORCE, EARTH | `weatherOverride`, `gasVolume`, `fluidSource`, `ignite`, `volumeDamage`, `windField`, `surfaceState`, `heatFlux` | FD | SRC | M |

### 2.4 WATER
11 records.

| Spell (`name`) | Lvl | School | `systems` | `primitives` | Cross-layer | Ledger | Conf. |
|---|---|---|---|---|---|---|---|
| Create or Destroy Water | 1 | transmutation | WATER, AIR, HEAT | `fluidSource`, `fluidSink`, `gasDisperse`, `extinguish` | FD | SRC | H |
| Create Food and Water | 3 | conjuration | LIFE, WATER | `conjureMatter`, `fluidSource` | FD | SRC | H |
| Sleet Storm | 3 | conjuration | COLD, WATER, EARTH, HEAT | `fluidSource`, `conjureMatter`, `heatFlux`, `surfaceState`, `extinguish` | FD | SRC | M |
| Control Water | 4 | transmutation | WATER, FORCE | `fluidMove`, `fluidSource`, `impulse`, `volumeDamage` | FD | SRC | L |
| Ice Storm | 4 | evocation | COLD, FORCE, WATER, EARTH | `conjureMatter`, `volumeDamage`, `heatFlux`, `surfaceState` | BF | SRC | M |
| Cone of Cold | 5 | evocation | COLD, WATER | `heatFlux`, `freezeFluid` | TO | TF | M |
| Freezing Sphere | 6 | evocation | COLD, WATER | `heatFlux`, `freezeFluid` | TO | TF | H |
| Wall of Ice | 6 | evocation | COLD, WATER | `conjureMatter`, `heatFlux` | FD | SRC | M |
| Simulacrum | 7 | illusion | COLD, WATER | `animate`, `freezeFluid` | — | TF | M |
| Control Weather | 8 | transmutation | AIR, WATER, COLD, HEAT | `weatherOverride` | TO | — | M |
| Storm of Vengeance | 9 | conjuration | AIR, WATER, COLD, HEAT, FORCE, EARTH | `weatherOverride`, `gasVolume`, `fluidSource`, `ignite`, `volumeDamage`, `windField`, `surfaceState`, `heatFlux` | FD | SRC | M |

### 2.5 EARTH
25 records.

| Spell (`name`) | Lvl | School | `systems` | `primitives` | Cross-layer | Ledger | Conf. |
|---|---|---|---|---|---|---|---|
| Entangle | 1 | conjuration | LIFE, EARTH | `conjureMatter`, `surfaceState` | TO | SRC | M |
| Grease | 1 | conjuration | EARTH, LIFE | `conjureMatter`, `surfaceState` | TO | SRC | M |
| Spike Growth | 2 | transmutation | EARTH | `surfaceState` | TO | — | M |
| Web | 2 | conjuration | EARTH, LIFE | `conjureMatter`, `surfaceState` | TO | SRC | H |
| Plant Growth | 3 | transmutation | LIFE, EARTH | `growth`, `surfaceState` | TO | SRC | M |
| Sleet Storm | 3 | conjuration | COLD, WATER, EARTH, HEAT | `fluidSource`, `conjureMatter`, `heatFlux`, `surfaceState`, `extinguish` | FD | SRC | M |
| Speak with Plants | 3 | transmutation | EARTH | `surfaceState` | TO | — | M |
| Black Tentacles | 4 | conjuration | EARTH | `surfaceState` | TO | — | M |
| Fabricate | 4 | transmutation | EARTH, LIFE | `objectTransform` | TO | TF | H |
| Ice Storm | 4 | evocation | COLD, FORCE, WATER, EARTH | `conjureMatter`, `volumeDamage`, `heatFlux`, `surfaceState` | BF | SRC | M |
| Stone Shape | 4 | transmutation | EARTH | `terrainEdit` | BF | TF | H |
| Creation | 5 | illusion | EARTH, LIFE | `conjureMatter` | FD | SRC | M |
| Insect Plague | 5 | conjuration | EARTH | `surfaceState` | TO | — | M |
| Passwall | 5 | transmutation | EARTH | `terrainEdit` | BF | TF | H |
| Wall of Stone | 5 | evocation | EARTH | `conjureMatter` | FD | SRC | H |
| Blade Barrier | 6 | evocation | FORCE, EARTH | `forceBarrier`, `surfaceState` | TO | — | M |
| Disintegrate | 6 | transmutation | FORCE, EARTH | `volumeDamage`, `terrainEdit`, `magicEnd` | BF | TF | M |
| Flesh to Stone | 6 | transmutation | LIFE, EARTH | `bodyTransform` | TO | TF | M |
| Guards and Wards | 6 | abjuration | AIR, LIFE, EARTH, LIGHT | `gasVolume`, `windField`, `conjureMatter`, `surfaceState`, `lightEmit` | TO | SRC | M |
| Move Earth | 6 | transmutation | EARTH | `terrainEdit` | BF | TF | H |
| Wall of Thorns | 6 | conjuration | LIFE, EARTH | `conjureMatter`, `surfaceState` | TO | SRC | M |
| Mirage Arcane | 7 | illusion | EARTH | `surfaceState` | TO | — | M |
| Earthquake | 8 | evocation | EARTH, FORCE | `terrainEdit`, `volumeDamage`, `surfaceState` | BF | TF | M |
| Storm of Vengeance | 9 | conjuration | AIR, WATER, COLD, HEAT, FORCE, EARTH | `weatherOverride`, `gasVolume`, `fluidSource`, `ignite`, `volumeDamage`, `windField`, `surfaceState`, `heatFlux` | FD | SRC | M |
| Wish | 9 | conjuration | EARTH, LIFE | `conjureMatter`, `castStored` | TO | SRC | L |

### 2.6 LIGHT
26 records.

| Spell (`name`) | Lvl | School | `systems` | `primitives` | Cross-layer | Ledger | Conf. |
|---|---|---|---|---|---|---|---|
| Dancing Lights | 0 | evocation | LIGHT | `lightEmit` | TO | — | H |
| Light | 0 | evocation | LIGHT | `lightEmit` | TO | — | H |
| Produce Flame | 0 | conjuration | LIGHT | `lightEmit` | TO | — | M |
| Thaumaturgy | 0 | transmutation | LIGHT | `lightEmit` | TO | — | M |
| Color Spray | 1 | illusion | LIGHT | `lightEmit` | TO | — | M |
| Faerie Fire | 1 | evocation | LIGHT | `lightEmit` | TO | — | H |
| Guiding Bolt | 1 | evocation | LIGHT | `lightEmit` | TO | — | M |
| Branding Smite | 2 | evocation | LIGHT | `lightEmit` | TO | — | H |
| Continual Flame | 2 | evocation | LIGHT | `lightEmit` | TO | — | H |
| Darkness | 2 | evocation | LIGHT | `darken` | TO | — | H |
| Flame Blade | 2 | evocation | HEAT, LIGHT | `ignite`, `lightEmit` | TO | TF | M |
| Flaming Sphere | 2 | conjuration | HEAT, LIGHT | `ignite`, `heatFlux`, `lightEmit` | TO | TF | H |
| Moonbeam | 2 | evocation | LIGHT | `lightEmit` | TO | — | H |
| Daylight | 3 | evocation | LIGHT | `lightEmit` | TO | — | H |
| Tiny Hut | 3 | evocation | FORCE, AIR, LIGHT | `forceBarrier`, `weatherOverride`, `lightEmit`, `darken` | TO | — | M |
| Fire Shield | 4 | evocation | LIGHT | `lightEmit` | TO | — | M |
| Private Sanctum | 4 | abjuration | LIGHT | `darken` | TO | — | M |
| Wall of Fire | 4 | evocation | HEAT, LIGHT | `heatFlux`, `ignite`, `lightEmit` | TO | TF | M |
| Hallow | 5 | evocation | LIGHT | `lightEmit`, `darken` | TO | — | M |
| Guards and Wards | 6 | abjuration | AIR, LIFE, EARTH, LIGHT | `gasVolume`, `windField`, `conjureMatter`, `surfaceState`, `lightEmit` | TO | SRC | M |
| Sunbeam | 6 | evocation | LIGHT | `lightEmit` | TO | — | H |
| Prismatic Spray | 7 | evocation | LIGHT, LIFE | `lightEmit`, `bodyTransform` | TO | TF | M |
| Symbol | 7 | abjuration | LIGHT | `lightEmit` | TO | — | H |
| Holy Aura | 8 | abjuration | LIGHT | `lightEmit` | TO | — | H |
| Sunburst | 8 | evocation | LIGHT | `lightEmit`, `magicEnd` | TO | — | H |
| Prismatic Wall | 9 | abjuration | LIGHT, FORCE | `lightEmit`, `forceBarrier` | TO | — | M |

### 2.7 LIFE
35 records.

| Spell (`name`) | Lvl | School | `systems` | `primitives` | Cross-layer | Ledger | Conf. |
|---|---|---|---|---|---|---|---|
| Druidcraft | 0 | transmutation | HEAT, LIFE | `ignite`, `extinguish`, `growth` | TO | TF | H |
| Entangle | 1 | conjuration | LIFE, EARTH | `conjureMatter`, `surfaceState` | TO | SRC | M |
| Goodberry | 1 | transmutation | LIFE | `conjureMatter` | — | SRC | H |
| Grease | 1 | conjuration | EARTH, LIFE | `conjureMatter`, `surfaceState` | TO | SRC | M |
| Enlarge/Reduce | 2 | transmutation | LIFE | `bodyTransform` | TO | SRC | M |
| Gentle Repose | 2 | necromancy | LIFE | `decay` | — | — | H |
| Web | 2 | conjuration | EARTH, LIFE | `conjureMatter`, `surfaceState` | TO | SRC | H |
| Animate Dead | 3 | necromancy | LIFE | `animate` | TO | TF | H |
| Create Food and Water | 3 | conjuration | LIFE, WATER | `conjureMatter`, `fluidSource` | FD | SRC | H |
| Plant Growth | 3 | transmutation | LIFE, EARTH | `growth`, `surfaceState` | TO | SRC | M |
| Revivify | 3 | necromancy | LIFE | `bodyTransform` | — | TF | H |
| Blight | 4 | necromancy | LIFE | `decay` | TO | TF | H |
| Fabricate | 4 | transmutation | EARTH, LIFE | `objectTransform` | TO | TF | H |
| Giant Insect | 4 | transmutation | LIFE | `bodyTransform` | TO | TF | M |
| Polymorph | 4 | transmutation | LIFE | `bodyTransform` | TO | TF | M |
| Awaken | 5 | transmutation | LIFE | `animate` | — | TF | M |
| Creation | 5 | illusion | EARTH, LIFE | `conjureMatter` | FD | SRC | M |
| Raise Dead | 5 | necromancy | LIFE | `bodyTransform` | — | TF | H |
| Reincarnate | 5 | transmutation | LIFE | `bodyTransform` | — | SRC | M |
| Create Undead | 6 | necromancy | LIFE | `animate` | TO | TF | H |
| Flesh to Stone | 6 | transmutation | LIFE, EARTH | `bodyTransform` | TO | TF | M |
| Guards and Wards | 6 | abjuration | AIR, LIFE, EARTH, LIGHT | `gasVolume`, `windField`, `conjureMatter`, `surfaceState`, `lightEmit` | TO | SRC | M |
| Heroes’ Feast | 6 | conjuration | LIFE | `conjureMatter` | TO | SRC | M |
| Wall of Thorns | 6 | conjuration | LIFE, EARTH | `conjureMatter`, `surfaceState` | TO | SRC | M |
| Finger of Death | 7 | necromancy | LIFE | `animate` | TO | TF | H |
| Prismatic Spray | 7 | evocation | LIGHT, LIFE | `lightEmit`, `bodyTransform` | TO | TF | M |
| Regenerate | 7 | transmutation | LIFE | `bodyTransform` | — | SRC | M |
| Resurrection | 7 | necromancy | LIFE | `bodyTransform` | — | SRC | M |
| Animal Shapes | 8 | transmutation | LIFE | `bodyTransform` | TO | TF | M |
| Clone | 8 | necromancy | LIFE | `bodyTransform` | — | SRC | M |
| Imprisonment | 9 | abjuration | FORCE, LIFE | `forceBarrier`, `extraplanarHold`, `bodyTransform` | TO | TF | L |
| Shapechange | 9 | transmutation | LIFE | `bodyTransform` | — | TF | M |
| True Polymorph | 9 | transmutation | LIFE | `bodyTransform` | TO | TF | L |
| True Resurrection | 9 | necromancy | LIFE | `bodyTransform` | TO | SRC | M |
| Wish | 9 | conjuration | EARTH, LIFE | `conjureMatter`, `castStored` | TO | SRC | L |

### 2.8 AIR
12 records.

| Spell (`name`) | Lvl | School | `systems` | `primitives` | Cross-layer | Ledger | Conf. |
|---|---|---|---|---|---|---|---|
| Create or Destroy Water | 1 | transmutation | WATER, AIR, HEAT | `fluidSource`, `fluidSink`, `gasDisperse`, `extinguish` | FD | SRC | H |
| Fog Cloud | 1 | conjuration | AIR | `gasVolume` | TO | — | H |
| Gust of Wind | 2 | evocation | AIR, FORCE | `windField`, `impulse` | TO | — | H |
| Call Lightning | 3 | conjuration | HEAT, AIR | `gasVolume`, `ignite` | TO | TF | M |
| Stinking Cloud | 3 | conjuration | AIR | `gasVolume` | TO | — | H |
| Tiny Hut | 3 | evocation | FORCE, AIR, LIGHT | `forceBarrier`, `weatherOverride`, `lightEmit`, `darken` | TO | — | M |
| Wind Wall | 3 | evocation | AIR, FORCE | `windField`, `impulse` | TO | — | H |
| Cloudkill | 5 | conjuration | AIR | `gasVolume` | FD | — | H |
| Guards and Wards | 6 | abjuration | AIR, LIFE, EARTH, LIGHT | `gasVolume`, `windField`, `conjureMatter`, `surfaceState`, `lightEmit` | TO | SRC | M |
| Control Weather | 8 | transmutation | AIR, WATER, COLD, HEAT | `weatherOverride` | TO | — | M |
| Incendiary Cloud | 8 | conjuration | HEAT, AIR | `gasVolume`, `ignite`, `heatFlux` | TO | TF | M |
| Storm of Vengeance | 9 | conjuration | AIR, WATER, COLD, HEAT, FORCE, EARTH | `weatherOverride`, `gasVolume`, `fluidSource`, `ignite`, `volumeDamage`, `windField`, `surfaceState`, `heatFlux` | FD | SRC | M |

### 2.9 NONE (grouped by the reason in `notes`)
208 records. Each record's `notes` starts with "NONE reason:". The grouping below is by the first matching keyword of that reason. Where a NONE record lists an entity or meta primitive, it is shown in brackets.

| Reason group | Count | Spells |
|---|---|---|
| Healing and hit points | 8 | Cure Wounds, False Life, Heal, Healing Word, Mass Cure Wounds, Mass Heal, Mass Healing Word, Prayer of Healing |
| Creature-targeted damage with no world effect (rules R2, R5, R8) | 19 | Acid Arrow, Acid Splash, Arcane Sword, Chill Touch, Circle of Death, Eldritch Blast, Harm, Hellish Rebuke, Hunter’s Mark, Inflict Wounds, Magic Missile, Poison Spray, Power Word Kill, Ray of Frost, Sacred Flame, Shocking Grasp, Spiritual Weapon, Vampiric Touch, Vicious Mockery |
| Creature mind (charm, compulsion, fear, confusion) | 21 | Animal Friendship, Animal Messenger, Antipathy/Sympathy, Calm Emotions, Charm Person, Command, Compulsion, Confusion, Dominate Beast, Dominate Monster, Dominate Person, Enthrall, Feeblemind, Geas, Mass Suggestion, Modify Memory, Phantasmal Killer, Planar Binding, Suggestion, Weird, Zone of Truth |
| Summoned or magical entities | 13 | Animate Objects [animate], Conjure Animals, Conjure Celestial, Conjure Elemental, Conjure Fey, Conjure Minor Elementals, Conjure Woodland Beings, Faithful Hound, Find Familiar, Find Steed, Guardian of Faith, Phantom Steed, Unseen Servant |
| Object state (locks, handling, repair, food quality) | 5 | Arcane Lock, Knock, Mage Hand, Mending [objectTransform], Purify Food and Drink |
| Creature movement and abilities | 12 | Etherealness, Expeditious Retreat, Feather Fall, Fly, Freedom of Movement, Gaseous Form, Jump, Meld into Stone, Spider Climb, Water Breathing, Water Walk, Wind Walk |
| Invisibility, stealth and concealment | 5 | Greater Invisibility, Invisibility, Mislead, Pass without Trace, Sequester |
| Creature conditions, stats, rolls and protections | 48 | Aid, Alter Self, Bane, Barkskin, Beacon of Hope, Bestow Curse, Bless, Blindness/Deafness, Contagion, Death Ward, Divine Favor, Divine Word, Enhance Ability, Eyebite, Fear, Foresight, Glibness, Greater Restoration, Guidance, Haste, Heroism, Hideous Laughter, Hold Monster, Hold Person, Irresistible Dance, Lesser Restoration, Longstrider, Mage Armor, Magic Weapon, Mind Blank, Power Word Stun, Protection from Energy, Protection from Evil and Good, Protection from Poison, Ray of Enfeeblement, Remove Curse, Resistance, Sanctuary, Shield, Shield of Faith, Shillelagh, Sleep, Slow, Spare the Dying, Spirit Guardians, Stoneskin, True Strike, Warding Bond |
| Senses, divination and read-only queries | 25 | Arcane Eye, Arcanist’s Magic Aura, Augury, Clairvoyance, Commune, Commune with Nature, Comprehend Languages, Contact Other Plane, Darkvision, Detect Evil and Good, Detect Magic, Detect Poison and Disease, Detect Thoughts, Divination, Find the Path, Find Traps, Identify, Legend Lore, Locate Animals or Plants, Locate Creature, Locate Object, Nondetection, Scrying, See Invisibility, True Seeing |
| Illusion | 14 | Blur, Disguise Self, Dream, Hallucinatory Terrain, Hypnotic Pattern, Illusory Script, Magic Mouth, Major Image, Minor Illusion, Mirror Image, Programmed Illusion, Project Image, Seeming, Silent Image |
| Transport, teleport and planar travel | 21 | Astral Projection, Banishment, Blink, Demiplane [extraplanarHold], Dimension Door, Dispel Evil and Good, Gate, Instant Summons, Magic Jar, Magnificent Mansion [extraplanarHold], Maze, Misty Step, Planar Ally, Plane Shift, Rope Trick [extraplanarHold], Secret Chest [extraplanarHold], Teleport, Teleportation Circle, Transport via Plants, Tree Stride, Word of Recall |
| Communication | 6 | Message, Sending, Speak with Animals, Speak with Dead, Telepathic Bond, Tongues |
| Meta-magic, wards and sound | 11 | Alarm, Antilife Shell, Antimagic Field [magicSuppress], Contingency [castStored], Counterspell, Dispel Magic [magicEnd], Forbiddance, Globe of Invulnerability [magicSuppress], Magic Circle, Silence, Time Stop |

---

## 3. Spell-effect schema proposal

This is a proposal for SIM.60.02. It is shown here and not committed as a schema file (brief deliverable 2).

### 3.1 Design rules

- **R1 SRD invariance.** SRD damage, range, saves, area, duration and casting are never copied into effect data and never changed. Effects point into a structured SRD baseline: the `srd` block of each audit record, which SIM.60.02 would promote to a data file. SIM.60.04 checks that creature damage, saves and ranges equal the SRD.
- **R2 Fire.** Fire damage ignites unattended flammable objects and flammable cell materials that are in the spell's area or are its direct target. Worn or carried items are excluded (the SRD convention in Burning Hands, Fireball and Fire Bolt). A spell that targets only a creature ignites nothing (Hellish Rebuke, Produce Flame's hurl).
- **R3 Lightning.** Lightning ignites like fire (the SRD Lightning Bolt clause). Conduction is not added (Owner question Q3).
- **R4 Blast.** `volumeDamage` applies where the SRD damages objects or structures in an area (Delayed Blast Fireball, Fire Storm, Meteor Swarm, Shatter, Earthquake), or where it describes an explosion, burst, eruption or wave of fire, thunder or force (Fireball, Thunderwave, Glyph of Warding). Damage propagates downward through floors with material attenuation (DEC-013 §4, DEC-022 §4). Single-object hits (Arcane Hand, Chain Lightning) damage the object only.
- **R5 Cold.** Cold damage over an area draws heat (`heatFlux` with sign −1) and freezes exposed shallow water (`freezeFluid`). SRD freeze clauses override the defaults (Freezing Sphere). Creature-targeted cold (Ray of Frost) freezes nothing.
- **R6 Light.** SRD-stated light gives `lightEmit` and magical darkness gives `darken`. Light that "creates no heat" (Continual Flame) has heat off. Sunlight is flagged only where the SRD says "sunlight" (Sunbeam, Sunburst).
- **R7 Conjured matter.** Matter the SRD says is created gives `conjureMatter` or `fluidSource` with a ledger source. If the SRD says it vanishes, wilts, disappears or ends with the spell, it is paired with a sink at the end. Permanence clauses are kept (Wall of Stone becomes permanent after full concentration).
- **R8 Creature-only.** Effects on creature stats, conditions, minds and senses are `NONE`, even when they deal energy damage.
- **R9 Load.** Mass changes of bodies and objects (Enlarge/Reduce, petrification, polymorph forms) act as floor load in the support model (SIM.40.01).
- **R10 Magical versus mundane.** Every effect is tagged `magical` (suppressed by Antimagic Field, ended by Dispel Magic) or mundane (a fire already lit, water already created, ice formed by cold). See §3.4.
- **R11 No per-spell code.** A spell is data: a list of primitive instances with parameters. The runtime knows primitives, not spells. The schema has `additionalProperties: false` at the effect level, so a per-spell script hook is rejected (negative case in the REPORT).

### 3.2 Primitive catalogue

The column Params from SRD names the SRD fields a parameter points to. "Ledger" is the entry each instance writes. "Used by" counts audit records.

| Primitive | Systems | What it does in the world | Params from SRD | DEUS params (examples) | Ledger | Used by |
|---|---|---|---|---|---|---|
| `ignite` | HEAT | Sets flammable objects or cells burning (hands over to the fire simulation) | area, target | targets (in footprint, direct target, contact, named source), excludeWornCarried, exclude plants | none (the burn is SIM.50.05's transform) | 20 |
| `extinguish` | HEAT | Puts out named sources or exposed flames | area | sources, protectedChance (Gust of Wind 50 percent) | none | 4 |
| `heatFlux` | HEAT, COLD | Adds (+1) or removes (−1) heat in cells, objects and fluids over a lifetime: dries fuel, melts snow and ice, heats metal, chills | area, damage (energy), duration | sign, falloff, side (Wall of Fire's damaging side) | none | 18 |
| `freezeFluid` | COLD, WATER | Phase change: liquid water to ice (freeze) or back (thaw) | area, damage (energy) | mode, maxDepthFt, depthFrom, thawAfterSeconds (Freezing Sphere 60), trapsSwimmers | transform water ↔ ice | 3 |
| `volumeDamage` | FORCE | Damages strata, structures and objects in a volume by damage type, attenuated by material, propagating to lower layers; destroyed matter becomes rubble or debris | area, damage (energy, type) | applyTo, falloff, attenuation table, propagateDown, respectImmunityZones (Silence) | transform to rubble | 14 |
| `impulse` | FORCE | Pushes, lifts or throws loose objects and creatures: radial, along a line, upward, inverted gravity | area, save | direction, distanceFt, massLimitLb (Levitate 500, Telekinesis 1,000), unsecuredOnly | none | 12 |
| `forceBarrier` | FORCE | Massless magical barrier cells that block creatures, objects, fluids, gas, fire, projectiles or spells as configured | area | blocks{}, orientation (Wall of Force horizontal), immuneToDamage, destroyedBy, bearsLoad (null, Q4) | none | 9 |
| `conjureMatter` | EARTH, COLD, WATER, LIFE | Creates solid matter (stone, ice, plants, food, web, grease, metal) that must meet a support rule and may fall | area, duration | material, thickness, support rule, spanRule, permanence, flammable | source (paired sink if temporary; provenance tag) | 14 |
| `terrainEdit` | EARTH | Mass-conserving strata edits: reshape, cut and fill, fissure, temporary passage, removal to dust | area, duration | mode, materials (Move Earth: dirt, sand, clay), maxChangeFt, rateSeconds, massBalance, supportNeutral (Passwall) | transform | 5 |
| `surfaceState` | EARTH | Ground-surface movement state: difficult, slick, spikes, restraining, illusory | area, duration, save | state, movementCostFactor | none | 16 |
| `fluidSource` | WATER | Adds water (container, ground or rain) | area, higher levels | volumeGallons, perSlotAboveGallons, placement, extinguishExposedFlames | source | 5 |
| `fluidSink` | WATER | Removes water | area, higher levels | volumeGallons, placement | sink | 1 |
| `fluidMove` | WATER | Moves existing water: raise level, part, redirect, whirlpool | area, duration | mode, riseFt | transform (moved volume) | 1 |
| `gasVolume` | AIR | Fog, poison gas, smoke or storm cloud volume that spreads around corners, obscures, drifts, sinks if heavy and disperses in wind | area, duration | kind, density, obscurement, driftFtPerRound, disperse thresholds (10 mph, 20 mph) | none (magical gas) | 7 |
| `gasDisperse` | AIR | Removes fog or gas in a footprint | area | kinds | none | 1 |
| `windField` | AIR | Directional wind: disperses gas, extinguishes or fans flames, pushes light objects, deflects arrows | area, duration | speed, direction, gasBarrier, extinguish rules | none | 4 |
| `weatherOverride` | AIR, WATER, COLD, HEAT | Shifts local weather stages (precipitation, temperature, wind) or gives shelter from weather | area, duration | stage deltas, shelter | none (rain is the weather system's named source) | 3 |
| `lightEmit` | LIGHT | Bright and dim light radius on a point, object or creature | area, duration | brightFt, dimFt, sunlight, heat, dispels darkness up to level N | none | 24 |
| `darken` | LIGHT | Magical darkness volume that blocks darkvision and nonmagical light | area, duration | dispels light up to level N | none | 4 |
| `growth` | LIFE | Plant overgrowth, enrichment or bloom | area, duration | mode, yieldMultiplier, movementCostFactor | source (instant biomass) | 2 |
| `decay` | LIFE | Withers plants, spoils food, or pauses decay (Gentle Repose, rate 0) | target | mode, rate | transform | 2 |
| `bodyTransform` | LIFE, EARTH | Changes a body's or object's matter: shape change, mass scale (×8, ×1/8), petrify (×10), restore or create a body | target, duration | mode, massFactor, revertOnEnd | transform or source (Q1(c)) | 16 |
| `animate` | LIFE or entity | Corpse, bones, plant, object or snow becomes a creature and keeps its matter | target | from, revertTo | transform | 6 |
| `objectTransform` | EARTH, LIFE or entity | Fabricate products from raw material, or repair an object | target, area | mode, maxSize | transform | 2 |
| `magicSuppress` | meta | Suppresses magical effects in a footprint (Antimagic Field; Globe of Invulnerability by level) | area | scope, levelMax, origin | none | 2 |
| `magicEnd` | meta | Ends spells on a target or in an area (Dispel Magic, Sunburst on darkness, Disintegrate on force) | target, area | targets | the ended spell's own sinks | 3 |
| `extraplanarHold` | meta | Moves objects or creatures into extradimensional storage and back (Demiplane, Rope Trick, Secret Chest, Magnificent Mansion) | duration | capacity, lossRule | transform (held form); sink on loss | 5 |
| `castStored` | meta | Runs another spell's effect list later (Glyph of Warding spell glyph, Contingency, Wish duplication) | — | spellRef, maxLevel | per stored spell | 3 |

### 3.3 Entity-level and meta primitives

- `animate` and `objectTransform` change what a thing is (an object becomes a construct, a corpse an undead, raw timber a bridge) without needing a physical system. They matter to the ledger (the matter keeps existing in a new form), so they are primitives. A `NONE` record may list them (Animate Objects, Mending) because no heat, force, fluid, cold, earth, light, life or air system is involved.
- The four meta primitives act on other spells or on the ledger. The runtime needs them so that the physical primitives can be suppressed (Antimagic Field makes "a gap in the wall" of a Wall of Fire, per the SRD), ended early (Dispel Magic ends a non-permanent Wall of Stone, which fires its paired sink), or stored.

### 3.4 Magical versus mundane, persistence and provenance

- **Magical effects** are live primitive instances owned by a spell instance: a Wall of Fire, a Fog Cloud, a non-permanent Wall of Stone, Web. They are suppressed by `magicSuppress`, ended by `magicEnd`, and end with the spell's lifetime or concentration.
- **Mundane consequences** are ordinary world state once created: a fire started by Fireball, water from Create Water, ice from Cone of Cold, rubble from a breached floor, a permanent Wall of Stone. They follow the normal simulations (fire, fluid, seasons, collapse) and cannot be dispelled. The SRD supports this split: Wall of Stone "becomes permanent and can't be dispelled", and a Continual Flame "can be covered or hidden but not smothered or quenched".
- **Provenance.** Temporary conjured matter (Creation's metal, Entangle's vines, a non-permanent Wall of Stone) carries its spell-instance id through every later transform (cut, smelted, carried away, flowed out of the area). When the spell ends, the paired sink removes exactly what is left of it, wherever it is. Without this, a player could keep Creation's gold by smelting it within the hour, which would break LIFE-002 (no ore or metal creation). How far the sink should reach is Owner question Q1(b).

### 3.5 Mapping SRD fields to parameters

**Area shape to cell footprint.** DEC-013 geometry: 5-ft cells, 10-ft layers, 2-ft strata (5 per layer). Areas are true 3D volumes (DEC-022 §2), clipped by solid cells unless the SRD says the effect spreads around corners.

| SRD shape | Footprint rule | Vertical extent |
|---|---|---|
| sphere (radius r) | cells whose centre lies within r of the origin (strata centres for volume damage) | ±r: a 20-foot sphere spans up to 4 layers; Meteor Swarm's 40-foot spheres span 8 |
| cube (side s) | s/5 × s/5 cells, s/10 layers (a 15-foot cube is 3 × 3 cells and 1.5 layers, i.e. 7-8 strata) | s |
| cone (length L) | 5e cone: width equals distance from the origin, rasterised on cells; may point down a shaft | follows direction |
| line (L × w) | cells along the ray, width w (Lightning Bolt 100 × 5, Gust of Wind 60 × 10, Sunbeam 60 × 5) | follows direction |
| cylinder (r, h) | circle of cells, h/10 layers (Flame Strike 40 feet = 4 layers; Reverse Gravity 100 feet = 10 layers) | h, clipped at the first solid ceiling where the SRD says the effect "roars down" |
| circle or ground area | ground surface only (Earthquake's 100-foot-radius circle) | surface stratum; fissures go down |
| wall or panels | cell run along the chosen path with a thickness attribute: a 6-inch Wall of Stone is thinner than one 5-foot cell; a horizontal panel (a bridge) is thinner than one 2-foot stratum | height/10 layers (vertical panels); one stratum (horizontal panels) |
| radius from the caster ("Self (10-foot radius)") | sphere centred on the caster | ±r |

`propagation: aroundCorners` (Fireball, Delayed Blast Fireball, Darkness, Fog Cloud, Cloudkill, Stinking Cloud, Incendiary Cloud, Meteor Swarm, Glyph of Warding) means a flood fill through open cells within the radius. `lineOfEffect` means straight lines from the origin, stopped by solids.

**Damage dice to energy.** The SRD roll for creatures is unchanged. The world uses the same roll (`use: rolledTotal`, one roll per cast from the deterministic seed, ADR-003 §10.1) times a per-damage-type coefficient (`coefficientRef`, for example `blast.fire`, `heat.cold`) from one tuning table. Coefficients are per type, never per spell. Saving throws halve creature damage only. Objects follow the SRD rules for objects, and strata take the full value. Higher-level scaling changes the dice, so it changes the energy automatically.

**Duration to lifetime.** Durations become SRD seconds:

| SRD duration | Seconds |
|---|---|
| Instantaneous | 0 |
| 1 round | 6 |
| 1 minute | 60 |
| 10 minutes | 600 |
| 1 hour | 3,600 |
| 8 hours | 28,800 |
| 24 hours or 1 day | 86,400 |
| 7, 10 or 30 days | 604,800, 864,000 or 2,592,000 |
| Until dispelled | none (no expiry) |
| Special | per spell |

Concentration is a flag. The runtime converts seconds to ticks with `ticks = ceil(seconds / secondsPerTick[timeDomain])`. `secondsPerTick` is **not set here** because the sources disagree (§7, escalation, Owner question Q2): under ADR-003 Rev 2 §3.2 (36 game-seconds per tick) a 1-minute spell is 1.67 ticks, about 1/6 of a real second at 1x. Effects triggered "at the start of each of your turns" use `perRound` (6 SRD seconds), not `perTick`.

**Range.** True 3D Euclidean distance with 5-ft cells and 10-ft layers (DEC-022 §2). Line of sight through openings (DEC-022 §1, GP.07.02).

### 3.6 JSON Schema draft (2020-12)

Validated with ajv 8 (`Ajv2020`, strict mode except the `strictRequired` lint) in a temporary folder. The five examples in §3.7 are valid. The nine broken variants listed in the REPORT are rejected.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://deus.invalid/schemas/spells/spell_effect.draft.json",
  "title": "DEUS spell-effect definition (SIM.60.01 proposal for SIM.60.02; draft, not committed as a schema file)",
  "description": "One record per SRD spell. SRD numbers are never copied here: they are referenced by pointer into the structured SRD baseline (the srd block of docs/audits/srd_spell_effect_audit.json, promoted by SIM.60.02). DEUS adds only physical consequences, built from reusable primitives. No per-spell code.",
  "type": "object",
  "required": ["spellId","systems","effects"],
  "additionalProperties": false,
  "properties": {
    "spellId": {"type":"string","pattern":"^srd:spell:[a-z0-9-]+$"},
    "systems": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {"enum":["HEAT","FORCE","WATER","COLD","EARTH","LIGHT","LIFE","AIR","NONE"]}
    },
    "variants": {
      "description": "Caster-chosen modes named by the SRD (for example create or destroy water). Effects select a variant with 'variant'.",
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id","srdQuote"],
        "additionalProperties": false,
        "properties": {"id":{"$ref":"#/$defs/ident"},"srdQuote":{"type":"string","minLength":1}}
      }
    },
    "effects": {"type":"array","items":{"$ref":"#/$defs/effect"}}
  },
  "$defs": {
    "ident": {"type":"string","pattern":"^[a-z][a-zA-Z0-9]*$"},
    "srdPointer": {
      "description": "Pointer into the spell's structured SRD baseline, e.g. /area/0, /damage/1, /duration, /range.",
      "type": "string",
      "pattern": "^/(area|damage|save|attack|duration|range|higherLevels|castingTime)(/[0-9]+)?$"
    },
    "primitive": {
      "enum": [
        "ignite",
        "extinguish",
        "heatFlux",
        "freezeFluid",
        "volumeDamage",
        "impulse",
        "forceBarrier",
        "conjureMatter",
        "terrainEdit",
        "surfaceState",
        "fluidSource",
        "fluidSink",
        "fluidMove",
        "gasVolume",
        "gasDisperse",
        "windField",
        "weatherOverride",
        "lightEmit",
        "darken",
        "growth",
        "decay",
        "bodyTransform",
        "animate",
        "objectTransform",
        "magicSuppress",
        "magicEnd",
        "extraplanarHold",
        "castStored"
      ]
    },
    "footprint": {
      "description": "Where the effect applies. 5-ft cells, 10-ft layers, 2-ft strata (DEC-013). A pointer reuses the SRD area; explicit numbers must quote the SRD sentence that states them.",
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "srd": {"$ref":"#/$defs/srdPointer"},
        "shape": {
          "enum": [
            "sphere",
            "hemisphere",
            "cube",
            "cone",
            "line",
            "cylinder",
            "radius",
            "circle",
            "square",
            "wall",
            "ring-wall",
            "panels",
            "passage",
            "fissure",
            "floor-area",
            "object",
            "cell",
            "creature"
          ]
        },
        "radiusFt": {"type":"number","exclusiveMinimum":0},
        "sideFt": {"type":"number","exclusiveMinimum":0},
        "lengthFt": {"type":"number","exclusiveMinimum":0},
        "widthFt": {"type":"number","exclusiveMinimum":0},
        "heightFt": {"type":"number","exclusiveMinimum":0},
        "depthFt": {"type":"number","exclusiveMinimum":0},
        "srdQuote": {"type":"string","minLength":1},
        "origin": {"enum":["point","caster","target","surface","glyph","impactPoint","wallSide"]},
        "vertical": {"enum":["volume","groundSurface","column","down"]},
        "propagation": {"enum":["lineOfEffect","aroundCorners"]},
        "clip": {"enum":["solid","none"]}
      },
      "oneOf": [{"required":["srd"]},{"required":["shape","srdQuote"]}]
    },
    "lifetime": {
      "description": "SRD duration converted to seconds (1 round = 6 s). Ticks = ceil(seconds / secondsPerTick[domain]); secondsPerTick is Owner question Q2.",
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "srd": {"const":"/duration"},
        "seconds": {"type":"integer","minimum":0},
        "srdQuote": {"type":"string"},
        "timeDomain": {"enum":["action","historical"]},
        "endsWithSpell": {"type":"boolean"},
        "permanentIf": {"enum":["concentrationHeldFullDuration","never","always"]}
      },
      "anyOf": [{"required":["srd"]},{"required":["seconds","srdQuote"]}]
    },
    "energy": {
      "description": "Physical energy derived from SRD damage dice. The dice roll that the SRD applies to creatures is reused unchanged; the coefficient converts it to world energy per damage type and is a named tuning value, never per spell.",
      "type": "object",
      "required": ["srd","use","coefficientRef"],
      "additionalProperties": false,
      "properties": {
        "srd": {"$ref":"#/$defs/srdPointer"},
        "use": {"enum":["rolledTotal","average"]},
        "coefficientRef": {"type":"string","pattern":"^[a-z]+\\.[a-zA-Z]+$"}
      }
    },
    "ledger": {
      "description": "Conservation-ledger entry (ADR-003 Rev 2 §7.8, LIFE-001). source/sink are only allowed with a named cause (DEC-018 PM default, Owner question Q1).",
      "type": "object",
      "required": ["mode"],
      "additionalProperties": false,
      "properties": {
        "mode": {"enum":["none","source","sink","transform"]},
        "family": {"enum":["stone","soilSediment","organics","water","metal","mixed"]},
        "fromForm": {"type":"string"},
        "toForm": {"type":"string"},
        "cause": {"type":"string","pattern":"^spell:srd:spell:[a-z0-9-]+(#[a-zA-Z]+)?$"},
        "pairedSinkOnEnd": {"type":"boolean"},
        "provenanceTag": {
          "type": "boolean",
          "description": "Temporary conjured matter carries its spell instance id through every later transform, so the paired sink finds it (LIFE-002 guard for conjured metal)."
        }
      },
      "allOf": [
        {"if":{"properties":{"mode":{"enum":["source","sink"]}}},"then":{"required":["family","cause"]}},
        {"if":{"properties":{"mode":{"const":"transform"}}},"then":{"required":["fromForm","toForm"]}}
      ]
    },
    "effect": {
      "type": "object",
      "required": ["primitive","trigger","basis","magical","ledger"],
      "additionalProperties": false,
      "properties": {
        "primitive": {"$ref":"#/$defs/primitive"},
        "variant": {"$ref":"#/$defs/ident"},
        "trigger": {"enum":["onCast","onImpact","perRound","perTick","onEnter","onEnd","onTrigger","onDestroyed"]},
        "basis": {
          "enum": ["srd","added"],
          "description": "srd = the SRD text states this physical effect (quote it); added = DEUS physical consequence on top of SRD (DEC-018)."
        },
        "srdQuote": {"type":"string","minLength":1},
        "footprint": {"$ref":"#/$defs/footprint"},
        "lifetime": {"$ref":"#/$defs/lifetime"},
        "energy": {"$ref":"#/$defs/energy"},
        "magical": {
          "type": "boolean",
          "description": "true = suppressible by antimagic field and ended by dispel magic; false = mundane consequence that persists (fire already lit, water created)."
        },
        "ledger": {"$ref":"#/$defs/ledger"},
        "params": {"type":"object"}
      },
      "allOf": [
        {"if":{"properties":{"basis":{"const":"srd"}}},"then":{"required":["srdQuote"]}},
        {
          "if": {"properties":{"primitive":{"const":"ignite"}}},
          "then": {"properties":{"params":{"$ref":"#/$defs/p_ignite"}}}
        },
        {
          "if": {"properties":{"primitive":{"const":"heatFlux"}}},
          "then": {"required":["energy"],"properties":{"params":{"$ref":"#/$defs/p_heatFlux"}}}
        },
        {
          "if": {"properties":{"primitive":{"const":"freezeFluid"}}},
          "then": {"properties":{"params":{"$ref":"#/$defs/p_freezeFluid"}}}
        },
        {
          "if": {"properties":{"primitive":{"const":"volumeDamage"}}},
          "then": {"required":["energy","footprint"],"properties":{"params":{"$ref":"#/$defs/p_volumeDamage"}}}
        },
        {
          "if": {"properties":{"primitive":{"const":"impulse"}}},
          "then": {"properties":{"params":{"$ref":"#/$defs/p_impulse"}}}
        },
        {
          "if": {"properties":{"primitive":{"const":"forceBarrier"}}},
          "then": {"properties":{"params":{"$ref":"#/$defs/p_forceBarrier"}}}
        },
        {
          "if": {"properties":{"primitive":{"const":"conjureMatter"}}},
          "then": {
            "required": ["footprint","lifetime"],
            "properties": {"params":{"$ref":"#/$defs/p_conjureMatter"},"ledger":{"properties":{"mode":{"const":"source"}}}}
          }
        },
        {
          "if": {"properties":{"primitive":{"const":"terrainEdit"}}},
          "then": {
            "required": ["footprint"],
            "properties": {"params":{"$ref":"#/$defs/p_terrainEdit"},"ledger":{"properties":{"mode":{"const":"transform"}}}}
          }
        },
        {
          "if": {"properties":{"primitive":{"const":"surfaceState"}}},
          "then": {"properties":{"params":{"$ref":"#/$defs/p_surfaceState"}}}
        },
        {
          "if": {"properties":{"primitive":{"enum":["fluidSource","fluidSink"]}}},
          "then": {"properties":{"params":{"$ref":"#/$defs/p_fluidSourceSink"}}}
        },
        {
          "if": {"properties":{"primitive":{"const":"fluidSource"}}},
          "then": {"properties":{"ledger":{"properties":{"mode":{"const":"source"}}}}}
        },
        {
          "if": {"properties":{"primitive":{"const":"fluidSink"}}},
          "then": {"properties":{"ledger":{"properties":{"mode":{"const":"sink"}}}}}
        },
        {
          "if": {"properties":{"primitive":{"const":"gasVolume"}}},
          "then": {"properties":{"params":{"$ref":"#/$defs/p_gasVolume"}}}
        },
        {
          "if": {"properties":{"primitive":{"const":"gasDisperse"}}},
          "then": {"properties":{"params":{"$ref":"#/$defs/p_gasDisperse"}}}
        },
        {
          "if": {"properties":{"primitive":{"const":"lightEmit"}}},
          "then": {"properties":{"params":{"$ref":"#/$defs/p_lightEmit"}}}
        },
        {
          "if": {"properties":{"primitive":{"const":"extinguish"}}},
          "then": {"properties":{"params":{"$ref":"#/$defs/p_extinguish"}}}
        }
      ]
    },
    "p_ignite": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "targets": {"enum":["unattendedFlammablesInFootprint","directTarget","contact","namedSource"]},
        "excludeWornCarried": {"type":"boolean"},
        "exclude": {"type":"array","items":{"enum":["plants"]}}
      }
    },
    "p_heatFlux": {
      "type": "object",
      "required": ["sign"],
      "additionalProperties": false,
      "properties": {
        "sign": {"enum":[1,-1]},
        "falloff": {"enum":["none","linear","quadratic"]},
        "side": {"enum":["both","chosen"]},
        "melts": {"type":"boolean"},
        "driesFuel": {"type":"boolean"}
      }
    },
    "p_freezeFluid": {
      "type": "object",
      "required": ["mode"],
      "additionalProperties": false,
      "properties": {
        "mode": {"enum":["freeze","thaw"]},
        "fluid": {"const":"water"},
        "maxDepthFt": {"type":"number","exclusiveMinimum":0},
        "depthFrom": {"enum":["fixed","energy"]},
        "thawAfterSeconds": {"type":"integer","minimum":0},
        "trapsSwimmers": {"type":"boolean"}
      }
    },
    "p_volumeDamage": {
      "type": "object",
      "required": ["damageType","applyTo"],
      "additionalProperties": false,
      "properties": {
        "damageType": {"enum":["fire","thunder","force","bludgeoning","lightning","acid","cold"]},
        "applyTo": {"type":"array","minItems":1,"items":{"enum":["objects","strata","structures"]}},
        "falloff": {"enum":["constant","linear","quadratic"]},
        "attenuation": {"const":"materialTable"},
        "propagateDown": {"type":"boolean","description":"DEC-013 §4 / DEC-022 §4 cross-layer volume damage."},
        "respectImmunityZones": {"type":"boolean","description":"e.g. objects inside Silence are immune to thunder damage."}
      }
    },
    "p_impulse": {
      "type": "object",
      "required": ["direction"],
      "additionalProperties": false,
      "properties": {
        "direction": {"enum":["radialAway","alongLine","chosen","up","invertGravity"]},
        "distanceFt": {"type":"number","minimum":0},
        "massLimitLb": {"type":"number","minimum":0},
        "unsecuredOnly": {"type":"boolean"},
        "creaturesSaveRef": {"$ref":"#/$defs/srdPointer"}
      }
    },
    "p_forceBarrier": {
      "type": "object",
      "required": ["blocks"],
      "additionalProperties": false,
      "properties": {
        "blocks": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "creatures": {"type":"boolean"},
            "objects": {"type":"boolean"},
            "fluids": {"type":"boolean"},
            "gas": {"type":"boolean"},
            "fire": {"type":"boolean"},
            "spells": {"type":"boolean"},
            "ethereal": {"type":"boolean"},
            "projectiles": {"enum":["none","partial","all"]}
          }
        },
        "orientation": {"enum":["any","vertical","horizontal"]},
        "immuneToDamage": {"type":"boolean"},
        "destroyedBy": {"type":"array","items":{"type":"string"}},
        "bearsLoad": {"type":["boolean","null"],"description":"null = SRD-silent; Owner question Q4."}
      }
    },
    "p_conjureMatter": {
      "type": "object",
      "required": ["material","support","permanence"],
      "additionalProperties": false,
      "properties": {
        "material": {"enum":["stone","ice","plant","food","web","grease","wood","metal","crystal","gem"]},
        "thicknessIn": {"type":"number","exclusiveMinimum":0},
        "panels": {"type":"integer","minimum":1},
        "support": {"enum":["mustMergeWithStone","onSolidSurface","anchoredBetweenSolids","free"]},
        "spanRule": {"type":"string"},
        "permanence": {"enum":["temporary","permanent","permanentIfConcentrationFull"]},
        "flammable": {"type":["boolean","null"]}
      }
    },
    "p_terrainEdit": {
      "type": "object",
      "required": ["mode","massBalance"],
      "additionalProperties": false,
      "properties": {
        "mode": {"enum":["reshape","remove","fissure","openPassage","raise","lower","trench","pillar"]},
        "materials": {"type":"array","items":{"enum":["dirt","sand","clay","stone","wood","plaster","any"]}},
        "maxChangeFt": {"type":"number","exclusiveMinimum":0},
        "count": {"type":"string"},
        "depthDice": {"type":"string"},
        "rateSeconds": {"type":"integer","minimum":0},
        "massBalance": {"enum":["cutFill","toRubble","toDust","suppressRestore","compactRims"]},
        "supportNeutral": {"type":"boolean"},
        "collapseStructuresOnFissure": {"type":"boolean"},
        "placement": {"enum":["seededRandom","chosen"]},
        "startDelayRounds": {"type":"integer","minimum":0}
      }
    },
    "p_surfaceState": {
      "type": "object",
      "required": ["state"],
      "additionalProperties": false,
      "properties": {
        "state": {"enum":["difficult","slick","spikes","restrain","illusory"]},
        "movementCostFactor": {"type":"number","minimum":1}
      }
    },
    "p_fluidSourceSink": {
      "type": "object",
      "required": ["fluid"],
      "additionalProperties": false,
      "properties": {
        "fluid": {"const":"water"},
        "volumeGallons": {"type":"number","exclusiveMinimum":0},
        "perSlotAboveGallons": {"type":"number","minimum":0},
        "placement": {"enum":["openContainer","rain","ground","anyWater"]},
        "extinguishExposedFlames": {"type":"boolean"}
      }
    },
    "p_gasVolume": {
      "type": "object",
      "required": ["kind","density"],
      "additionalProperties": false,
      "properties": {
        "kind": {"enum":["fog","poison","smoke","storm"]},
        "density": {"enum":["lighter","neutral","heavy"]},
        "obscurement": {"enum":["light","heavy"]},
        "driftFtPerRound": {"type":"number","minimum":0},
        "disperse": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["windMph","afterRounds"],
            "properties": {"windMph":{"type":"number"},"afterRounds":{"type":"integer","minimum":0}}
          }
        }
      }
    },
    "p_gasDisperse": {
      "type": "object",
      "additionalProperties": false,
      "properties": {"kinds":{"type":"array","items":{"enum":["fog","mist","gas","smoke"]}}}
    },
    "p_lightEmit": {
      "type": "object",
      "required": ["brightFt","dimFt"],
      "additionalProperties": false,
      "properties": {
        "brightFt": {"type":"number","minimum":0},
        "dimFt": {"type":"number","minimum":0},
        "sunlight": {"type":"boolean"},
        "heat": {"type":"boolean"},
        "attachTo": {"enum":["point","object","creature"]},
        "dispelsDarknessUpToLevel": {"type":"integer","minimum":0,"maximum":9}
      }
    },
    "p_extinguish": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "sources": {
          "type": "array",
          "items": {"enum":["candle","torch","smallCampfire","exposedFlames","unprotectedFlames","protectedFlames"]}
        },
        "protectedChance": {"type":"number","minimum":0,"maximum":1}
      }
    }
  }
}
```

### 3.7 Worked examples

The pointers (`/area/0`, `/damage/0`, `/duration`) resolve to these record quotes in the audit JSON:
- Fireball: `/area/0` is "20-foot-radius sphere" and `/damage/0` is "8d6 fire damage".
- Wall of Stone: `/area/0` is "ten 10-foot- by-10-foot panels" and `/area/1` is "10-foot-by-20-foot panels that are only 3 inches thick".
- Create or Destroy Water: `/area/0` is "30-foot cube".
- Cone of Cold: `/area/0` is "60-foot cone" and `/damage/0` is "8d8 cold damage".
- Earthquake: `/area/0` is "100-foot-radius circle" and `/damage/1` is "50 bludgeoning damage".

Every `srdQuote` is an exact substring of the spell's description.

**Fireball**: SRD ignition, plus added heat and a blast that can breach a floor.
```json
{
  "spellId": "srd:spell:fireball",
  "systems": ["HEAT","FORCE"],
  "effects": [
    {
      "primitive": "ignite",
      "trigger": "onImpact",
      "basis": "srd",
      "srdQuote": "It ignites flammable objects in the area that aren’t being worn or carried.",
      "footprint": {"srd":"/area/0","origin":"point","vertical":"volume","propagation":"aroundCorners","clip":"solid"},
      "magical": false,
      "ledger": {"mode":"none"},
      "params": {"targets":"unattendedFlammablesInFootprint","excludeWornCarried":true}
    },
    {
      "primitive": "heatFlux",
      "trigger": "onImpact",
      "basis": "added",
      "footprint": {"srd":"/area/0","origin":"point","vertical":"volume","propagation":"aroundCorners","clip":"solid"},
      "energy": {"srd":"/damage/0","use":"rolledTotal","coefficientRef":"heat.fire"},
      "magical": false,
      "ledger": {"mode":"none"},
      "params": {"sign":1,"falloff":"linear","melts":true,"driesFuel":true}
    },
    {
      "primitive": "volumeDamage",
      "trigger": "onImpact",
      "basis": "added",
      "footprint": {"srd":"/area/0","origin":"point","vertical":"volume","propagation":"aroundCorners","clip":"solid"},
      "energy": {"srd":"/damage/0","use":"rolledTotal","coefficientRef":"blast.fire"},
      "magical": false,
      "ledger": {"mode":"transform","fromForm":"strata or object","toForm":"rubble or debris"},
      "params": {
        "damageType": "fire",
        "applyTo": ["objects","strata","structures"],
        "falloff": "linear",
        "attenuation": "materialTable",
        "propagateDown": true,
        "respectImmunityZones": true
      }
    }
  ]
}
```

**Wall of Stone**: conjured stone, permanent after full concentration, and removed by a paired sink otherwise.
```json
{
  "spellId": "srd:spell:wall-of-stone",
  "systems": ["EARTH"],
  "variants": [
    {
      "id": "panels10x10",
      "srdQuote": "The wall is 6 inches thick and is composed of ten 10-foot- by-10-foot panels."
    },
    {
      "id": "panels10x20",
      "srdQuote": "Alternatively, you can create 10-foot-by-20-foot panels that are only 3 inches thick."
    }
  ],
  "effects": [
    {
      "primitive": "conjureMatter",
      "variant": "panels10x10",
      "trigger": "onCast",
      "basis": "srd",
      "srdQuote": "A nonmagical wall of solid stone springs into existence at a point you choose within range.",
      "footprint": {"srd":"/area/0","origin":"point","vertical":"volume","clip":"solid"},
      "lifetime": {
        "srd": "/duration",
        "timeDomain": "action",
        "endsWithSpell": true,
        "permanentIf": "concentrationHeldFullDuration"
      },
      "magical": false,
      "ledger": {
        "mode": "source",
        "family": "stone",
        "cause": "spell:srd:spell:wall-of-stone",
        "pairedSinkOnEnd": true,
        "provenanceTag": true
      },
      "params": {
        "material": "stone",
        "thicknessIn": 6,
        "panels": 10,
        "support": "mustMergeWithStone",
        "spanRule": "SRD: a span over 20 feet needs panels halved to create supports",
        "permanence": "permanentIfConcentrationFull",
        "flammable": false
      }
    },
    {
      "primitive": "conjureMatter",
      "variant": "panels10x20",
      "trigger": "onCast",
      "basis": "srd",
      "srdQuote": "A nonmagical wall of solid stone springs into existence at a point you choose within range.",
      "footprint": {"srd":"/area/1","origin":"point","vertical":"volume","clip":"solid"},
      "lifetime": {
        "srd": "/duration",
        "timeDomain": "action",
        "endsWithSpell": true,
        "permanentIf": "concentrationHeldFullDuration"
      },
      "magical": false,
      "ledger": {
        "mode": "source",
        "family": "stone",
        "cause": "spell:srd:spell:wall-of-stone",
        "pairedSinkOnEnd": true,
        "provenanceTag": true
      },
      "params": {
        "material": "stone",
        "thicknessIn": 3,
        "panels": 10,
        "support": "mustMergeWithStone",
        "spanRule": "SRD: a span over 20 feet needs panels halved to create supports",
        "permanence": "permanentIfConcentrationFull",
        "flammable": false
      }
    }
  ]
}
```

**Create or Destroy Water**: four SRD variants: source, source plus extinguish, sink, and fog removal.
```json
{
  "spellId": "srd:spell:create-or-destroy-water",
  "systems": ["WATER","AIR","HEAT"],
  "variants": [
    {
      "id": "createContainer",
      "srdQuote": "You create up to 10 gallons of clean water within range in an open container."
    },
    {
      "id": "createRain",
      "srdQuote": "Alternatively, the water falls as rain in a 30-foot cube within range, extinguishing exposed flames in the area."
    },
    {
      "id": "destroyContainer",
      "srdQuote": "You destroy up to 10 gallons of water in an open container within range."
    },
    {"id":"destroyFog","srdQuote":"Alternatively, you destroy fog in a 30-foot cube within range."}
  ],
  "effects": [
    {
      "primitive": "fluidSource",
      "variant": "createContainer",
      "trigger": "onCast",
      "basis": "srd",
      "srdQuote": "You create up to 10 gallons of clean water within range in an open container.",
      "footprint": {"shape":"object","srdQuote":"in an open container","origin":"target"},
      "magical": false,
      "ledger": {"mode":"source","family":"water","cause":"spell:srd:spell:create-or-destroy-water#createContainer"},
      "params": {"fluid":"water","volumeGallons":10,"perSlotAboveGallons":10,"placement":"openContainer"}
    },
    {
      "primitive": "fluidSource",
      "variant": "createRain",
      "trigger": "onCast",
      "basis": "srd",
      "srdQuote": "Alternatively, the water falls as rain in a 30-foot cube within range, extinguishing exposed flames in the area.",
      "footprint": {"srd":"/area/0","origin":"point","vertical":"down","clip":"solid"},
      "magical": false,
      "ledger": {"mode":"source","family":"water","cause":"spell:srd:spell:create-or-destroy-water#createRain"},
      "params": {
        "fluid": "water",
        "volumeGallons": 10,
        "perSlotAboveGallons": 10,
        "placement": "rain",
        "extinguishExposedFlames": true
      }
    },
    {
      "primitive": "extinguish",
      "variant": "createRain",
      "trigger": "onCast",
      "basis": "srd",
      "srdQuote": "extinguishing exposed flames in the area",
      "footprint": {"srd":"/area/0","origin":"point","vertical":"down","clip":"solid"},
      "magical": false,
      "ledger": {"mode":"none"},
      "params": {"sources":["exposedFlames"]}
    },
    {
      "primitive": "fluidSink",
      "variant": "destroyContainer",
      "trigger": "onCast",
      "basis": "srd",
      "srdQuote": "You destroy up to 10 gallons of water in an open container within range.",
      "footprint": {"shape":"object","srdQuote":"in an open container","origin":"target"},
      "magical": false,
      "ledger": {"mode":"sink","family":"water","cause":"spell:srd:spell:create-or-destroy-water#destroyContainer"},
      "params": {"fluid":"water","volumeGallons":10,"perSlotAboveGallons":10,"placement":"openContainer"}
    },
    {
      "primitive": "gasDisperse",
      "variant": "destroyFog",
      "trigger": "onCast",
      "basis": "srd",
      "srdQuote": "Alternatively, you destroy fog in a 30-foot cube within range.",
      "footprint": {"srd":"/area/0","origin":"point","vertical":"volume","clip":"solid"},
      "magical": false,
      "ledger": {"mode":"none"},
      "params": {"kinds":["fog"]}
    }
  ]
}
```

**Cone of Cold**: added cooling and freezing (DEC-018 "cold freezes liquid into ice").
```json
{
  "spellId": "srd:spell:cone-of-cold",
  "systems": ["COLD","WATER"],
  "effects": [
    {
      "primitive": "heatFlux",
      "trigger": "onCast",
      "basis": "added",
      "footprint": {"srd":"/area/0","origin":"caster","vertical":"volume","propagation":"lineOfEffect","clip":"solid"},
      "energy": {"srd":"/damage/0","use":"rolledTotal","coefficientRef":"heat.cold"},
      "magical": false,
      "ledger": {"mode":"none"},
      "params": {"sign":-1,"falloff":"none"}
    },
    {
      "primitive": "freezeFluid",
      "trigger": "onCast",
      "basis": "added",
      "footprint": {"srd":"/area/0","origin":"caster","vertical":"volume","propagation":"lineOfEffect","clip":"solid"},
      "energy": {"srd":"/damage/0","use":"rolledTotal","coefficientRef":"freeze.cold"},
      "magical": false,
      "ledger": {"mode":"transform","fromForm":"liquid water","toForm":"ice"},
      "params": {"mode":"freeze","fluid":"water","depthFrom":"energy","maxDepthFt":2}
    }
  ]
}
```

**Earthquake**: SRD difficult terrain, structure damage per round, and mass-conserving fissures.
```json
{
  "spellId": "srd:spell:earthquake",
  "systems": ["EARTH","FORCE"],
  "effects": [
    {
      "primitive": "surfaceState",
      "trigger": "onCast",
      "basis": "srd",
      "srdQuote": "The ground in the area becomes difficult terrain.",
      "footprint": {"srd":"/area/0","origin":"point","vertical":"groundSurface"},
      "lifetime": {"srd":"/duration","timeDomain":"action","endsWithSpell":true},
      "magical": true,
      "ledger": {"mode":"none"},
      "params": {"state":"difficult","movementCostFactor":2}
    },
    {
      "primitive": "volumeDamage",
      "trigger": "perRound",
      "basis": "srd",
      "srdQuote": "The tremor deals 50 bludgeoning damage to any structure in contact with the ground in the area when you cast the spell and at the start of each of your turns until the spell ends.",
      "footprint": {"srd":"/area/0","origin":"point","vertical":"groundSurface"},
      "lifetime": {"srd":"/duration","timeDomain":"action","endsWithSpell":true},
      "energy": {"srd":"/damage/1","use":"rolledTotal","coefficientRef":"quake.bludgeoning"},
      "magical": false,
      "ledger": {"mode":"transform","fromForm":"structure","toForm":"rubble"},
      "params": {
        "damageType": "bludgeoning",
        "applyTo": ["structures"],
        "falloff": "constant",
        "attenuation": "materialTable",
        "propagateDown": false
      }
    },
    {
      "primitive": "terrainEdit",
      "trigger": "perRound",
      "basis": "srd",
      "srdQuote": "A fissure that opens beneath a structure causes it to automatically collapse (see below).",
      "footprint": {
        "shape": "fissure",
        "widthFt": 10,
        "srdQuote": "Each is 1d10 × 10 feet deep, 10 feet wide, and extends from one edge of the spell’s area to the opposite side.",
        "origin": "point",
        "vertical": "down",
        "clip": "none"
      },
      "magical": false,
      "ledger": {"mode":"transform","fromForm":"strata in fissure volume","toForm":"compacted rim strata and rubble"},
      "params": {
        "mode": "fissure",
        "count": "1d6",
        "depthDice": "1d10 x 10 ft",
        "placement": "seededRandom",
        "startDelayRounds": 1,
        "massBalance": "compactRims",
        "collapseStructuresOnFissure": true
      }
    }
  ]
}
```

---

## 4. Dependencies and implementation order

### 4.1 What each primitive needs

All rows below are `PLANNED` in `docs/worldgen/DEUS_WORLDGEN_WBS.md` (read at the base commit). "Records" counts audit records whose `wbsDeps` include the row.

| WBS row | Title (short) | Needed by | Records |
|---|---|---|---|
| SIM.00.00 | In-place layer switch (Lane N) | crossLayer targets-through-openings | 234 |
| SIM.00.04 | Units and movement into the core | `forceBarrier`, `surfaceState` | 24 |
| WG.00.17 | 32-layer Z-range refactor, sparse storage | crossLayer targets-through-openings, crossLayer breaches-floor, crossLayer falls/flows-down | 234 |
| WG.00.18 | Layer-view presentation (Owner-led) | `lightEmit`, `darken` | 26 |
| WG.00.19 | In-layer height, falling damage | `impulse` | 16 |
| WG.00.20 | Ramps and layer connectors | per-record additions | 2 |
| GP.07.02 | Cross-layer 3D targeting, ballistics, volume damage | `volumeDamage`, `impulse`, crossLayer targets-through-openings, crossLayer breaches-floor | 234 |
| SIM.40.01 | Support model and blast propagation | `volumeDamage`, `conjureMatter`, `terrainEdit`, crossLayer breaches-floor | 38 |
| SIM.40.02 | Collapse events, rubble mass conservation | `volumeDamage`, `conjureMatter`, `terrainEdit`, crossLayer breaches-floor | 30 |
| SIM.40.07 | Item weathering and burial (rot) | `decay` | 2 |
| SIM.40.10 | Reproduction and lifecycle (bodies to soil) | `decay`, `bodyTransform`, `animate` | 24 |
| SIM.50.02 | Cross-layer water dynamics | `freezeFluid`, `forceBarrier`, `fluidSource`, `fluidSink`, `fluidMove` | 17 |
| SIM.50.04 | Vegetation spread and succession | `growth`, `decay` | 4 |
| SIM.50.05 | Fire spread (fuel, wind, dryness) | `ignite`, `extinguish`, `heatFlux`, `windField` | 30 |
| SIM.50.06 | Seasons and weather (temperature, freezing, wind) | `heatFlux`, `freezeFluid`, `gasVolume`, `gasDisperse`, `windField`, `weatherOverride` | 29 |
| SIM.50.08 | Land reshaping (strata mutations) | per-record additions | 1 |
| SIM.50.10 | Catastrophic geology (earthquakes) | per-record additions | 1 |
| WG.61.02 | Closed-loop conservation ledger (runtime) | `conjureMatter`, `terrainEdit`, `fluidSource`, `fluidSink`, `objectTransform`, `extraplanarHold`, conservation conjured-source, conservation conjured-sink, conservation transform | 76 |
| WG.65.15 | Geomass and resource verifier | `conjureMatter`, `terrainEdit`, conservation conjured-source, conservation conjured-sink, conservation transform | 76 |

In addition:
- ADR-003 Rev 2 (SIM.00.01, PROPOSED) supplies the headless core, the tick, the ledger (§7.8) and the LOD rules. SIM.60.03 lists SIM.00.03 (snapshot interface) as a dependency.
- LOD point: ADR-003 Rev 2 §5.3 and §6 make a burning cell a focus source, so fire never runs at L2. Other long-lived spell effects (a permanent Wall of Stone, created water, a Fog Cloud drifting out of focus) need the same kind of rule. Either they are focus sources while magical, or their mundane results are summarised like any other state.

### 4.2 Existing code to build on (read at the base commit)

| Need | What exists | Where |
|---|---|---|
| Ignite and extinguish | `ignite(area, x, y, opts)` emits `fire:ignited` with a cause; `extinguish(area, x, y, how, unit)` | `game/js/plugins/DEUS_Fire.js:374`, `:392`, `:411` |
| Fire spread inputs | No wind or smoke terms (`grep -c -w -i wind` = 0 and `smoke` = 0) | `DEUS_Fire.js` |
| Fluids | Integer depth 0..7, water and lava only, barrier checks, 5 levels hard-coded (`Z_MIN = -2`, `Z_MAX = 2`) | `DEUS_Fluid.js:50-58`, `:269` |
| Ice | None (`grep -c -w -i ice` = 0 in `DEUS_Fluid.js`) | — |
| Volume damage | `applyVolumeDamage` with a sphere form (radius in feet, falloff) that crosses levels; its comment says "a stratum 1 ft high" and it accepts z −2..2 only | `DEUS_Levels.js:1785-1829` |
| Temperature | `ambientTemperature` computed per call from worldgen, depth, day-night, shelter and radiant sources, cached per frame. No stored heat state, so heat cannot be added to a cell | `DEUS_Environment.js:168-261` |
| Light | Presentation-side point lights (px radius) and a sight-radius factor. No simulation light field | `DEUS_DayNight.js:107`, `:130-138`, `:369-414` |
| Door and lock state | `damageAt`, lock and break state (Knock, Arcane Lock) | `DEUS_Doors.js:453` |
| Spell table | A hand-typed `DND_SPELLS` table for a spellbook page; it does not read `spells.json` | `DEUS_Dnd5e.js:318`, `:436` |

### 4.3 Gaps with no WBS row

| Code | Gap | Records | Suggested owner (PM decision) |
|---|---|---|---|
| G-TEMP | A stored per-cell and per-object temperature field that `heatFlux` and `freezeFluid` can change and that fire, fluids and seasons read. SIM.50.06 has seasonal temperature, but no row stores local heat. | 19 | Add to SIM.50.06, or a new SIM.50 row |
| G-GAS | Gas and smoke volumes: density (heavier gas sinks and pours down openings), drift, dispersal by wind speed. SIM.50.05 mentions smoke only. | 8 | A new SIM.50 row, or add to SIM.50.06 |
| G-LIGHT | A simulation light field (light levels for vision and darkness), separate from WG.00.18 presentation. Today light is drawn only (`DEUS_DayNight.js:369-414`). | 26 | A new row; the presentation stays with WG.00.18 (Owner-led, DEC-011) |
| (noise) | Noise events for AI perception (Alarm, Knock, Thunderwave "audible out to 300 feet", Shatter). No physical system is proposed. | notes only | AI rows, not SIM.60 |
| (time) | Action-domain clock for spell lifetimes (Q2). | all timed spells | Owner and Lane M (ADR-003 Rev 3) |

### 4.4 Recommended order for SIM.60.02, SIM.60.03 and SIM.60.04

1. **SIM.60.02 schema first (no dependencies beyond this audit):**
   - Promote the audit `srd` blocks to a structured SRD baseline.
   - Write the schema (§3.6) and the tuning-coefficient table.
   - Write effect data for all 111 physical records and the `NONE` records that use meta primitives.
   - Add a validator that fails on:
     - any SRD number copied into effect data;
     - any unknown primitive;
     - any source or sink without a cause;
     - any `basis: srd` without a matching quote.

   Show each check failing on a mutant.
2. **SIM.60.03 runtime in phases**, each behind its own world system. Primitives are listed with the WBS rows that must merge first:

   | Phase | Primitives | Needs merged first |
   |---|---|---|
   | A | `ignite`, `extinguish`, `lightEmit`, `darken`, `surfaceState`, `forceBarrier`, `magicSuppress`, `magicEnd` | SIM.00.03; SIM.50.05 for spread; SIM.00.04 for movement cost. The existing `DEUS_Fire` ignite path can host early tests. |
   | B | `volumeDamage`, `impulse` | SIM.40.01, SIM.40.02, GP.07.02, WG.00.17 (32 layers; replaces the −2..2 limits in `DEUS_Levels`/`DEUS_Fluid`), SIM.00.00 for cross-layer viewing |
   | C | `fluidSource`, `fluidSink`, `fluidMove` | SIM.50.02, WG.61.02 (ledger) |
   | D | `heatFlux`, `freezeFluid`, `weatherOverride` | SIM.50.06 and G-TEMP |
   | E | `conjureMatter`, `terrainEdit`, `bodyTransform`, `animate`, `objectTransform`, `growth`, `decay`, `extraplanarHold` | SIM.40.01-.02, WG.61.02, WG.65.15, SIM.50.04, SIM.40.10, and the Owner's answer to Q1 |
   | F | `gasVolume`, `gasDisperse`, `windField` | G-GAS and SIM.50.06 wind |

   Q2 (time scale) must be answered before any timed effect ships.
3. **SIM.60.04 QA fixtures**, one set per phase. Each must be seen to fail on a mutant:
   - the five WBS fixtures (fireball floor breach, flood down a stairwell, lake freeze, wall of stone against the mass ledger, SRD stat invariance);
   - Cloudkill pouring down a shaft;
   - Gust of Wind extinguishing a torch and dispersing Fog Cloud;
   - Antimagic Field gapping a Wall of Fire;
   - Dispel Magic removing a non-permanent Wall of Stone (ledger sink);
   - Silence protecting objects from Shatter;
   - Creation metal removed after smelting (provenance).

### 4.5 Cross-layer behaviour

- **3D targeting** (DEC-022 §1, GP.07.02): 206 records are `targets-through-openings`. Almost every ranged spell needs true 3D range and line of sight through shafts, and several areas (spheres of 20 feet or more, 40-foot cylinders, 60-foot light radii) span several layers. Viewing another layer uses Lane N's in-place layer switch (SIM.00.00).
- **Floor breach** (DEC-013 §4, DEC-022 §4): 13 records. `volumeDamage` with `propagateDown` needs the support model (SIM.40.01) and collapse (SIM.40.02). The existing `applyVolumeDamage` sphere form is a starting point, but it assumes 1-foot strata and z −2..2 (`DEUS_Levels.js:1791`, `:1828`). WG.00.17 must change that first.
- **Falling and flowing** (DEC-019 falling damage, WG.00.19): 15 records. Water uses the fluid simulation's downward rule (SIM.50.02). Heavy gas needs G-GAS. Creatures and objects need height-based falling damage (WG.00.19, GP.07.02).

---

## 5. Conjured matter versus LIFE-001 (Owner question)

**The PM default, quoted from DEC-018:** "Conjured matter (*create water*, *wall of stone*) versus LIFE-001 mass conservation. The default is that conjured matter is an explicitly modelled magical source/sink, logged in the conservation ledger like the rain/evaporation exception."

**What the audit found.** 24 records create matter (`conjured-source`) and 1 destroys it permanently (`conjured-sink`):

| Spell | `conservation` | What is created or destroyed (summary; see the record) | Q1 part |
|---|---|---|---|
| Clone | conjured-source | a new full-size body grown in a vessel over 120 days | Q1(c) |
| Control Water | conjured-source | Flood raises standing water up to 20 feet; the SRD does not say where the water comes from | Q1(b) |
| Create Food and Water | conjured-source | 45 pounds of food and 30 gallons of water, permanent | Q1(a) |
| Create or Destroy Water | conjured-source | 10 gallons of water or rain (create); 10 gallons of water or fog removed (destroy) | Q1(a) |
| Creation | conjured-source | an object up to a 5-foot cube of vegetable matter, stone, crystal, metal or gems, lasting 1 minute to 1 day | Q1(b) |
| Enlarge/Reduce | conjured-source | weight multiplied by 8 or reduced to 1/8 for the duration | Q1(c) |
| Entangle | conjured-source | conjured weeds and vines in a 20-foot square that wilt away at the end | Q1(b) |
| Goodberry | conjured-source | up to ten berries, each a day of food | Q1(a) |
| Grease | conjured-source | grease over a 10-foot square for 1 minute | Q1(b) |
| Guards and Wards | conjured-source | webs filling stairs, regrowing within 10 minutes if burned or torn | Q1(b) |
| Heroes’ Feast | conjured-source | a feast that disappears after 1 hour | Q1(b) |
| Ice Storm | conjured-source | hail over a 20-foot-radius, 40-foot-high cylinder | Q1(b) |
| Plant Growth | conjured-source | overgrowth in a 100-foot radius, or doubled harvest over a half-mile radius for 1 year | Q1(a), Q1(c) |
| Regenerate | conjured-source | severed body parts regrown | Q1(c) |
| Reincarnate | conjured-source | a new adult body | Q1(c) |
| Resurrection | conjured-source | missing body parts restored | Q1(c) |
| Secret Chest | conjured-sink | a chest and up to 12 cubic feet of contents lost if the spell ends while it is on the Ethereal Plane | Q1(d) |
| Sleet Storm | conjured-source | freezing rain, sleet and ground ice over a 40-foot radius | Q1(b) |
| Storm of Vengeance | conjured-source | acidic rain, hail and freezing rain under a 360-foot-radius cloud | Q1(b) |
| True Resurrection | conjured-source | a new body if the original no longer exists | Q1(c) |
| Wall of Ice | conjured-source | a 1-foot-thick ice wall, dome or sphere for the duration | Q1(b) |
| Wall of Stone | conjured-source | stone panels, permanent after full concentration, otherwise gone at the end | Q1(a), Q1(b) |
| Wall of Thorns | conjured-source | a brush wall up to 60 × 10 × 5 feet for the duration | Q1(b) |
| Web | conjured-source | webbing in a 20-foot cube for up to 1 hour | Q1(b) |
| Wish | conjured-source | an object of up to 25,000 gp value, up to 300 feet across, permanent | Q1(a) |

The same question also arises, less directly, in `transform` records that change a material family:
- Flesh to Stone: organic matter becomes stone at ten times the weight.
- True Polymorph: an object becomes a creature, or the reverse.
- Planar transfers and extradimensional storage: Plane Shift, Banishment, Gate, Secret Chest, Demiplane.

**Alternatives** (for the Owner; the audit does not choose):

| Option | Rule | Effect on the SIM.60.04 fixtures and on play |
|---|---|---|
| A. PM default | Conjured matter is an explicit magical source or sink with a named cause (`spell:<id>`), logged in the ledger like rain and evaporation. Temporary matter has a paired sink at the end. | Wall of Stone matches the ledger as source plus paired sink. Create Water permanently adds water. Magic can grow the world's totals. |
| B. Borrowed matter | Conjured matter must be drawn from the surroundings within a radius (stone from nearby strata, water from air humidity or nearby bodies) as a transform. The spell fails or shrinks if there is not enough. | The ledger stays closed with no magic exception. It needs a borrowing rule per material and changes SRD outcomes (a spell can fail where the SRD says it works), which conflicts with DEC-018 ("never replacing SRD numbers"). |
| C. Temporary only | All conjured matter is magical and vanishes at the end. Permanence clauses become magical permanence (the matter is outside Q-MASS until dispelled). | The ledger stays closed. Permanent Wall of Stone and created water would never count as real matter, and melting or evaporation of "magical" water needs special handling. |
| D. Outside the ledger | Magic is exempt from LIFE-001 (the ledger ignores spell matter). | Simplest to build, but matter can then leak silently, which LIFE-001 was written to prevent. |
| E. Hybrid | Permanent matter is an A-style source. Temporary matter is a magical form outside Q-MASS until it becomes permanent, tracked by provenance (§3.4) so the sink always finds it. | The most bookkeeping. It keeps both the SRD permanence rules and exact accounting of what vanishes. |

The five parts of Owner question Q1 (§6) follow from this.

---

## 6. Owner questions

These are listed for the Owner. None is answered in this audit.

- **Q1. Conjured matter and the conservation ledger (DEC-018 open sub-question).** Which option in §5 (A to E, or another)? The parts that follow from it:
  - **Q1(a)** Permanent conjured matter: Create Water, Create Food and Water, Goodberry, a permanent Wall of Stone, Wish's object (up to 25,000 gp, possibly refined metal, while LIFE-002 forbids ore creation), Plant Growth's doubled yield. Is it a named ledger source, and are there limits?
  - **Q1(b)** Temporary conjured matter that leaves its area or changes form before the spell ends:
    - flood water that has run down a shaft (Control Water);
    - melt from a Wall of Ice or Ice Storm hail;
    - Sleet Storm and Storm of Vengeance rain;
    - Creation's metal smelted into a tool;
    - Heroes' Feast and Magnificent Mansion food that has been eaten.

    Does the paired sink follow it (provenance), leave it behind, or does it become permanent?
  - **Q1(c)** Mass changes of bodies and objects: Enlarge/Reduce (×8, ×1/8), petrification (×10), polymorph and shapechange forms, and new or restored bodies (Clone, Reincarnate, Resurrection, True Resurrection, Regenerate). Does the ledger track creature tissue, and does the SRD weight apply to floor load?
  - **Q1(d)** Planar travel and extradimensional storage:
    - Plane Shift, Banishment, Gate and Planar Ally (creatures and payments leaving or arriving);
    - Secret Chest's permanent loss;
    - Demiplane and Magnificent Mansion contents left behind;
    - whether fluids or gas flow through an open Gate.

    Are these ledger imports and exports?
  - **Q1(e)** Summoned creatures (Conjure Animals, Find Familiar, Find Steed, the elementals, Insect Plague's swarm). The SRD says they disappear without remains. Are their bodies outside Q-MASS? Does Conjure Elemental consume the 10-foot cube of air, earth, fire or water it rises from?
- **Q2. Time scale for spell durations.** Four sources disagree (§7, escalation): 1 real minute = 6 game hours (code and ADR-003 Rev 2), 1 beat = 1 game minute (V46, V101), or a separate 6-second action round (SRD5_1_INTEGRATION). Should SRD rounds and minutes run on an action clock, and at what rate against the world tick?
- **Q3. Damage types the ruling does not name.** DEC-018 names fire, blasts, water, cold and earth. Should any of these also have physical effects?
  - Acid: corrosion of materials. The SRD damages objects with acid only in Storm of Vengeance's rain.
  - Lightning: conduction through water or metal. The SRD's only metal rule is Shocking Grasp's advantage against metal armour.
  - Necrotic areas: killing plants (Circle of Death).
  - Radiant and sunlight: effects on plants.
  - Thunder: structural damage beyond Shatter and Thunderwave.
- **Q4. SRD-silent properties of magical substances and barriers.** For example:
  - Do Grease, Entangle's vines and Wall of Thorns burn? (The SRD says Web burns.)
  - Does magical fire (Wall of Fire, Flaming Sphere, Fire Shield, Produce Flame) consume fuel, leave ash, or light tinder?
  - Does a horizontal Wall of Force, Forcecage or Resilient Sphere bear load?
  - Does Reverse Gravity lift loose water?
  - Does Flaming Sphere fall into a shaft?

---

## 7. Source disagreements, escalation and limits

1. **Time scale (escalated).** `tasks/SIM.60.01/lane-p/escalation.md` sets out the sources:
   - `game/js/plugins/DEUS_Core.js:59-61`: "1 real minute = 1 season (6h)";
   - ADR-003 Rev 2 §3.2: "One tick is 36 game-seconds";
   - `docs/VISION.md:55` V46 and `:112` V101: a beat is 1 second, "one game minute", with one clock for the whole game;
   - `docs/SRD5_1_INTEGRATION.md:66`: 6-second action rounds on domain-tagged action timers.

   Not resolved here. The schema stores SRD seconds and leaves `secondsPerTick` as a named parameter.
2. **Strata height.** `applyVolumeDamage` documents "a stratum 1 ft high" and accepts z −2..2 (`DEUS_Levels.js:1791`, `:1828`), while DEC-013 sets 2-ft strata and 32 layers. This is WG.00.17 scope. The audit uses DEC-013 geometry.
3. **Count.** The WBS row says 327 spells, which includes the 8 spell lists. The brief settles it at 319 (§1.1).
4. **ADR-003 is PROPOSED.** The tick, ledger and LOD details cited from Rev 2 may change in Rev 3 (Lane M).
5. **Limits of this audit:**
   - The SRD fields other than the copied ones are regex extracts checked as exact quotes, so a quote can be exact but incomplete. For example, a spell may state a second area in words the patterns do not catch. Areas were checked by hand where the text was physical.
   - `physicalEffects` and the "Added" parts are design proposals for SIM.60.02, not SRD.
   - Confidence is the writer's judgement: 234 HIGH, 79 MEDIUM, 6 LOW.
   - `spells.json` is marked dormant and `readiness: parsed` for 317 spells. The audit quotes it as it is and does not verify it against the PDF.
   - The schema was validated only against the five examples and nine negative cases, not against effect data for all 111 physical spells.
