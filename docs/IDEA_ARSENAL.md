# IDEA ARSENAL — Project DEUS

**Intake Authority:** Owner Terminal (Gemini)  
**Last Updated:** 2026-09-22  
**Purpose:** Single intake, classification, and evaluation point for all raw concepts, design thoughts, player mechanics, and systems ideas. Ideas captured here are evaluated and held until they are mature and appropriate to inject into a bounded work block in `docs/WORK_QUEUE.md`.

---

## 1. Intake & Evaluation Protocol

1. **Intake**: Whenever an idea is proposed by the owner or observed during play, it is assigned a stable Idea ID (`IDEA-xxx`) and recorded immediately.
2. **No Premature Derailment**: Active work blocks are NEVER interrupted for an idea unless it represents a release-blocking defect or safety crisis.
3. **Evaluation Criteria**:
   - **Fit with DEUS Vision**: Autonomous world simulation, 16-bit serious chibi aesthetic, Arthurian/sci-fi low fantasy, DF depth + U7 interaction.
   - **Subsystem Impact**: World, Entities, Time, Jobs, Inventory, Construction, Combat, or UI.
   - **Architectural Cost**: Does it violate O(1)/spatial query rules? Does it require circular dependencies?
   - **Slice Mapping**: Which roadmap slice (Slices 1–8+) does this naturally belong to?
4. **Lifecycle Statuses**:
   `NEW` $\longrightarrow$ `EVALUATING` $\longrightarrow$ `QUEUED` (for a slice) $\longrightarrow$ `PROMOTED` (to `docs/WORK_QUEUE.md`) · `PARKED` · `REJECTED` · `SUPERSEDED`

---

## 2. Captured Ideas & Registry

| Idea ID | Title / Concept | Origin / Date | Category | Roadmap Alignment | Status | Notes / Evaluation Summary |
|---|---|---|---|---|---|---|
| `IDEA-001` | 3×3 Workstation-Grid Transaction Model | Owner / 2026-09-22 | Economy / Crafting | Slice 5 (Crafting) | `QUEUED` | Standardizes crafting and construction around fixed 3×3 workstation footprints with input/output slot semantics. Fits lean architecture. |
| `IDEA-002` | Arthurian Holy Relics & Fallen Starship Debris | Vision V65 / V87 | Lore / WorldGen | Slice 6 (WorldGen) | `PARKED` | Public-domain Arthurian mythology crossed with ancient star-faring relics. Kept parked until world generation slice expands surface landmarks. |
| `IDEA-003` | Non-Living Autonomous Asset Production | Directives V129 | Art Pipeline | Continuous | `READY_FOR_WORK_BLOCK` | Continuous autonomous Nano Banana Pro batching of tiles, objects, and furniture using the DF black wall-top standard. Excludes living entities. |
| `IDEA-004` | Mendelian Allele Genetic Inheritance | Vision V122 | Population / Biology | Slice 8 (Population) | `PARKED` | Phenotypic allele passing (45% mother, 45% father, 10% mutation) for hair, skin, and variation sheets. Dependent on family/reproduction systems. |
| `IDEA-005` | DF-Style Wounds Layered Over Hitpoints | Vision V105 | Combat / Medicine | Slice 7 (Combat) | `EVALUATING` | Core HP determines consciousness/death; severe localized hits inflict bleeding, broken limbs, and movement penalties treatable by herbalists. |
| `IDEA-006` | Drag-and-Drop U7 Grid Inventory & Storage Gumps | Vision V90 | Inventory / UI | Slice 3 (Items/U7) | `QUEUED` | Direct visual manipulation of stacks between character inventory, container grids (chests, barrels), and ground cells. |
| `IDEA-007` | Faction-Specific Architectural Window Skins | Vision V99 / V107 | UI / System | Art Phase | `QUEUED` | Distinct window skins per people (dwarf rune stone, elf living vine, human oak/brass) following U7 styling with slate inlays and rivets. |
| `IDEA-008` | Autonomous Block-by-Block Blueprint Synthesis | Vision V125 / V128 | Colonist AI | Slice 1 Post-Review | `EVALUATING` | Colonists dynamically assemble building layouts using structural property tags (`STRUCTURAL_TIMBER`, `BUILDING_STONE`) incorporating natural rock walls. |
| `IDEA-009` | Multi-Domain Explicit Time Tagging | ADR 2.6 / Eng Std | Architecture | Continuous | `READY_FOR_WORK_BLOCK` | Enforce explicit domain tagging (`domain: "action" \| "historical" \| "presentation" \| "engine"`) across all timers to prevent frame pacing bugs. |
| `IDEA-010` | Natural World Autonomous Behavior | Owner / 2026-09-22 | Ecology / Simulation | Foundational / Pre-Slice 2 | `PROMOTED` | Activate autonomous natural world life (fauna grazing, herd cohesion, predator/prey balance, plant regrowth, diurnal cycles) as the living substrate before human societal development. Promoted to `WB-003`. |

---

## 3. Promotion to Work Queue Rules

An idea moves from `IDEA_ARSENAL.md` to `WORK_QUEUE.md` ONLY when:
- The owner explicitly prioritizes the concept.
- The corresponding Slice is `IN PROGRESS` or actively preparing.
- A complete Work Block specification (dependencies, allowed paths, acceptance criteria) has been verified.
