# Emergent society — implementation direction, 2026-09-19

User-requested scope: factions build, survive, organize, expand and militarize; people form families, reproduce, grow old and die; homes acquire rooms, beds, cooking, dining and storage; professions and goods become more sophisticated. Personal tastes, whims and needs shape culture across generations. Each faction has distinctive mechanics. Every creature has capability-appropriate short-, medium- and long-term goals.

Further user requests in the same session: social interactions, wants/needs-driven trade; possible theft, internal conflict, justice and law enforcement; confusion, adult infidelity, uncertain parentage and drama within faction warfare; education, religion, love, dating, restaurants, decorations, art and city design.

This document records requested direction, **not implemented features or slice approval**. Existing slice gates and asset approval remain. The user explicitly transferred Colonists' family/housing/planning hooks to Codex; unrelated active claims still apply.

## One causal chain

An individual need or preference creates a goal. A household or faction combines compatible demands into a project. The project uses actual jobs and actual materials. Completed work changes living conditions and relationships, teaches skills/practices, and creates new possibilities. Children inherit influences and opportunities, not their parents' skill levels or predetermined lives.

Examples of the intended later chain: a growing family wants privacy → another bedroom → more furniture and skilled carpentry → apprentices → a workshop and surplus goods → customers and trade → public streets/markets/services. Regular shared cooking may support a restaurant; a restaurant needs cooks, food supply, storage, tables, seats, customers and exchanges. Merely putting a restaurant label on a campfire is not implementation.

## First bounded implementation

- Persistent households, actual parent links and generation records. Cohabitation, partnership and biological ancestry remain different concepts.
- Small reserved two-room homes made with existing walls/doors/beds/campfire/storage through normal gathering, hauling and building jobs. Exact-cell completion and safe access matter; a bed elsewhere cannot satisfy another household's demand.
- Three-horizon personal goal records, capability checks, real progress, and a real adapter into settlement jobs. Existing wildlife behavior remains with its owner; observational animal goal records are not a replacement animal AI.
- Learned personal preferences and faction practices, inherited influence with individual variation, and bounded faction-specific planning policies using available production chains.
- Adult-only willing, compatible, unrelated partnership/reproduction prerequisites. Privacy means a finished room with a door and no other occupants; unknown age or a teen life stage is not adulthood. Children receive age-appropriate activities, never adult relationship goals.

No house, equipment, resource or baby may be invented merely to complete a goal counter. No NPC may claim a goal completed based only on elapsed time, a plan flag or an attempted job. Unreachable or unsupported goals remain blocked with an explanation and bounded retries.

## Increasing complexity without invulnerability

Working interpretation to confirm through play: accumulated knowledge, discovered recipes, professional traditions and organizational achievements persist. Buildings can burn, people can die, families can move and settlements can fail. Those losses do not automatically erase learned knowledge. New generations can rebuild from what survives, while population or material shortages still constrain execution.

Survival overrides ambitions; explicit player orders and immediate danger take priority. Long-term projects should not be starved forever by an endlessly recurring food-stock target. Decisions are bounded and all five levels retain coordinates/state. There is no free construction, resource duplication or view-dependent pause.

## Social knowledge and drama (requested; later implementation)

Separate:

1. World truth: event participants, actual ancestry, item transfers, damage and death.
2. Individual knowledge/belief: witness, hearsay, confidence, source, time and later correction.
3. Public claims/evidence: allegations, testimony, corroboration and contradictory accounts.

Do not make every actor omniscient. An accusation is not proof; inherited family membership is not proof of biological ancestry. Adult relationship agreements and perceived violations may differ between households/cultures. No graphic sexual content is needed for love, dating, pregnancy, infidelity or disputed parentage. Children are family members with care and education needs, not participants in adult relationship behavior.

Social bonds need both positive and negative changes, memory limits and context. Friendship, affection, trust, grievance and authority are not one universal score. Do not conflate rivalry with criminality or assign guilt from species/faction membership.

## Trade, conflict and institutions (requested; later implementation)

- Trade arises from demand plus genuine surplus. Partners assess offers; items remain owned and physically carried. Exchange must revalidate quantities, ownership, location and willingness at delivery, then commit both sides without duplication or half-transactions.
- Theft must be a distinct unauthorized action with motive/risk, possible witnesses and consequences—not the ordinary resource planner silently taking any nearby item.
- Justice needs laws, jurisdiction, evidence, adjudication and proportional enforcement. Detention, restitution and competing accounts need real state and actions. No omniscient automatic punishment on a rumor.
- Military organization needs equipment, supply, training, command and physical combat. Professional soldiers cannot be labels on unarmed workers.
- Education needs teachers, learners, time, access and actual learning. Apprenticeship exposure is not free skill experience or copied mastery.
- Religion and other institutions should be generated from approved thematic content and actor beliefs/practices. Do not add unapproved named gods, doctrines, lore or real-world stereotypes.

## Homes, services and city design (requested; later implementation)

- Homes grow from sleeping/privacy/sanitation/food/storage demands. Kitchens, dining rooms, nurseries and workshops require usable furniture and access.
- Restaurants need seating, service, cooking/food supply, customers and exchange; dating and social visits use suitable public/private places and mutual willingness.
- Decorations and art express individual and shared preferences, require artisans/materials, occupy real space, can be owned/traded, and contribute to satisfaction or prestige through use/observation.
- Streets, entrances, communal spaces and expansion reserves must be planned together so new rooms do not trap people or sever routes. Traffic, water, hazards and available buildable ground constrain the town's shape.
- Windows, locks, keys, dining furniture and containers depend on their real catalog/interaction implementations. Current missing content must stay explicitly unsupported; do not repurpose an unrelated object and claim the feature exists.

## Food production, layer economies and remembrance (user additions, 2026-09-19)

Requested, not implemented by this document: agriculture, farms, fields, farmers, dairy, eggs, chickens, markets and equivalent underground production. Every world layer must have some exclusive content. Exclusive resources/crops/species need explicit allowed-layer data shared by world generation, replenishment and farming; moving the camera must not bypass habitat restrictions. Underground crops need their own inputs and growth conditions, not surface sunlight rules with a renamed sprite. Upper-layer exclusives must likewise respect actual supported terrain and climate. Exact new species, goods and artwork remain content-owner work; do not invent a completed catalog in a design note.

Implementation sequence after the active housing/profile/fire/access checkpoint:

1. Physical plots with suitable soil/light/moisture, planting stock, tending, timed crop growth and real harvest yields. Demand chooses field size; farmers perform jobs. No output from an unbuilt farm label.
2. Animal care: pasture/enclosure space, feed/water, adult/female/lifecycle-appropriate milk and egg production, collection, breeding and offspring. Chickens, dairy animals and subterranean equivalents use actual creature records; no infinite free egg/milk timer independent of livestock.
3. Processing, storage and markets: food safety/spoilage as supported, transport, surplus, demand, ownership and atomic trade. A marketplace needs working producers and exchange, not merely stalls.
4. Death care: an identified body/remains record, family/faction claim, respectful hauling, a dug/built burial place, grave marker and persistent deceased identity. Graveyards reserve accessible space and permit mourning/visits. No vanished corpse counted as buried or duplicate person/remains after save/load.
5. Beliefs and religion: personal beliefs, shared practices, observances, places and roles emerge through social transmission and history. Funerals can be religious or nonreligious; faction rituals can differ. Grief and remembrance link to actual relationships and events. Do not invent approved gods, doctrines or universal funeral customs.

All five maps must advance crop growth, husbandry, food demand and remains state while off screen. Test each chain with real jobs, negative prerequisites, save/load and representative layer-exclusive refusal. Religious meaning and NPC beliefs remain separate from world truth.

## Faction identity versus learned culture

Capabilities and distinctive mechanics constrain the possible: habitat, lifecycle, bodily/tool requirements and faction institutions. Learned practices describe what this specific community repeatedly does and teaches. Two factions of the same people must be able to diverge, and members retain personal variation.

The live catalog currently exposes seven cultures; the eleven approved peoples' special life cycles remain a separate implementation dependency. Planner policies are a first mechanical distinction, not a claim that hive reproduction, egg incubation, undead creation or every future technology tree works.

## Next acceptance gates

### Natural underground access (user addition, 2026-09-19)

The generated world must include natural travel connections from Ground (z=0) to z=-1 and from z=-1 to z=-2. These are paired entrances/passages with reachable, supported endpoints, not merely the camera's layer toggle. Reuse the existing vertical travel/link registry and preserve both endpoints in saves. Do not cut routes through inhabited buildings or silently teleport between arbitrary map cells. Placement must respect the mostly-earth underground topology and coexist with later creature-built stairs/ladders. Implementation and tests are separate from the household foundation; do not claim that pre-existing camera switching supplies this feature.

The first runtime fixture must show actual family-linked demand producing built walls, a door and assigned beds; adding a child increases demand only in that household; unrelated beds/blocked targets cannot fake completion; own-level NPC homes and saves stay isolated. Personal goals must create physical craft/build work, and disabling the adapter must fail the test. Safety/explicit orders must still win. Culture tests must demonstrate lasting evidence-driven practice, distinct policy choices and nonidentical inherited preferences. Screenshots and editor Playtest remain separate gates.
