# DEUS Society & Institutions Work Breakdown Structure

**Namespace:** SOC  
**Rev:** 3  
**IDs:** Stable. Next free in SOC.70 is SOC.70.02. Next free band is SOC.80  
**Canonical Authority:** Gemini / Antigravity  
**Status:** CANONICAL ON MAIN  
**Permanent Project-Control Anchor:** WBS IDs are immutable. Never silently renumber, merge, or reuse them. Once committed, a leaf changes only by status (`PLANNED` → `DONE`) or retirement via `SUPERSEDED`.  

---

## 1. Executive Mandate & Production Principles

This document defines the authoritative, step-by-step path for Project DEUS societal, factional, economic, and institutional systems.

### Core Architectural Principles
1. **Three Independent Identity Axes:** Craft (economy), Civic Office (governance), and Class (combat/2014 SRD) are independent. Current Duty is transient operational assignment.
2. **Office Exists Independently of Holder:** An office survives holder death as a vacancy. Authority resides in the office entity, not loose person flags.
3. **World Year 0 Founder Bootstrap:** 9 racial factions of 8 founders each = 72 colonists. All 8 core functional institutional roles are covered through multi-hat founders; bureaucracy expands organically based on workload.
4. **Physical Conserved Currency:** Currency is physical coin (cp, sp, ep, gp, pp) minted from assayed metal ingots. Zero magic wealth creation.
5. **No Fixed Military Ratios:** Mobilization temporarily redirects economic labor into defense at an authentic economic cost.
6. **Multi-Timescale Performance Compliance:** Zero recurring 60 Hz bureaucracy; event-driven state transitions and scheduled multi-timescale economic ticks complying with `docs/PERFORMANCE_ARCHITECTURE.md`.

---

## 2. Master WBS Matrix

```text
SOC.10 — Person Three-Axis Identity & Core Schemas
SOC.11 — 2014 SRD Class Integration & Progression
SOC.12 — Craft & Productive Profession Catalogue
SOC.13 — Central Duty Scheduler & Vital Needs Arbitration
SOC.20 — Faction Institutional Skeleton & Office Schema
SOC.21 — Year-0 Eight-Founder Institutional Bootstrap
SOC.22 — Office Workload Tracking & Dynamic Specialization
SOC.23 — Office Vacancy, Deputy & Succession Engine
SOC.30 — Conserved Physical Currency & Minting Engine
SOC.31 — Treasury, Budgeting & Payroll System
SOC.32 — Quartermaster Physical Stockpile Allocation
SOC.33 — Tax Assessment & Revenue Collection
SOC.40 — Military Service Status & Mobilization Engine
SOC.41 — Guard Patrol & Garrison Defensive Routine
SOC.42 — Military Economic Impact & Demobilization Recovery
SOC.50 — Command Mode Institutional Policy Interface
SOC.51 — Emergent Historical Biography & Chronicle Recording
SOC.60 — Societal State Persistence & Save Schema Migrations
SOC.70 — Society & Economy Verification Test Suites
```

---

## 3. Detailed Work Breakdown & Status Registry

### SOC.10–13 — Person Identity, Craft, Class & Scheduling

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **SOC.10.01** | Person Three-Axis Identity Schema | Gemini / Fable | Establish canonical person data model with independent `craft`, `civicOffice`, and `class` fields; support `NONE` across any axis. | `PLANNED` |
| **SOC.10.02** | Faction Development Plan Spec & JSON Schema | Fable / Gemini | Design-first JSON schema defining 6 settlement stages (camp to capital), unlock prerequisites, dynamic build orders (peace/threat/famine), occupation mix, tech path, architectural style per DEC-013 band, expansion & collapse rules (DEC-015, V141). | `PLANNED` |
| **SOC.10.03** | Nine Race Development Plan Data Slots | Fable / Gemini | Author 9 baseline JSON plan files in `game/data/plans/` for the 9 races with structural schema populated; race-specific cultural lore, names, and values marked Owner TODO (DEC-015). | `PLANNED` |
| **SOC.11.01** | 2014 SRD Class Integration | Fable | Integrate canonical 2014 SRD classes, hit dice, proficiencies, spellcasting, and level 1..20 progression rules. | `PLANNED` |
| **SOC.12.01** | Master Craft Catalogue | Gemini | Define economic professions linked to DEUS production chains, 2014 SRD item crafting, and apprentice-to-master progression. | `PLANNED` |
| **SOC.13.01** | Central Duty Scheduler | Fable | Arbitrate competing operational priorities (vital needs, combat defense, mobilization, office duty, craft labor, rest). | `PLANNED` |

---

### SOC.20–23 — Faction Institutions, Offices & Governance

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **SOC.20.01** | Faction Institutional Skeleton & Office Schema | Gemini / Fable | Decouple Office entity from living person; store jurisdiction, authority scopes, and succession rules on the office. | `PLANNED` |
| **SOC.21.01** | Year-0 Eight-Founder Institutional Coverage | Fable | Seed 9 factions with 8 multi-hat founders covering Governance, Treasury, Mint, Defense, Stores, Works, Food, and Records. | `PLANNED` |
| **SOC.22.01** | Office Workload Index Tracking | Fable | Monitor administrative transaction pressure vs allocated officer hours per department. | `PLANNED` |
| **SOC.22.02** | Workload-Driven Office Specialization | Fable | Trigger institutional pressure to appoint deputies or split offices (e.g. Tax Collector, Paymaster, Clerk) when workload > 100%. | `PLANNED` |
| **SOC.23.01** | Office Vacancy & Governance Degradation | Fable | Model officer death/absence as an institutional vacancy with associated administrative delays and corruption risks. | `PLANNED` |
| **SOC.23.02** | Deputy Appointment & Succession Engine | Fable | Automatic acting-officer assumption by appointed deputies; cultural succession rules (appointment, election, hereditary). | `PLANNED` |
| **SOC.23.03** | Faction Appointment Authority & Council | Fable | Sovereign and council appointment workflows, political loyalty, and institutional jurisdiction enforcement. | `PLANNED` |

---

### SOC.30–33 — Economy, Minting, Treasury & Logistics

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **SOC.30.01** | Conserved Physical Minting Engine | Fable | Transform physical gold, silver, electrum, copper ingots into authentic coinage (cp, sp, ep, gp, pp) with zero mass leaks. | `PLANNED` |
| **SOC.30.02** | Physical Currency Circulation Simulation | Fable | Model coin flow: Treasury $\rightarrow$ Wages $\rightarrow$ Colonist Purchase $\rightarrow$ Producers $\rightarrow$ Taxes $\rightarrow$ Treasury. | `PLANNED` |
| **SOC.31.01** | Treasury & Financial Budgeting Ledger | Fable | Balance sheets, public revenue tracking, expenditure authorizations, and debt ledgers. | `PLANNED` |
| **SOC.31.02** | Automated Payroll Disbursement | Fable | Scheduled wage payments from physical treasury chests to active workers based on completed labor orders. | `PLANNED` |
| **SOC.32.01** | Quartermaster Physical Stockpile Allocation | Fable | Distinct physical inventory management (tools, food, raw goods, arms); resolve physical availability vs financial wealth. | `PLANNED` |
| **SOC.33.01** | Tax Assessment & Revenue Collection | Fable | Periodic civic levies, property assessments, and trade tariffs collected into central faction coffers. | `PLANNED` |

---

### SOC.40–42 — Military Service, Mobilization & Defense

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **SOC.40.01** | Military Service Status Classification | Fable | Classify colonists into administrative statuses: `NONE`, `RESERVE`, `MILITIA`, `GUARD`, `PROFESSIONAL`, `ELITE_RETINUE`. | `PLANNED` |
| **SOC.40.02** | Threat-Driven Militia Mobilization Engine | Fable | Dynamic alarm system calling civilian workers to arms; assign combat defense duties at walls and gates. | `PLANNED` |
| **SOC.41.01** | Guard Patrol & Garrison Defensive Routine | Fable | Routine peacetime sentry patrols, watchtower posts, and gate control handled by active guards. | `PLANNED` |
| **SOC.42.01** | Military Economic Productivity Cost & Recovery | Fable | Track economic disruption from mobilized labor (unharvested crops, stopped forges); smooth demobilization back to crafts. | `PLANNED` |

---

### SOC.50–51 — Command Mode & Emergent History

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **SOC.50.01** | Command Mode Institutional Policy Interface | Gemini / Fable | High-level faction policy decrees delegated through Marshal, Master of Works, Quartermaster, and Treasurer. | `PLANNED` |
| **SOC.51.01** | Emergent Historical Biography & Chronicle | Fable | Persistent life chronicle recording craft advancements, civic appointments, battle survivals, and historical deeds. | `PLANNED` |

---

### SOC.60–70 — Persistence, Performance & Quality Assurance

| WBS Leaf | Title | Owner | Scope & Deliverables | Status |
| :--- | :--- | :---: | :--- | :---: |
| **SOC.60.01** | Multi-Timescale Performance & Catch-Up | Fable | Event-driven civic logic; zero 60 Hz polling; coarse background catch-up for remote settlement economies. | `PLANNED` |
| **SOC.60.02** | Societal State Persistence & Save Migrations | Gemini / Fable | Stable JSON save schema versioning for person identities, office appointments, and treasury balances. | `PLANNED` |
| **SOC.70.01** | Societal & Economic Verification Test Suite | Gemini | Automated test suite proving three-axis independence, office survival across death, coin conservation, and mobilization costs. | `PLANNED` |

---

## Revision Log

| Rev | Date | Change |
|:---:|:---:|:---|
| 3 | 2026-09-26 | Directive 0021-V Addendum §10 / Directive 0023-X: Added SOC.10.02 (Faction Development Plan Specification & JSON Schema) and SOC.10.03 (Nine Race Development Plan Data Slots), DEC-015, Vision V141. |
| 2 | 2026-09-25 | Adopt integer rev header and immutable ID governance. SOC.70.01 confirmed as society verification suite. Next free in SOC.70 is SOC.70.02; next free band is SOC.80. |
| 1 | 2026-09-25 | Initial release of SOC.10 through SOC.70 (Person identity, offices, currency, duties). |

