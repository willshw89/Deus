# Design Proposals & Historical Architecture (Project DEUS)

This folder contains conceptual design whitepapers and early architectural proposals created during initial pre-alpha ideation.

### Documentation Hierarchy & Source of Truth:
1. **Active System Specifications (`docs/systems/`)**:
   - The authoritative source of truth for implemented engine plugins, APIs, data contracts, and automated test criteria.
   - Example: `docs/systems/UF_Colonists.md`, `docs/systems/AI_ARCHITECTURE.md`, `docs/systems/UF_World.md`.
2. **Current Reality & Verification Log (`docs/STATUS.md`)**:
   - The living record of what actually works in-engine, benchmark results, and verified screenshots.
3. **Core Vision & Decision Log (`docs/VISION.md`)**:
   - Binding user decisions, rejected directions, and game mechanics.
4. **Historical Design Drafts (`docs/design/` - this folder)**:
   - Exploratory whitepapers and theoretical feature proposals. When a design concept in this folder conflicts with `docs/systems/` or `docs/STATUS.md`, the implemented code and `docs/systems/` specifications take precedence.
