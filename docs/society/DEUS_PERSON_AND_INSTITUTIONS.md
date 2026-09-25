# DEUS — Person Identity, Faction Institutions & Societal Duty Model
**Authoritative Architectural Specification & Societal Framework**  
**Document ID:** `DEUS-SOC-SYS-v1.0`  
**Integration Authority:** Gemini / Antigravity (DEUS Coordinator)  
**Approved by Owner Directive:** 2026-09-25  

---

## 1. Executive Mandate & Canonical Principle

> **"A DEUS person is not defined by one job label. A person's economic Craft, Civic Office, and Class are independent characteristics. Their Current Duty describes only what they are doing at the present moment."**

In Project DEUS, living people are simulated entities with multi-dimensional identities, social roles, and physical capabilities. A person cannot be flattened into a single mutable string (such as `"blacksmith"` or `"soldier"`). 

### The Three Independent Identity Axes & Current Duty

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             DEUS PERSON IDENTITY                            │
├───────────────────────┬─────────────────────────────┬───────────────────────┤
│       1. CRAFT        │       2. CIVIC OFFICE       │       3. CLASS        │
│  (Economic / Trade)   │    (Societal / Political)   │  (Martial / 2014 SRD) │
├───────────────────────┼─────────────────────────────┼───────────────────────┤
│ Productive occupation │ Institutional authority and │ Trained combat, magic,│
│ and artisan skill.    │ civic responsibility granted│ and adventuring disci-│
│ Progression:          │ by the faction/society.     │ pline (Levels 1..20). │
│ Apprentice → Master   │ Exists independently of the │ Progression:          │
│                       │ current living holder.      │ 2014 SRD EXP / Levels │
└───────────────────────┴─────────────────────────────┴───────────────────────┘
                                       │
                                       ▼ Governs assignments
┌─────────────────────────────────────────────────────────────────────────────┐
│                              4. CURRENT DUTY                                │
│       (Operational State — NOT an identity axis; temporary assignment)      │
├─────────────────────────────────────────────────────────────────────────────┤
│ What the person is physically doing right now (e.g. FORGE_PICKAXES,         │
│ TREASURY_ACCOUNTS, PATROL_WALL, SLEEP, DEFEND_WEST_GATE). Reconciled by the │
│ Central Duty Scheduler based on needs, obligations, and emergencies.        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Canonical Persona Example: ALDRIC
- **Craft:** `BLACKSMITH` (Master Weaponsmith & Toolmaker)
- **Civic Office:** `TREASURER` (Member of the Faction Council)
- **Class:** `FIGHTER 3` (Veteran of early frontier skirmishes)
- **Current Duty Transitions:**
  - *Normal morning:* `FORGE_PICKAXES` (Craft work at the bloomery forge)
  - *Tax/Payroll audit:* `TREASURY_ACCOUNTS` (Reviewing faction ledger and coin reserves)
  - *Goblin breach at the palisade:* `DEFEND_WEST_GATE` (Mobilized to melee defense with shield and arming sword)
  - *Post-battle:* `SLEEP` $\rightarrow$ `FORGE_SWORDS` (Repairing damaged garrison blades)

Aldric's fundamental identities never changed; only his **Current Duty** was dynamically reprioritized.

---

## 2. Axis 1: Craft (Productive Profession & Economy)

**Craft** represents a person's normal economic vocation, trade, or productive capability within physical civilization.

### Canonical Principles
1. **Physical Production Foundation:** Crafts directly manipulate physical materials and workstations to produce resources, tools, food, clothing, housing, and infrastructure.
2. **Independent Competence Progression:** Craft proficiency develops independently from combat experience:
   $$\text{Novice / Apprentice} \longrightarrow \text{Journeyman / Competent} \longrightarrow \text{Artisan} \longrightarrow \text{Master Craftsperson}$$
   A Master Mason does not require a single level of Barbarian, and a Level 15 Wizard may be an utterly unskilled novice at carpentry.
3. **Derived from Authentic Production Chains:** The Craft catalogue is not arbitrary; it maps 1:1 to:
   - Primary resource extraction (mining, forestry, agriculture, quarrying)
   - Secondary processing (smelting, tanning, milling, weaving)
   - Finished goods crafting (2014 SRD weapons, armor, adventuring gear, furniture, containers)
   - Sustenance and services (cooking, brewing, herbalism, construction, logistics)
4. **`NONE` is Valid:** Children, infirm elders, dedicated full-time nobility/rulers, or unassigned dependents may have `Craft: NONE`.

### Core Craft Families
- **Extractive:** `FARMER`, `MINER`, `LOGGER`, `QUARRYMAN`, `HUNTER`, `FISHER`, `FORAGER`
- **Pyrometallurgical & Smiths:** `SMELTER`, `BLACKSMITH`, `ARMORER`, `WEAPONSMITH`
- **Construction & Woodcraft:** `CARPENTER`, `MASON`, `WOODCARVER`, `THATCHER`
- **Organic & Textiles:** `LEATHERWORKER`, `TANNER`, `TAILOR`, `WEAVER`, `SPINNER`
- **Sustenance & Processing:** `COOK`, `BREWER`, `MILLER`, `BUTCHER`, `BAKER`
- **Artisan & Specialized:** `POTTER`, `GLASSWORKER`, `JEWELER`, `FLETCHER`, `BOWYER`, `HERBALIST`, `ALCHEMIST`, `SCRIBE`, `MERCHANT`

---

## 3. Axis 2: Civic Office & Faction Institutions

**Civic Office** represents formal authority, public responsibility, and executive capability granted by a faction or sovereign settlement.

### The Immutable Institutional Invariant: Office Exists Independently of Holder
> **Invariant FACTION-001:** An office exists independently of its current holder. Government authority, institutional jurisdiction, and public obligations reside in the `Office` entity, NEVER solely as loose boolean flags on individual citizens.

```text
┌───────────────────────────────────────────────────────────┐
│                    OFFICE: TREASURER                      │
├───────────────────────────────────────────────────────────┤
│ Office ID:          `OFFICE_TREASURER_01`                 │
│ Faction ID:         `FACTION_HUMAN_01`                    │
│ Canonical Function: `TREASURY`                            │
│ Cultural Title:     "High Purser" / "Royal Treasurer"    │
│ Current Holder:     `Person #184` (Aldric)                │
│ Deputy / Successor: `Person #227` (Elspeth)               │
│ Authority Scope:    `[COIN_MINT, WAGE_PAY, TAX_COLLECT]`  │
│ Status:             `OCCUPIED` (or `VACANT`, `ACTING`)    │
└───────────────────────────────────────────────────────────┘
```

If Person #184 dies during a siege:
1. `OFFICE_TREASURER_01` remains intact in the faction database.
2. Its status becomes `VACANT` (or `ACTING` held by Deputy Person #227).
3. Faction payroll, tax audits, and minting authorizations suffer administrative degradation or freeze until the office is formally re-filled according to faction succession law.

### Canonical Institutional Functions vs. Cultural Titles
The underlying simulation recognizes **functional semantics**; presentation layers render **culturally appropriate titles**:

| Canonical Function | Core Jurisdictions & Responsibilities | Cultural Title Variations |
| :--- | :--- | :--- |
| **`EXECUTIVE` / `LEADER`** | Sovereign command, alliance treaties, policy charter, civic emergency decrees. | King, Chief, Jarl, Elder, Mayor, Prince, Speaker, Warlord |
| **`STEWARD` / `ADMIN`** | Internal civil administration, census, labor coordination, institutional synchronization. | High Steward, Bailiff, Seneschal, Chancellor, Factotum |
| **`TREASURER`** | Faction balance sheets, budgets, wage disbursements, tax assessment, financial audit. | Treasurer, Purser, Bursar, Coinmaster, Keeper of the Chest |
| **`MINT_MASTER`** | Metal assaying, bullion refining, official coinage standard, physical currency minting. | Mint Master, Assayer of the Realm, Moneyer |
| **`MARSHAL`** | Defense policy, garrison training, patrol routing, threat response, military mobilization. | High Marshal, Warmaster, Constable, Captain of the Guard |
| **`QUARTERMASTER`** | Physical inventory oversight, tool allocation, grain stores, armament stockpiles. | Quartermaster, Storekeeper, Castellan, Warder |
| **`MASTER_OF_WORKS`** | Public construction, fortifications, roads, bridges, drainage, aqueducts, mines. | Master of Works, Chief Architect, Overseer of Masons |
| **`PROVISIONER`** | Food security, granary reserves, hunting/harvest quotas, famine prevention. | Foodwarden, Master of Granaries, Provisioner |
| **`RECORDER`** | Civil rolls, historical chronicles, contracts, legal property deeds, casualty annals. | Keeper of Annals, Chief Scribe, Chronicler, Notary |
| **`MAGISTRATE`** | Law enforcement, trials, dispute arbitration, punishment, property claims. | Magistrate, Justiciar, Judge, Lawspeaker |
| **`HEALER_DIRECTOR`** | Public health, quarantine, contagion response, infirmary management, medicine stocks. | Chirurgeon-General, Master Apothecary, High Healer |
| **`ENVOY`** | Inter-faction diplomacy, trade caravans, tribute negotiation, boundary pacts. | Ambassador, Envoy, Herald, Emissary |
| **`TRADE_MASTER`** | Merchant market licensing, tariff collection, export/import schedules, trade posts. | Factor, Harbor Master, Master of the Guild |

---

## 4. Axis 3: Class (Canonical 2014 SRD Integration)

**Class** represents formal combat, martial discipline, magical communion, and adventuring capability.

### Strict Canonical Foundation
> **Invariant CLASS-001:** Class mechanics, class features, spell progression, hit dice, proficiencies, and archetypes derive strictly and exclusively from the **canonical 2014 SRD** located in the UF project repository. No 2024 revisions or unapproved homebrew materials may be incorporated.

### Separation from Profession
A character's Class represents their martial and supernatural capabilities when violence or adventuring occurs:
- A `FIGHTER` is not automatically an active military soldier; they may be a retired blacksmith or a farmer with veteran militia training.
- A `WIZARD` may serve as the settlement's Scribe, Recorder, or Architect.
- A `CLERIC` or `DRUID` may serve as the village Herbalist, Healer, or Agricultural Consultant.
- A `ROGUE` may be an expert locksmith, surveyor, scout, or building carpenter.
- A person may have `Class: NONE` (commoners, children, non-combatant elders).

Progression follows standard 2014 SRD levels from Level 1 up to Level 20 through combat experience, personal training, and survived historical engagements.

---

## 5. Axis 4: Current Duty (Operational State)

**Current Duty** is **NOT** an identity axis. It is a transient, scheduled operational state assigned by the **Central Duty Scheduler**.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CENTRAL DUTY SCHEDULER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ INPUTS:                                                                     │
│ - Physical Vital Needs: Hunger, thirst, fatigue, injury, sickness           │
│ - Craft Obligations: Active crafting orders, farm schedules, construction   │
│ - Civic Office Demands: Treasury audits, court trials, trade negotiations   │
│ - Military Service Status: Peacetime, patrol duty, active mobilization      │
│ - Faction Threat Level: Peace, elevated alert, active siege / raid          │
│ - Environmental Condition: Blizzards, wildfires, night curfew, flooding     │
├─────────────────────────────────────────────────────────────────────────────┤
│ ARBITRATION PRIORITY:                                                       │
│ 1. Acute Survival & Trauma (Flee death, treat fatal bleed, quench thirst)   │
│ 2. Immediate Combat Defense (Active threat within defensive perimeter)      │
│ 3. Civic Mobilization Duty (Patrol, man battlements, assemble at gate)      │
│ 4. Scheduled Civic Office Work (Minting, tax audit, treaty signing)         │
│ 5. Economic Craft Production (Forging, harvesting, carpentry, mining)       │
│ 6. Logistics & Domestic Labor (Hauling, cooking, personal maintenance)      │
│ 7. Rest, Sleep & Recreation (Beds, taverns, campfires)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ OUTPUT:                                                                     │
│ - Single Authoritative `CurrentDuty` assigned to Person Entity              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Faction Institutions & Year-0 Eight-Founder Bootstrap

Standard DEUS New Game begins at **World Year 0 (V134)** with 9 racial factions of **8 founders each = 72 colonists**.

### Minimal Eight-Founder Functional Coverage
A population of 8 colonists cannot support 14 full-time bureaucrats. Instead, **founders wear multiple hats**, holding essential civic offices while spending the vast majority of their hours performing productive Craft labor.

```text
FOUNDER A:
├── Identity:   Craft: FARMER | Office: LEADER | Class: FIGHTER 1
└── Duties:     80% Tending crops & clearing soil; 15% Settlement planning; 5% Perimeter check.

FOUNDER B:
├── Identity:   Craft: BLACKSMITH | Office: TREASURER + MINT MASTER | Class: FIGHTER 1
└── Duties:     85% Smelting & forging tools; 10% Coin counting & ledger records; 5% Militia.

FOUNDER C:
├── Identity:   Craft: CARPENTER | Office: MASTER OF WORKS | Class: ROGUE 1
└── Duties:     90% Cutting timber & building communal shelter; 10% Layout surveying.

FOUNDER D:
├── Identity:   Craft: HUNTER | Office: MARSHAL | Class: RANGER 1
└── Duties:     75% Game hunting & meat smoking; 25% Perimeter scouting & trap setting.

FOUNDER E:
├── Identity:   Craft: COOK | Office: QUARTERMASTER | Class: BARD 1
└── Duties:     80% Food preparation & butchery; 20% Central stockpile organization.

FOUNDER F:
├── Identity:   Craft: HERBALIST | Office: HEALER | Class: CLERIC 1
└── Duties:     85% Foraging medicinal roots & poultices; 15% Treating injuries.

FOUNDER G:
├── Identity:   Craft: SCRIBE | Office: STEWARD + RECORDER | Class: WIZARD 1
└── Duties:     70% Inscribing scrolls & survey maps; 30% Faction annals & stock registry.

FOUNDER H:
├── Identity:   Craft: MINER | Office: PROVISIONER | Class: BARBARIAN 1
└── Duties:     85% Excavating stone & clay; 15% Granary & root cellar maintenance.
```

*Note: The assignments above illustrate the multi-hat principle. Exact starting combinations may vary by faction culture, but all 8 core functions are guaranteed coverage.*

---

## 7. Workload-Driven Institutional Specialization

DEUS rejects arbitrary population thresholds for unlocking civic roles (e.g. "reach population 50 to unlock Tax Collector"). 

Instead, institutions specialize based on **Workload vs. Administrative Capacity**:
1. Every civic office tracks an **Administrative Workload Index**:
   $$\text{Workload} = \frac{\text{Transactions / Audits / Demands Pending}}{\text{Officer Hours Allocated}}$$
2. When Founder B's Treasury workload exceeds $100\%$ (e.g. population reaches 35, daily coin transactions and wage obligations overwhelm blacksmithing hours):
   - Faction suffers administrative lag, uncollected taxes, or delayed payroll.
   - The faction council creates institutional pressure to split off a subordinate office (e.g. appointing a dedicated `TAX_COLLECTOR`, `PAYMASTER`, or full-time `TREASURER`).
3. Society expands organically from a communal frontier camp into a complex departmental commonwealth because the physical workload demands it.

---

## 8. Physical Economy Bootstrap & Money Conservation

The DEUS economy does not magically spawn currency from an abstract game engine pool.

### Conserved Currency Lifecycle
> **Invariant ECON-001:** Minting transforms physical raw monetary metal into currency and does not create matter from nothing.
> **Invariant ECON-002:** Treasury balance (monetary wealth) and Quartermaster stores (physical material abundance) are strictly separate concepts. A faction with 10,000 gold pieces can still collapse into starvation if granaries are empty.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONSERVED PHYSICAL MONETARY CYCLE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. MINING:       Gold / Silver / Copper ore extracted from strata veins.    │
│ 2. REFINING:     Smelted into assayed metal ingots in foundry workshops.   │
│ 3. MINTING:      Mint Master strikes official physical coins (cp, sp, ep,   │
│                  gp, pp) adhering to strict weight standards. Metal is      │
│                  deducted from raw stores and added to treasury stock.      │
│ 4. PAYROLL:      Treasurer disburses coin wages to colonists for work.      │
│ 5. COMMERCE:     Colonists spend coin on private rations, gear, and goods.  │
│ 6. TAXATION:     Treasurer levies civic taxes, fees, and market tariffs.    │
│ 7. RE-TREASURY:  Collected taxes return to the central treasury chest.      │
│ 8. REMINTING:    Worn or foreign coin can be melted back into raw metal.    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Military Model: Dynamic Mobilization vs. Fixed Ratios

> **Invariant MIL-001:** DEUS rejects universal fixed military ratios (such as hardcoding 50% civilians and 50% soldiers).
> **Invariant MIL-002:** Mobilization temporarily redirects economic labor into defense. War imposes an immediate, authentic economic productivity cost.

### Military Service Status (Administrative Status)
Every citizen carries an administrative military service status:
- **`NONE`:** Non-combatants, children, infirm elders, or exempt specialists.
- **`RESERVE`:** Able-bodied civilians with basic martial training, called only during existential crises.
- **`MILITIA`:** Part-time citizen-soldiers (e.g. farmers, carpenters) mustered for local defense or periodic drills.
- **`GUARD`:** Dedicated town watch, gate sentries, and regular patrol details.
- **`PROFESSIONAL`:** Full-time standing military personnel whose primary Craft is soldiering.
- **`ELITE_RETINUE`:** Faction leader's sworn bodyguards, champion knights, or arcane battlemages.

### The Economic Cost of War
When a goblin raiding army approaches:
1. Marshal sounds the alarm and orders **Militia Mobilization**.
2. Aldric (Blacksmith) drops his hammer, equips arming sword and mail, and runs to the gate (`CurrentDuty: DEFEND_GATE`).
3. Elspeth (Farmer) leaves the unharvested barley to man the parapet.
4. **Economic Consequence:** For the 3 days of siege, **tool production drops to zero** and **crops rot in the field**. Factions cannot sustain prolonged mobilizations without risking winter famine and economic insolvency.

---

## 10. Command Mode Integration

The Three-Axis Person and Faction Institution model forms the operational foundation of **DEUS Command Mode**:
- In early frontier stages, the player or leader directs individual colonists directly.
- As settlements grow, the player issues **High-Level Faction Directives** through the institutional hierarchy:
  - Policy: *"Construct Northern Stone Redoubt."*
  - $\rightarrow$ **Master of Works** breaks project into blueprint modules, masonry labor, and site grading.
  - $\rightarrow$ **Quartermaster** reserves granite blocks, mortar, and chisels from stockpiles.
  - $\rightarrow$ **Treasurer** earmarks wage payroll for construction shifts.
  - $\rightarrow$ **Marshal** details a guard squad to secure the worksite against beast attacks.
  - $\rightarrow$ **Masons and Laborers** receive work orders via their Central Duty Scheduler.

---

## 11. Multi-Timescale Performance Architecture Compliance

Institutions and person states must comply strictly with [`docs/PERFORMANCE_ARCHITECTURE.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/PERFORMANCE_ARCHITECTURE.md):
- **Zero Recurring 60 Hz Bureaucracy:** The engine never polls civic offices, payrolls, or tax ledgers every frame.
- **Event-Driven Institutional Transitions:** Appointment changes, deaths, vacancies, and mobilizations trigger purely on discrete events.
- **Multi-Timescale Economic Ticks:**
  - Kinematics & pathing: Tier A (visible, 60 Hz).
  - Craft production & duty execution: Scheduled seconds/minutes.
  - Wage payroll & daily ledger reconciliation: Daily evening tick.
  - Tax assessment & institutional audits: Weekly / monthly scheduled passes.
  - Offscreen / remote settlements: Coarse statistical catch-up ticks.

---

## 12. Complete Society Work Breakdown Structure (SOC Branches)

To maintain clean separation between physical world generation and social/economic simulation, all societal, institutional, and economic leaves are catalogued in the dedicated **`SOC` Work Breakdown Structure**:

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

## 13. Canonical Invariants Reserved

The following formal invariants are registered in [`docs/INVARIANT_REGISTRY.md`](file:///c:/Users/snewt/OneDrive/Desktop/UF/docs/INVARIANT_REGISTRY.md):

1. **`INV-SOC-01` (`PERSON-001`):** Craft, Civic Office, and Class are independent long-term identity axes. Progress or changes in one axis do not automatically modify another.
2. **`INV-SOC-02` (`PERSON-002`):** Current Duty describes temporary operational assignments, not identity.
3. **`INV-SOC-03` (`FACTION-001`):** An office exists independently of its current holder. Deaths leave offices vacant; authority is not tied to mutable person structs.
4. **`INV-SOC-04` (`FACTION-002`):** Small factions may combine multiple civic functions into one person; institutional growth splits functions driven by workload.
5. **`INV-SOC-05` (`ECON-001`):** Minting transforms physical raw monetary metal into currency and does not create matter from nothing.
6. **`INV-SOC-06` (`ECON-002`):** Treasury balance (monetary wealth) and Quartermaster stores (physical material abundance) are strictly separate concepts.
7. **`INV-SOC-07` (`MIL-001`):** DEUS does not require a universal fixed civilian/military population ratio.
8. **`INV-SOC-08` (`MIL-002`):** Mobilization temporarily redirects economic labor into defense at an authentic economic productivity cost.
9. **`INV-SOC-09` (`CLASS-001`):** Canonical Class definitions derive strictly from the exact 2014 SRD located in the UF project repository.
