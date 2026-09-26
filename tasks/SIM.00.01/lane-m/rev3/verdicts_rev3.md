# ADR-003 Rev 3 citation verdicts at b612bc72

Input: `cites_rev3_at_b612bc72.md` / `cites_rev3_final.json` (the final Rev 3 text, dumped by `../cite_check.js`).

Each citation's verdict has one of three sources:
- **R2 <id>**: identical to a Rev 2 citation (same file, same span, same ADR line text), so it takes that citation's verdict from `verdicts_rev2.md`. Every inherited verdict is TRUE, because every non-TRUE Rev 2 citation was rewritten.
- **A <id>**: judged by one of four read-only sub-agents on the Rev 3 text before the final edits (slices in `slices/`, ids of that snapshot, `cites_rev3_snapshot_judged.json`). The first pass gave 282 TRUE and 4 IMPRECISE. The 4 were fixed, and their lines are now in group W:
  - C235: band status: the text now quotes DEC-013 and the brief separately;
  - C355: Q14 overstated DEC-014's keys;
  - C372: a bare `:247` resolved to the WBS;
  - C495: Fluid `:173` allocates nothing.
- **W**: on a line the writer edited after that snapshot. The writer printed each cited span at b612bc72 and checked it: 35 on lines edited after the sub-agents' verdicts, and 14 in the change-log rows, whose text changed when the line numbers were filled in.

This file records the checks. It does not certify them; the independent review samples them.

Totals: TRUE 646, IMPRECISE 0, FALSE 0 (of 646). Sources: R2 350, A 247, W 49.

| id | ADR line | citation | verdict | source |
|---|---:|---|---|---|
| C001 | 14 | `docs/OWNER_DECISIONS.md:161-168` | TRUE | A C001 |
| C002 | 16 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:519` | TRUE | A C002 |
| C003 | 35 | `game/js/plugins/DEUS_Levels.js:985-986` | TRUE | W |
| C004 | 35 | `game/js/plugins/DEUS_Levels.js:1790-1791` | TRUE | W |
| C005 | 40 | `game/js/plugins/DEUS_Levels.js:1783-1794` | TRUE | W |
| C006 | 40 | `game/js/plugins/DEUS_Levels.js:1795` | TRUE | W |
| C007 | 40 | `game/js/plugins/DEUS_Levels.js:1815` | TRUE | W |
| C008 | 40 | `game/js/plugins/DEUS_Levels.js:1849` | TRUE | W |
| C009 | 40 | `game/js/plugins/DEUS_Levels.js:1709-1725` | TRUE | W |
| C010 | 41 | `game/js/plugins/DEUS_Ecology.js:876` | TRUE | W |
| C011 | 41 | `game/js/plugins/DEUS_Ecology.js:888-905` | TRUE | W |
| C012 | 41 | `game/js/plugins/DEUS_Ecology.js:907-914` | TRUE | W |
| C013 | 41 | `game/js/plugins/DEUS_Ecology.js:22-27` | TRUE | W |
| C014 | 42 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:519` @b612bc72 | TRUE | W |
| C015 | 43 | `game/js/plugins/DEUS_Factions.js:632` | TRUE | W |
| C016 | 46 | `game/js/plugins/DEUS_Factions.js:619-625` | TRUE | W |
| C017 | 132 | `game/js/rmmz_managers.js:1982-1991` | TRUE | R2 C003 |
| C018 | 133 | `game/js/rmmz_managers.js:1993-2010` | TRUE | R2 C004 |
| C019 | 136 | `game/js/rmmz_managers.js:2102-2112` | TRUE | R2 C005 |
| C020 | 136 | `game/js/rmmz_managers.js:2146` | TRUE | R2 C006 |
| C021 | 136 | `game/js/rmmz_managers.js:2157-2165` | TRUE | R2 C007 |
| C022 | 137 | `game/js/rmmz_scenes.js:819-831` | TRUE | A C022 |
| C023 | 137 | `game/js/rmmz_scenes.js:824` | TRUE | A C023 |
| C024 | 137 | `game/js/rmmz_scenes.js:833-839` | TRUE | A C024 |
| C025 | 137 | `game/js/rmmz_scenes.js:841-846` | TRUE | A C025 |
| C026 | 141 | `game/js/plugins/DEUS_Core.js:74-98` | TRUE | R2 C011 |
| C027 | 142 | `game/js/plugins/DEUS_Jobs.js:1778` | TRUE | R2 C012 |
| C028 | 145 | `game/js/plugins/DEUS_TimeSpeed.js:147-153` | TRUE | R2 C013 |
| C029 | 145 | `game/js/plugins/DEUS_TimeSpeed.js:158-173` | TRUE | R2 C014 |
| C030 | 146 | `game/js/plugins/DEUS_TimeSpeed.js:45-50` | TRUE | R2 C015 |
| C031 | 148 | `game/js/plugins/DEUS_TimeSpeed.js:231-241` | TRUE | R2 C016 |
| C032 | 148 | `game/js/plugins.js:184` | TRUE | R2 C017 |
| C033 | 148 | `game/js/plugins/DEUS_Levels.js:4287` | TRUE | R2 C018 |
| C034 | 148 | `game/js/plugins/DEUS_NaturalConnections.js:508` | TRUE | R2 C019 |
| C035 | 148 | `game/js/plugins/DEUS_Depth.js:834` | TRUE | R2 C020 |
| C036 | 150 | `game/js/plugins/DEUS_TimeSpeed.js:209-217` | TRUE | R2 C021 |
| C037 | 153 | `game/js/plugins/DEUS_Core.js:60-62` | TRUE | R2 C022 |
| C038 | 153 | `game/js/plugins/DEUS_Core.js:304-311` | TRUE | R2 C023 |
| C039 | 153 | `game/js/plugins/DEUS_Core.js:376-378` | TRUE | R2 C024 |
| C040 | 155 | `game/js/plugins/DEUS_Core.js:505-510` | TRUE | R2 C025 |
| C041 | 155 | `game/js/plugins/DEUS_TimeSpeed.js:236` | TRUE | R2 C026 |
| C042 | 156 | `game/js/plugins/DEUS_Core.js:305` | TRUE | R2 C027 |
| C043 | 157 | `game/js/plugins/DEUS_Core.js:321-325` | TRUE | R2 C028 |
| C044 | 157 | `docs/systems/UF_History.md:1161` | TRUE | R2 C029 |
| C045 | 160 | `game/js/plugins/DEUS_Colonists.js:48` | TRUE | R2 C030 |
| C046 | 161 | `game/js/plugins/DEUS_Environment.js:52` | TRUE | R2 C031 |
| C047 | 162 | `game/js/plugins/DEUS_TimeSpeed.js:33` | TRUE | R2 C032 |
| C048 | 164 | `docs/ARCHITECTURE.md:18` | TRUE | R2 C033 |
| C049 | 167 | `game/js/plugins/DEUS_Ecology.js:994` | TRUE | R2 C034 |
| C050 | 167 | `game/js/plugins/DEUS_Colonists.js:5750` | TRUE | R2 C035 |
| C051 | 174 | `game/js/plugins/DEUS_World.js:2932` | TRUE | R2 C036 |
| C052 | 174 | `game/js/plugins/DEUS_World.js:1677-1702` | TRUE | R2 C037 |
| C053 | 175 | `game/js/plugins/DEUS_Fluid.js:1016` | TRUE | R2 C038 |
| C054 | 175 | `game/js/plugins/DEUS_Fluid.js:731-752` | TRUE | R2 C039 |
| C055 | 175 | `game/js/plugins/DEUS_Fluid.js:55` | TRUE | R2 C040 |
| C056 | 176 | `game/js/plugins/DEUS_Ecology.js:992` | TRUE | R2 C041 |
| C057 | 176 | `game/js/plugins/DEUS_Ecology.js:764-872` | TRUE | R2 C042 |
| C058 | 176 | `game/js/plugins/DEUS_Ecology.js:994-999` | TRUE | R2 C043 |
| C059 | 177 | `game/js/plugins/DEUS_Fire.js:617` | TRUE | R2 C044 |
| C060 | 177 | `game/js/plugins/DEUS_Fire.js:138-140` | TRUE | R2 C045 |
| C061 | 178 | `game/js/plugins/DEUS_Environment.js:796` | TRUE | R2 C046 |
| C062 | 178 | `game/js/plugins/DEUS_Environment.js:690-710` | TRUE | R2 C047 |
| C063 | 178 | `game/js/plugins/DEUS_Environment.js:730-744` | TRUE | R2 C048 |
| C064 | 179 | `game/js/plugins/DEUS_Colonists.js:5748` | TRUE | R2 C049 |
| C065 | 179 | `game/js/plugins/DEUS_Colonists.js:48` | TRUE | R2 C050 |
| C066 | 179 | `game/js/plugins/DEUS_Colonists.js:63` | TRUE | R2 C051 |
| C067 | 179 | `game/js/plugins/DEUS_Colonists.js:5750` | TRUE | R2 C052 |
| C068 | 180 | `game/js/plugins/DEUS_Jobs.js:1777` | TRUE | R2 C053 |
| C069 | 181 | `game/js/plugins/DEUS_Projects.js:1596` | TRUE | R2 C054 |
| C070 | 181 | `game/js/plugins/DEUS_Projects.js:38` | TRUE | R2 C055 |
| C071 | 182 | `game/js/plugins/DEUS_Combat.js:1414` | TRUE | R2 C056 |
| C072 | 183 | `game/js/plugins/DEUS_Factions.js:657` | TRUE | A C072 |
| C073 | 183 | `game/js/plugins/DEUS_Factions.js:632` | TRUE | A C073 |
| C074 | 184 | `game/js/plugins/DEUS_Ownership.js:613` | TRUE | R2 C059 |
| C075 | 185 | `game/js/plugins/DEUS_TimeSpeed.js:189` | TRUE | R2 C060 |
| C076 | 186 | `game/js/plugins/DEUS_Anim.js:1506` | TRUE | R2 C061 |
| C077 | 186 | `game/js/plugins/DEUS_Anim.js:1509-1522` | TRUE | R2 C062 |
| C078 | 187 | `game/js/plugins/DEUS_Fog.js:638` | TRUE | R2 C063 |
| C079 | 187 | `game/js/plugins/DEUS_Fog.js:510-518` | TRUE | R2 C064 |
| C080 | 187 | `game/js/plugins/DEUS_Fog.js:53` | TRUE | R2 C065 |
| C081 | 188 | `game/js/plugins/DEUS_Wildlife.js:1195` | TRUE | R2 C066 |
| C082 | 188 | `game/js/plugins/DEUS_Wildlife.js:1197` | TRUE | R2 C067 |
| C083 | 189 | `game/js/plugins/DEUS_Core.js:505` | TRUE | R2 C068 |
| C084 | 190 | `game/js/plugins/DEUS_Core.js:175` | TRUE | R2 C069 |
| C085 | 191 | `game/js/plugins/DEUS_NaturalConnections.js:508` | TRUE | R2 C070 |
| C086 | 191 | `game/js/plugins/DEUS_NaturalConnections.js:512-515` | TRUE | R2 C071 |
| C087 | 192 | `game/js/plugins/DEUS_TimeSpeed.js:232` | TRUE | R2 C072 |
| C088 | 193 | `game/js/plugins/DEUS_Combat.js:1479` | TRUE | R2 C073 |
| C089 | 194 | `game/js/plugins/DEUS_Factions.js:751` | TRUE | R2 C074 |
| C090 | 194 | `game/js/plugins/DEUS_Factions.js:1156` | TRUE | R2 C075 |
| C091 | 195 | `game/js/plugins/DEUS_History.js:3662` | TRUE | R2 C076 |
| C092 | 195 | `game/js/plugins/DEUS_History.js:3780` | TRUE | R2 C077 |
| C093 | 196 | `game/js/plugins/DEUS_Levels.js:4287` | TRUE | R2 C078 |
| C094 | 197 | `game/js/plugins/DEUS_Depth.js:834` | TRUE | R2 C079 |
| C095 | 198 | `game/js/plugins/DEUS_ColonyOverseer.js:196` | TRUE | R2 C080 |
| C096 | 198 | `game/js/plugins/DEUS_Containers.js:1323` | TRUE | R2 C081 |
| C097 | 198 | `game/js/plugins/DEUS_Interact.js:885` | TRUE | R2 C082 |
| C098 | 198 | `game/js/plugins/DEUS_Select.js:2289` | TRUE | R2 C083 |
| C099 | 198 | `game/js/plugins/DEUS_Sheet.js:2252` | TRUE | R2 C084 |
| C100 | 198 | `game/js/plugins/DEUS_Talk.js:1938` | TRUE | R2 C085 |
| C101 | 204 | `game/js/plugins/DEUS_World.js:1677-1702` | TRUE | R2 C086 |
| C102 | 205 | `game/js/plugins/DEUS_World.js:1686-1698` | TRUE | R2 C087 |
| C103 | 205 | `game/js/plugins/DEUS_World.js:1633-1675` | TRUE | R2 C088 |
| C104 | 205 | `game/js/plugins/DEUS_World.js:140` | TRUE | R2 C089 |
| C105 | 206 | `game/js/plugins/DEUS_World.js:136` | TRUE | R2 C090 |
| C106 | 206 | `game/js/plugins/DEUS_World.js:1689` | TRUE | R2 C091 |
| C107 | 206 | `game/js/plugins/DEUS_World.js:1699-1701` | TRUE | R2 C092 |
| C108 | 206 | `game/js/plugins/DEUS_World.js:1613-1628` | TRUE | R2 C093 |
| C109 | 208 | `game/js/plugins/DEUS_World.js:847-855` | TRUE | R2 C094 |
| C110 | 208 | `game/js/rmmz_objects.js:7062-7064` | TRUE | R2 C095 |
| C111 | 211 | `game/js/plugins/DEUS_World.js:888-911` | TRUE | A C111 |
| C112 | 214 | `game/js/plugins/DEUS_Fluid.js:737-745` | TRUE | R2 C097 |
| C113 | 215 | `game/js/plugins/DEUS_World.js:127-128` | TRUE | W |
| C114 | 215 | `game/js/plugins.js:58` | TRUE | W |
| C115 | 215 | `game/js/plugins/DEUS_Fluid.js:356-376` | TRUE | W |
| C116 | 215 | `game/js/plugins/DEUS_Fluid.js:381-383` | TRUE | W |
| C117 | 218 | `game/js/plugins/DEUS_Ecology.js:876` | TRUE | A C117 |
| C118 | 218 | `game/js/plugins/DEUS_Ecology.js:888-905` | TRUE | A C118 |
| C119 | 218 | `game/js/plugins/DEUS_Ecology.js:878-886` | TRUE | A C119 |
| C120 | 218 | `game/js/plugins/DEUS_Ecology.js:45` | TRUE | A C120 |
| C121 | 218 | `game/js/plugins/DEUS_Ecology.js:907-914` | TRUE | A C121 |
| C122 | 218 | `game/js/plugins/DEUS_Ecology.js:22-27` | TRUE | A C122 |
| C123 | 220 | `game/js/plugins/DEUS_World.js:531-532` | TRUE | W |
| C124 | 220 | `game/js/plugins/DEUS_World.js:106-108` | TRUE | W |
| C125 | 221 | `game/js/plugins/DEUS_Ecology.js:803` | TRUE | R2 C106 |
| C126 | 222 | `game/js/plugins/DEUS_Ecology.js:452-453` | TRUE | R2 C107 |
| C127 | 224 | `game/js/plugins/DEUS_Fire.js:488-494` | TRUE | R2 C108 |
| C128 | 224 | `game/js/plugins/DEUS_Fire.js:562-588` | TRUE | R2 C109 |
| C129 | 227 | `game/js/plugins/DEUS_Sheet.js:833-846` | TRUE | R2 C110 |
| C130 | 228 | `game/js/plugins/DEUS_Anim.js:702` | TRUE | R2 C111 |
| C131 | 228 | `game/js/plugins/DEUS_Anim.js:714` | TRUE | R2 C112 |
| C132 | 228 | `game/js/plugins/DEUS_Anim.js:1504-1522` | TRUE | R2 C113 |
| C133 | 228 | `game/js/plugins/DEUS_Anim.js:1605-1631` | TRUE | R2 C114 |
| C134 | 228 | `game/js/plugins/DEUS_Anim.js:1624` | TRUE | R2 C115 |
| C135 | 229 | `game/js/plugins/DEUS_Culling.js:292-307` | TRUE | R2 C116 |
| C136 | 230 | `game/js/plugins/DEUS_Tiles.js:505-512` | TRUE | R2 C117 |
| C137 | 230 | `game/js/plugins/DEUS_Tiles.js:1247-1256` | TRUE | R2 C118 |
| C138 | 231 | `game/js/plugins/DEUS_Camera.js:85-93` | TRUE | R2 C119 |
| C139 | 231 | `game/js/rmmz_objects.js:9220-9224` | TRUE | R2 C120 |
| C140 | 234 | `game/js/plugins/DEUS_World.js:599-689` | TRUE | W |
| C141 | 234 | `game/js/plugins/DEUS_World.js:800-809` | TRUE | W |
| C142 | 234 | `game/js/plugins/DEUS_World.js:811-822` | TRUE | W |
| C143 | 235 | `game/js/plugins/DEUS_World.js:2819-2820` | TRUE | R2 C124 |
| C144 | 236 | `game/js/plugins/DEUS_World.js:535-539` | TRUE | R2 C125 |
| C145 | 236 | `game/js/plugins/DEUS_Levels.js:4179-4193` | TRUE | R2 C126 |
| C146 | 236 | `game/js/plugins/DEUS_World.js:2724-2730` | TRUE | R2 C127 |
| C147 | 240 | `game/js/plugins/DEUS_NaturalConnections.js:312-329` | TRUE | R2 C128 |
| C148 | 240 | `game/js/plugins/DEUS_NaturalConnections.js:352-353` | TRUE | R2 C129 |
| C149 | 241 | `game/js/plugins/DEUS_Fluid.js:896-923` | TRUE | R2 C130 |
| C150 | 242 | `game/js/plugins/DEUS_Ecology.js:736-752` | TRUE | R2 C131 |
| C151 | 242 | `game/js/plugins/DEUS_Ecology.js:20` | TRUE | R2 C132 |
| C152 | 242 | `docs/INVARIANT_REGISTRY.md:53` | TRUE | R2 C133 |
| C153 | 243 | `game/js/plugins/DEUS_Levels.js:1700-1702` | TRUE | R2 C134 |
| C154 | 243 | `game/js/plugins/DEUS_Levels.js:1720-1722` | TRUE | R2 C135 |
| C155 | 243 | `game/js/plugins/DEUS_Levels.js:1001-1002` | TRUE | R2 C136 |
| C156 | 243 | `docs/RISK_REGISTER.md:60` | TRUE | R2 C137 |
| C157 | 246 | `game/js/plugins/DEUS_Colonists.js:648-670` | TRUE | R2 C138 |
| C158 | 249 | `game/js/plugins/DEUS_Factions.js:594-625` | TRUE | A C158 |
| C159 | 249 | `game/js/plugins/DEUS_Factions.js:620` | TRUE | A C159 |
| C160 | 251 | `game/js/plugins/DEUS_Core.js:448-468` | TRUE | R2 C140 |
| C161 | 252 | `game/js/plugins/DEUS_Fluid.js:846-866` | TRUE | R2 C141 |
| C162 | 253 | `game/js/plugins/DEUS_World.js:2915` | TRUE | R2 C142 |
| C163 | 254 | `game/js/plugins/DEUS_TimeSpeed.js:54` | TRUE | R2 C143 |
| C164 | 254 | `game/js/plugins/DEUS_TimeSpeed.js:84-95` | TRUE | R2 C144 |
| C165 | 259 | `game/js/plugins/DEUS_World.js:187-211` | TRUE | R2 C145 |
| C166 | 260 | `game/js/plugins/DEUS_World.js:545-548` | TRUE | R2 C146 |
| C167 | 261 | `game/js/plugins/DEUS_World.js:556` | TRUE | R2 C147 |
| C168 | 263 | `game/js/plugins/DEUS_World.js:429` | TRUE | R2 C148 |
| C169 | 263 | `game/js/plugins/DEUS_World.js:1133` | TRUE | R2 C149 |
| C170 | 264 | `game/js/plugins/DEUS_Items.js:304` | TRUE | R2 C150 |
| C171 | 265 | `game/js/plugins/DEUS_Jobs.js:101-107` | TRUE | R2 C151 |
| C172 | 266 | `game/js/plugins/DEUS_Fire.js:214` | TRUE | R2 C152 |
| C173 | 267 | `game/js/plugins/DEUS_Fluid.js:50` | TRUE | A C173 |
| C174 | 267 | `game/js/plugins/DEUS_Fluid.js:127-137` | TRUE | A C174 |
| C175 | 267 | `game/js/plugins/DEUS_Fluid.js:179` | TRUE | A C175 |
| C176 | 267 | `game/js/plugins/DEUS_Fluid.js:187-189` | TRUE | A C176 |
| C177 | 267 | `game/js/plugins/DEUS_Fluid.js:55` | TRUE | A C177 |
| C178 | 267 | `game/js/plugins/DEUS_Fluid.js:356-376` | TRUE | A C178 |
| C179 | 270 | `tools/test_liquid_depth_simulation.js:121-125` | TRUE | R2 C157 |
| C180 | 270 | `game/js/plugins/DEUS_Fluid.js:1025-1026` | TRUE | R2 C158 |
| C181 | 271 | `tools/bench_history_sim.js:13` | TRUE | R2 C159 |
| C182 | 271 | `tools/bench_history_sim.js:37-122` @ebeec892 | TRUE | R2 C160 |
| C183 | 271 | `tools/bench_history_sim.js:66-67` @ebeec892 | TRUE | R2 C161 |
| C184 | 304 | `game/js/plugins/DEUS_Fog.js:119` | TRUE | R2 C162 |
| C185 | 304 | `game/js/plugins/DEUS_Minimap.js:840-843` | TRUE | R2 C163 |
| C186 | 304 | `game/js/plugins/DEUS_Select.js:321` | TRUE | R2 C164 |
| C187 | 304 | `game/js/plugins/DEUS_Select.js:3411` | TRUE | R2 C165 |
| C188 | 304 | `game/js/plugins/DEUS_Levels.js:4203-4204` | TRUE | R2 C166 |
| C189 | 305 | `game/js/plugins/DEUS_DayNight.js:121-127` | TRUE | R2 C167 |
| C190 | 305 | `game/js/plugins/DEUS_Environment.js:690-710` | TRUE | R2 C168 |
| C191 | 338 | `game/js/plugins/DEUS_World.js:187-211` | TRUE | R2 C169 |
| C192 | 341 | `game/js/rmmz_core.js:2672` | TRUE | R2 C170 |
| C193 | 341 | `game/js/rmmz_core.js:2682` | TRUE | R2 C171 |
| C194 | 341 | `game/js/rmmz_core.js:2694` | TRUE | R2 C172 |
| C195 | 341 | `game/js/rmmz_core.js:2726` | TRUE | R2 C173 |
| C196 | 341 | `game/js/rmmz_core.js:2793` | TRUE | R2 C174 |
| C197 | 366 | `tools/bench_history_sim.js:66-67` | TRUE | R2 C175 |
| C198 | 367 | `game/js/plugins/DEUS_Core.js:98` | TRUE | R2 C176 |
| C199 | 384 | `docs/INVARIANT_REGISTRY.md:52` | TRUE | R2 C177 |
| C200 | 409 | `docs/ARCHITECTURE.md:18` | TRUE | R2 C178 |
| C201 | 414 | `game/js/plugins/DEUS_Core.js:60-61` | TRUE | R2 C179 |
| C202 | 424 | `game/js/plugins/DEUS_Core.js:321-325` | TRUE | R2 C180 |
| C203 | 430 | `game/js/plugins/DEUS_World.js:136` | TRUE | R2 C181 |
| C204 | 431 | `game/js/plugins/DEUS_World.js:140` | TRUE | R2 C182 |
| C205 | 432 | `game/js/plugins/DEUS_Ecology.js:996` | TRUE | R2 C183 |
| C206 | 433 | `game/js/plugins/DEUS_Fire.js:138-140` | TRUE | R2 C184 |
| C207 | 434 | `game/js/plugins/DEUS_Environment.js:52` | TRUE | R2 C185 |
| C208 | 435 | `game/js/plugins/DEUS_Colonists.js:48` | TRUE | R2 C186 |
| C209 | 435 | `game/js/plugins/DEUS_Colonists.js:63` | TRUE | R2 C187 |
| C210 | 436 | `game/js/plugins/DEUS_Factions.js:632` | TRUE | A C210 |
| C211 | 437 | `game/js/plugins/DEUS_NaturalConnections.js:512` | TRUE | R2 C189 |
| C212 | 438 | `game/js/plugins/DEUS_Projects.js:38` | TRUE | R2 C190 |
| C213 | 439 | `game/js/plugins/DEUS_Fluid.js:55` | TRUE | R2 C191 |
| C214 | 439 | `game/js/plugins/DEUS_Fluid.js:1016-1019` | TRUE | R2 C192 |
| C215 | 440 | `game/js/plugins/DEUS_Core.js:60-62` | TRUE | R2 C193 |
| C216 | 440 | `game/js/plugins/DEUS_Core.js:304-311` | TRUE | R2 C194 |
| C217 | 448 | `game/js/plugins/DEUS_TimeSpeed.js:158-173` | TRUE | R2 C195 |
| C218 | 471 | `game/js/plugins/DEUS_TimeSpeed.js:46-47` | TRUE | R2 C196 |
| C219 | 472 | `game/js/plugins/DEUS_TimeSpeed.js:147-153` | TRUE | R2 C197 |
| C220 | 472 | `game/js/plugins/DEUS_TimeSpeed.js:155-185` | TRUE | R2 C198 |
| C221 | 472 | `game/js/plugins/DEUS_TimeSpeed.js:231-241` | TRUE | R2 C199 |
| C222 | 521 | `game/js/plugins/DEUS_World.js:1709-1710` | TRUE | R2 C200 |
| C223 | 525 | `docs/OWNER_DECISIONS.md:267-278` | TRUE | A C223 |
| C224 | 531 | `docs/OWNER_DECISIONS.md:282-289` | TRUE | A C224 |
| C225 | 557 | `game/js/plugins/DEUS_Fluid.js:184` | TRUE | R2 C201 |
| C226 | 557 | `game/js/plugins/DEUS_Fluid.js:671` | TRUE | R2 C202 |
| C227 | 575 | `game/js/plugins/DEUS_World.js:613` | TRUE | R2 C203 |
| C228 | 603 | `game/js/plugins/DEUS_Core.js:256-272` | TRUE | R2 C204 |
| C229 | 603 | `game/js/plugins/DEUS_Core.js:268` | TRUE | R2 C205 |
| C230 | 603 | `game/js/plugins/DEUS_World.js:1418-1420` | TRUE | R2 C206 |
| C231 | 655 | `game/js/plugins/DEUS_Environment.js:88` | TRUE | R2 C207 |
| C232 | 655 | `game/js/plugins/DEUS_Environment.js:120` | TRUE | R2 C208 |
| C233 | 661 | `game/js/plugins/DEUS_World.js:535-539` | TRUE | R2 C209 |
| C234 | 678 | `game/js/plugins/DEUS_World.js:155` | TRUE | A C234 |
| C235 | 683 | `docs/OWNER_DECISIONS.md:172-195` | TRUE | W |
| C236 | 683 | `docs/OWNER_DECISIONS.md:186-191` | TRUE | W |
| C237 | 683 | `docs/OWNER_DECISIONS.md:193` | TRUE | W |
| C238 | 683 | `docs/OWNER_DECISIONS.md:194-195` | TRUE | W |
| C239 | 697 | `game/js/plugins/DEUS_Minimap.js:56-58` | TRUE | R2 C212 |
| C240 | 700 | `game/js/plugins/DEUS_Camera.js:35-51` | TRUE | R2 C213 |
| C241 | 805 | `game/js/plugins/DEUS_Ecology.js:214` | TRUE | A C238 |
| C242 | 805 | `game/js/plugins/DEUS_Ecology.js:672-678` | TRUE | A C239 |
| C243 | 805 | `game/js/plugins/DEUS_Ecology.js:722` | TRUE | A C240 |
| C244 | 805 | `game/js/plugins/DEUS_Ecology.js:897-905` | TRUE | A C241 |
| C245 | 805 | `game/js/plugins/DEUS_Ecology.js:907-914` | TRUE | A C242 |
| C246 | 806 | `game/js/plugins/DEUS_Ecology.js:127` | TRUE | R2 C218 |
| C247 | 806 | `game/js/plugins/DEUS_Ecology.js:772-796` | TRUE | R2 C219 |
| C248 | 806 | `game/js/plugins/DEUS_Ecology.js:736-752` | TRUE | R2 C220 |
| C249 | 807 | `game/js/plugins/DEUS_Fluid.js:127-137` | TRUE | W |
| C250 | 807 | `game/js/plugins/DEUS_Fluid.js:179` | TRUE | W |
| C251 | 807 | `game/js/plugins/DEUS_Fluid.js:187-189` | TRUE | W |
| C252 | 807 | `game/js/plugins/DEUS_Fluid.js:457-458` | TRUE | W |
| C253 | 808 | `game/js/plugins/DEUS_Fire.js:214` | TRUE | R2 C223 |
| C254 | 808 | `game/js/plugins/DEUS_Fire.js:389` | TRUE | R2 C224 |
| C255 | 809 | `game/js/plugins/DEUS_World.js:599-689` | TRUE | W |
| C256 | 809 | `game/js/plugins/DEUS_World.js:650` | TRUE | W |
| C257 | 809 | `game/js/plugins/DEUS_World.js:682-685` | TRUE | W |
| C258 | 809 | `game/js/plugins/DEUS_World.js:800-822` | TRUE | W |
| C259 | 810 | `game/js/plugins/DEUS_History.js:363-410` | TRUE | R2 C227 |
| C260 | 810 | `game/js/plugins/DEUS_History.js:390-395` | TRUE | R2 C228 |
| C261 | 810 | `game/js/plugins/DEUS_HistoricalDemographics.js:468` | TRUE | R2 C229 |
| C262 | 810 | `game/js/plugins/DEUS_HistoricalDemographics.js:8-9` | TRUE | R2 C230 |
| C263 | 811 | `game/js/plugins/DEUS_Jobs.js:101-107` | TRUE | R2 C231 |
| C264 | 811 | `game/js/plugins/DEUS_Projects.js:179-189` | TRUE | R2 C232 |
| C265 | 812 | `game/js/plugins/DEUS_Items.js:304` | TRUE | R2 C233 |
| C266 | 813 | `game/js/plugins/DEUS_Environment.js:88` | TRUE | R2 C234 |
| C267 | 813 | `game/js/plugins/DEUS_Environment.js:120` | TRUE | R2 C235 |
| C268 | 814 | `game/js/plugins/DEUS_Factions.js:656-660` | TRUE | R2 C236 |
| C269 | 814 | `game/js/plugins/DEUS_Factions.js:194` | TRUE | R2 C237 |
| C270 | 814 | `game/js/plugins/DEUS_Factions.js:594-625` | TRUE | R2 C238 |
| C271 | 837 | `game/js/plugins/DEUS_World.js:187-211` | TRUE | R2 C239 |
| C272 | 851 | `game/js/plugins/DEUS_Fluid.js:517-532` | TRUE | R2 C240 |
| C273 | 852 | `game/js/plugins/DEUS_Fluid.js:896-923` | TRUE | R2 C241 |
| C274 | 857 | `game/js/plugins/DEUS_Ecology.js:463-470` | TRUE | R2 C242 |
| C275 | 876 | `game/js/plugins/DEUS_World.js:1133` | TRUE | R2 C243 |
| C276 | 877 | `game/js/plugins/DEUS_Factions.js:619-625` | TRUE | A C273 |
| C277 | 884 | `docs/systems/UF_History.md:102` | TRUE | R2 C245 |
| C278 | 888 | `game/js/plugins/DEUS_World.js:1136-1137` | TRUE | R2 C246 |
| C279 | 899 | `game/js/plugins/DEUS_World.js:1739` | TRUE | R2 C247 |
| C280 | 899 | `game/js/plugins/DEUS_World.js:2915` | TRUE | R2 C248 |
| C281 | 925 | `game/js/plugins/DEUS_Fluid.js:9-18` | TRUE | A C278 |
| C282 | 925 | `game/js/plugins/DEUS_Fluid.js:50` | TRUE | A C279 |
| C283 | 931 | `game/js/plugins/DEUS_Items.js:304` | TRUE | R2 C251 |
| C284 | 934 | `game/js/plugins/DEUS_Fire.js:389` | TRUE | R2 C252 |
| C285 | 935 | `game/js/plugins/DEUS_Colonists.js:5389` | TRUE | A C282 |
| C286 | 935 | `game/js/plugins/DEUS_Colonists.js:5410-5411` | TRUE | A C283 |
| C287 | 948 | `docs/OWNER_DECISIONS.md:262` | TRUE | A C284 |
| C288 | 950 | `docs/RISK_REGISTER.md:61` | TRUE | R2 C254 |
| C289 | 987 | `game/js/plugins/DEUS_Core.js:321-325` | TRUE | R2 C255 |
| C290 | 1000 | `game/js/plugins/DEUS_Sheet.js:833-846` | TRUE | R2 C256 |
| C291 | 1001 | `game/js/plugins/DEUS_Anim.js:1504-1522` | TRUE | R2 C257 |
| C292 | 1001 | `game/js/plugins/DEUS_Anim.js:1605-1631` | TRUE | R2 C258 |
| C293 | 1001 | `game/js/plugins/DEUS_Ownership.js:613` | TRUE | R2 C259 |
| C294 | 1001 | `game/js/plugins/DEUS_TimeSpeed.js:84-95` | TRUE | R2 C260 |
| C295 | 1001 | `game/js/plugins/DEUS_TimeSpeed.js:188-203` | TRUE | R2 C261 |
| C296 | 1008 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:105` | TRUE | A C293 |
| C297 | 1009 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:533-536` | TRUE | W |
| C298 | 1010 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541` | TRUE | A C295 |
| C299 | 1011 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:559-561` | TRUE | A C296 |
| C300 | 1012 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:577` | TRUE | A C297 |
| C301 | 1013 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:107-109` | TRUE | A C298 |
| C302 | 1014 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:112` | TRUE | A C299 |
| C303 | 1017 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:520` | TRUE | A C300 |
| C304 | 1018 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:521` | TRUE | A C301 |
| C305 | 1019 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:650` | TRUE | A C302 |
| C306 | 1058 | `docs/OWNER_DECISIONS.md:247` | TRUE | A C303 |
| C307 | 1076 | `game/js/plugins/DEUS_Core.js:264-270` | TRUE | R2 C266 |
| C308 | 1088 | `game/js/plugins/DEUS_World.js:411` | TRUE | R2 C267 |
| C309 | 1088 | `game/js/plugins/DEUS_World.js:418` | TRUE | R2 C268 |
| C310 | 1089 | `game/js/plugins/DEUS_Dnd5e.js:415` | TRUE | R2 C269 |
| C311 | 1089 | `game/js/plugins/DEUS_Dnd5e.js:720` | TRUE | R2 C270 |
| C312 | 1089 | `game/js/plugins/DEUS_Dnd5e.js:800` | TRUE | R2 C271 |
| C313 | 1090 | `game/js/plugins/DEUS_FactionMenus.js:442` | TRUE | R2 C272 |
| C314 | 1090 | `game/js/plugins/DEUS_FactionMenus.js:468` | TRUE | R2 C273 |
| C315 | 1090 | `game/js/plugins/DEUS_FactionMenus.js:478` | TRUE | R2 C274 |
| C316 | 1091 | `game/js/plugins/DEUS_Visuals.js:151-171` | TRUE | R2 C275 |
| C317 | 1095 | `game/js/plugins/DEUS_Fire.js:575` | TRUE | R2 C276 |
| C318 | 1096 | `game/js/plugins/DEUS_World.js:545-548` | TRUE | R2 C277 |
| C319 | 1096 | `game/js/plugins/DEUS_World.js:556` | TRUE | R2 C278 |
| C320 | 1102 | `game/js/plugins/DEUS_World.js:800-808` | TRUE | R2 C279 |
| C321 | 1102 | `game/js/plugins/DEUS_World.js:2819-2820` | TRUE | R2 C280 |
| C322 | 1108 | `game/js/plugins/DEUS_Fluid.js:733` | TRUE | R2 C281 |
| C323 | 1108 | `game/js/plugins/DEUS_Fluid.js:747` | TRUE | R2 C282 |
| C324 | 1109 | `game/js/plugins/DEUS_Combat.js:1416-1422` | TRUE | R2 C283 |
| C325 | 1110 | `game/js/plugins/DEUS_Ecology.js:68` | TRUE | R2 C284 |
| C326 | 1112 | `game/js/plugins/DEUS_Fluid.js:55` | TRUE | R2 C285 |
| C327 | 1122 | `game/js/plugins/DEUS_Ecology.js:442-453` | TRUE | R2 C286 |
| C328 | 1123 | `game/js/plugins/DEUS_Levels.js:1764` | TRUE | A C325 |
| C329 | 1123 | `game/js/plugins/DEUS_Levels.js:1846` | TRUE | A C326 |
| C330 | 1156 | `game/js/plugins/DEUS_World.js:2901-2905` | TRUE | R2 C287 |
| C331 | 1156 | `game/js/plugins/DEUS_World.js:2907-2916` | TRUE | R2 C288 |
| C332 | 1157 | `game/js/plugins/DEUS_Anim.js:1075` | TRUE | R2 C289 |
| C333 | 1158 | `game/js/plugins/DEUS_Select.js:321` | TRUE | R2 C290 |
| C334 | 1159 | `game/js/plugins/DEUS_Levels.js:4203-4204` | TRUE | R2 C291 |
| C335 | 1159 | `game/js/plugins/DEUS_Select.js:3411` | TRUE | R2 C292 |
| C336 | 1160 | `game/js/plugins/DEUS_Fog.js:119` | TRUE | R2 C293 |
| C337 | 1161 | `game/js/plugins/DEUS_Minimap.js:840-843` | TRUE | R2 C294 |
| C338 | 1162 | `game/js/plugins/DEUS_Fluid.js:821-844` | TRUE | R2 C295 |
| C339 | 1162 | `game/js/plugins/DEUS_Fluid.js:994-1011` | TRUE | R2 C296 |
| C340 | 1163 | `game/js/plugins/DEUS_Core.js:448-468` | TRUE | R2 C297 |
| C341 | 1163 | `game/js/plugins/DEUS_Core.js:471-490` | TRUE | R2 C298 |
| C342 | 1165 | `game/js/rmmz_managers.js:389` | TRUE | R2 C299 |
| C343 | 1165 | `game/js/rmmz_managers.js:405` | TRUE | R2 C300 |
| C344 | 1228 | `game/js/plugins/DEUS_Environment.js:88` | TRUE | R2 C301 |
| C345 | 1228 | `game/js/plugins/DEUS_Environment.js:120` | TRUE | R2 C302 |
| C346 | 1228 | `game/js/plugins/DEUS_Items.js:163` | TRUE | R2 C303 |
| C347 | 1244 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:523` | TRUE | A C344 |
| C348 | 1245 | `game/js/plugins/DEUS_Ownership.js:613` | TRUE | R2 C304 |
| C349 | 1245 | `game/js/plugins/DEUS_TimeSpeed.js:84-95` | TRUE | R2 C305 |
| C350 | 1245 | `game/js/plugins/DEUS_TimeSpeed.js:188-203` | TRUE | R2 C306 |
| C351 | 1245 | `game/js/plugins/DEUS_Anim.js:1504-1522` | TRUE | R2 C307 |
| C352 | 1245 | `game/js/plugins/DEUS_Anim.js:1605-1631` | TRUE | R2 C308 |
| C353 | 1249 | `docs/systems/UF_History.md:106` | TRUE | R2 C309 |
| C354 | 1250 | `game/js/plugins/DEUS_Ecology.js:736-752` | TRUE | R2 C310 |
| C355 | 1252 | `docs/ARCHITECTURE.md:18` | TRUE | R2 C311 |
| C356 | 1255 | `game/js/plugins/DEUS_Core.js:321-325` | TRUE | R2 C312 |
| C357 | 1255 | `docs/systems/UF_History.md:1161` | TRUE | R2 C313 |
| C358 | 1257 | `docs/OWNER_DECISIONS.md:199-208` | TRUE | W |
| C359 | 1257 | `docs/OWNER_DECISIONS.md:206` | TRUE | W |
| C360 | 1258 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:533` | TRUE | A C356 |
| C361 | 1258 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:537` | TRUE | A C357 |
| C362 | 1260 | `docs/VISION.md:129` | TRUE | A C358 |
| C363 | 1262 | `docs/OWNER_DECISIONS.md:262` | TRUE | A C359 |
| C364 | 1263 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:108` | TRUE | A C360 |
| C365 | 1263 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:109` | TRUE | A C361 |
| C366 | 1263 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:577` | TRUE | A C362 |
| C367 | 1263 | `docs/OWNER_DECISIONS.md:282` | TRUE | A C363 |
| C368 | 1263 | `docs/OWNER_DECISIONS.md:293` | TRUE | A C364 |
| C369 | 1263 | `docs/OWNER_DECISIONS.md:304` | TRUE | A C365 |
| C370 | 1263 | `docs/VISION.md:412` | TRUE | A C366 |
| C371 | 1270 | `docs/OWNER_DECISIONS.md:239-247` | TRUE | A C367 |
| C372 | 1272 | `docs/OWNER_DECISIONS.md:245` | TRUE | A C368 |
| C373 | 1304 | `docs/OWNER_DECISIONS.md:243` | TRUE | A C369 |
| C374 | 1306 | `docs/OWNER_DECISIONS.md:300` | TRUE | A C370 |
| C375 | 1306 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:109` | TRUE | A C371 |
| C376 | 1314 | `docs/OWNER_DECISIONS.md:247` | TRUE | W |
| C377 | 1334 | `game/js/plugins/UF_Core.js:13` | TRUE | R2 C314 |
| C378 | 1337 | `game/js/plugins/DEUS_Callings.js:404` | TRUE | R2 C315 |
| C379 | 1338 | `game/js/plugins/DEUS_DeathForensics.js:542` | TRUE | R2 C316 |
| C380 | 1339 | `game/js/plugins/DEUS_Fluid.js:1026` | TRUE | R2 C317 |
| C381 | 1340 | `game/js/plugins/DEUS_Containers.js:1345` | TRUE | R2 C318 |
| C382 | 1341 | `game/js/plugins/UF_Households.js:1067` | TRUE | R2 C319 |
| C383 | 1347 | `game/package.json:4-11` | TRUE | A C379 |
| C384 | 1347 | `game/js/plugins/DEUS_Core.js:69` | TRUE | A C380 |
| C385 | 1347 | `game/js/plugins/DEUS_Core.js:98` | TRUE | A C381 |
| C386 | 1347 | `game/js/plugins/DEUS_Core.js:134` | TRUE | A C382 |
| C387 | 1347 | `game/js/plugins/DEUS_FactionMenus.js:455` | TRUE | A C383 |
| C388 | 1348 | `game/js/rmmz_core.js:471` | TRUE | A C384 |
| C389 | 1348 | `game/js/rmmz_core.js:808` | TRUE | A C385 |
| C390 | 1348 | `game/js/rmmz_core.js:1177` | TRUE | A C386 |
| C391 | 1348 | `game/js/rmmz_core.js:1851` | TRUE | A C387 |
| C392 | 1348 | `game/js/plugins/DEUS_Depth.js:219` | TRUE | A C388 |
| C393 | 1348 | `game/js/plugins/DEUS_Depth.js:685` | TRUE | A C389 |
| C394 | 1349 | `game/js/rmmz_core.js:2185` | TRUE | A C390 |
| C395 | 1349 | `game/js/rmmz_core.js:2672` | TRUE | A C391 |
| C396 | 1349 | `game/js/rmmz_core.js:2682` | TRUE | A C392 |
| C397 | 1349 | `game/js/rmmz_core.js:2694` | TRUE | A C393 |
| C398 | 1349 | `game/js/rmmz_core.js:2726` | TRUE | A C394 |
| C399 | 1349 | `game/js/rmmz_core.js:2793` | TRUE | A C395 |
| C400 | 1350 | `game/js/rmmz_scenes.js:747` | TRUE | A C396 |
| C401 | 1350 | `game/js/rmmz_sprites.js:3345` | TRUE | A C397 |
| C402 | 1351 | `game/js/rmmz_core.js:5652` | TRUE | A C398 |
| C403 | 1351 | `game/js/rmmz_core.js:6021` | TRUE | A C399 |
| C404 | 1352 | `game/js/rmmz_managers.js:1103` | TRUE | A C400 |
| C405 | 1352 | `game/js/rmmz_managers.js:1491` | TRUE | A C401 |
| C406 | 1353 | `game/js/rmmz_managers.js:345` | TRUE | A C402 |
| C407 | 1353 | `game/js/rmmz_managers.js:389` | TRUE | A C403 |
| C408 | 1353 | `game/js/rmmz_managers.js:405` | TRUE | A C404 |
| C409 | 1353 | `game/js/rmmz_managers.js:538` | TRUE | A C405 |
| C410 | 1353 | `game/js/rmmz_core.js:6416` | TRUE | A C406 |
| C411 | 1354 | `game/js/plugins/DEUS_WorldGen.js:45-46` | TRUE | A C407 |
| C412 | 1354 | `game/js/plugins/DEUS_Look.js:93` | TRUE | A C408 |
| C413 | 1354 | `game/js/plugins/DEUS_World.js:2813` | TRUE | A C409 |
| C414 | 1355 | `game/js/plugins/DEUS_Sheet.js:1158` | TRUE | A C410 |
| C415 | 1355 | `game/js/plugins/DEUS_Interact.js:525` | TRUE | A C411 |
| C416 | 1355 | `game/js/plugins/DEUS_ColonyOverseer.js:173` | TRUE | A C412 |
| C417 | 1356 | `game/js/plugins/DEUS_World.js:899` | TRUE | A C413 |
| C418 | 1357 | `game/js/rmmz_managers.js:1982-2112` | TRUE | A C414 |
| C419 | 1369 | `game/js/plugins/DEUS_History.js:3396-3408` | TRUE | R2 C356 |
| C420 | 1369 | `game/js/plugins/DEUS_History.js:363-410` | TRUE | R2 C357 |
| C421 | 1370 | `game/js/plugins/DEUS_History.js:390-395` | TRUE | R2 C358 |
| C422 | 1370 | `game/js/plugins/DEUS_HistoricalDemographics.js:468` | TRUE | R2 C359 |
| C423 | 1371 | `game/js/plugins/DEUS_HistoricalDemographics.js:8-9` | TRUE | R2 C360 |
| C424 | 1374 | `game/js/plugins/DEUS_History.js:428-557` | TRUE | R2 C361 |
| C425 | 1375 | `game/js/plugins/DEUS_HistoricalDemographics.js:319` | TRUE | R2 C362 |
| C426 | 1375 | `game/js/plugins/DEUS_HistoricalDemographics.js:397` | TRUE | R2 C363 |
| C427 | 1375 | `game/js/plugins/DEUS_History.js:547` | TRUE | R2 C364 |
| C428 | 1376 | `docs/systems/UF_History.md:93` | TRUE | R2 C365 |
| C429 | 1376 | `docs/systems/UF_History.md:106` | TRUE | R2 C366 |
| C430 | 1379 | `game/js/plugins/DEUS_History.js:1665-2732` | TRUE | R2 C367 |
| C431 | 1379 | `game/js/plugins/DEUS_History.js:1658-1664` | TRUE | R2 C368 |
| C432 | 1379 | `game/js/plugins/DEUS_History.js:1704-1712` | TRUE | R2 C369 |
| C433 | 1379 | `game/js/plugins/DEUS_History.js:1845-1862` | TRUE | R2 C370 |
| C434 | 1379 | `game/js/plugins/DEUS_History.js:2725-2726` | TRUE | R2 C371 |
| C435 | 1380 | `game/js/plugins/DEUS_History.js:3409-3426` | TRUE | R2 C372 |
| C436 | 1381 | `game/data/UF_WorldCatalog.json:7670-7675` | TRUE | R2 C373 |
| C437 | 1382 | `game/data/UF_WorldCatalog.json:6128-6146` | TRUE | R2 C374 |
| C438 | 1385 | `docs/systems/UF_History.md:192-201` | TRUE | A C434 |
| C439 | 1385 | `docs/systems/UF_History.md:207` | TRUE | A C435 |
| C440 | 1386 | `docs/systems/UF_History.md:27` | TRUE | A C436 |
| C441 | 1386 | `docs/systems/UF_History.md:31-44` | TRUE | A C437 |
| C442 | 1399 | `docs/systems/UF_History.md:106` | TRUE | R2 C377 |
| C443 | 1404 | `docs/systems/UF_History.md:194-201` | TRUE | A C439 |
| C444 | 1404 | `docs/systems/UF_History.md:207` | TRUE | A C440 |
| C445 | 1407 | `docs/systems/UF_History.md:27` | TRUE | A C441 |
| C446 | 1407 | `docs/systems/UF_History.md:31-44` | TRUE | A C442 |
| C447 | 1414 | `docs/INVARIANT_REGISTRY.md:51` | TRUE | R2 C380 |
| C448 | 1415 | `docs/systems/UF_History.md:106` | TRUE | R2 C381 |
| C449 | 1416 | `game/js/plugins/DEUS_FactionMenus.js:280-292` | TRUE | R2 C382 |
| C450 | 1423 | `docs/OWNER_DECISIONS.md:172-195` | TRUE | A C446 |
| C451 | 1424 | `docs/OWNER_DECISIONS.md:177` | TRUE | A C447 |
| C452 | 1424 | `docs/OWNER_DECISIONS.md:193` | TRUE | A C448 |
| C453 | 1425 | `docs/OWNER_DECISIONS.md:178-181` | TRUE | A C449 |
| C454 | 1426 | `docs/OWNER_DECISIONS.md:182` | TRUE | A C450 |
| C455 | 1427 | `docs/OWNER_DECISIONS.md:183` | TRUE | A C451 |
| C456 | 1428 | `docs/OWNER_DECISIONS.md:186-191` | TRUE | A C452 |
| C457 | 1428 | `docs/OWNER_DECISIONS.md:194-195` | TRUE | A C453 |
| C458 | 1430 | `docs/VISION.md:130` | TRUE | A C454 |
| C459 | 1430 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:105` | TRUE | A C455 |
| C460 | 1436 | `game/js/plugins/DEUS_Levels.js:993` | TRUE | A C456 |
| C461 | 1437 | `game/js/plugins/DEUS_Levels.js:993` | TRUE | A C457 |
| C462 | 1438 | `game/js/plugins/DEUS_Levels.js:985-986` | TRUE | A C458 |
| C463 | 1438 | `game/js/plugins/DEUS_Levels.js:1790-1791` | TRUE | A C459 |
| C464 | 1438 | `game/js/plugins/DEUS_Levels.js:1833` | TRUE | A C460 |
| C465 | 1438 | `game/js/plugins/DEUS_Levels.js:1835` | TRUE | A C461 |
| C466 | 1438 | `game/js/plugins/DEUS_Levels.js:1845` | TRUE | A C462 |
| C467 | 1440 | `game/js/plugins/DEUS_Levels.js:1787` | TRUE | A C463 |
| C468 | 1445 | `docs/OWNER_DECISIONS.md:230-235` | TRUE | A C464 |
| C469 | 1449 | `game/js/plugins/DEUS_Fluid.js:50` | TRUE | A C465 |
| C470 | 1449 | `docs/VISION.md:129` | TRUE | A C466 |
| C471 | 1452 | `game/js/plugins/DEUS_Levels.js:985-986` | TRUE | A C467 |
| C472 | 1452 | `game/js/plugins/DEUS_Levels.js:1790-1791` | TRUE | A C468 |
| C473 | 1458 | `game/js/plugins/DEUS_World.js:155` | TRUE | R2 C385 |
| C474 | 1458 | `game/js/plugins/DEUS_World.js:156` | TRUE | R2 C386 |
| C475 | 1458 | `game/js/plugins/DEUS_World.js:158` | TRUE | R2 C387 |
| C476 | 1459 | `game/js/plugins/DEUS_Levels.js:61` | TRUE | A C472 |
| C477 | 1459 | `game/js/plugins/DEUS_Levels.js:150` | TRUE | A C473 |
| C478 | 1459 | `game/js/plugins/DEUS_Levels.js:998` | TRUE | A C474 |
| C479 | 1459 | `game/js/plugins/DEUS_Levels.js:1137` | TRUE | A C475 |
| C480 | 1459 | `game/js/plugins/DEUS_Levels.js:1141` | TRUE | A C476 |
| C481 | 1459 | `game/js/plugins/DEUS_Levels.js:1038` | TRUE | A C477 |
| C482 | 1459 | `game/js/plugins/DEUS_Levels.js:1285` | TRUE | A C478 |
| C483 | 1459 | `game/js/plugins/DEUS_Levels.js:1588` | TRUE | A C479 |
| C484 | 1459 | `game/js/plugins/DEUS_Levels.js:1627` | TRUE | A C480 |
| C485 | 1459 | `game/js/plugins/DEUS_Levels.js:1732` | TRUE | A C481 |
| C486 | 1459 | `game/js/plugins/DEUS_Levels.js:1828` | TRUE | A C482 |
| C487 | 1459 | `game/js/plugins/DEUS_Levels.js:3024` | TRUE | A C483 |
| C488 | 1459 | `game/js/plugins/DEUS_Levels.js:3097` | TRUE | A C484 |
| C489 | 1459 | `game/js/plugins/DEUS_Levels.js:3117` | TRUE | A C485 |
| C490 | 1459 | `game/js/plugins/DEUS_Levels.js:1805` | TRUE | A C486 |
| C491 | 1459 | `game/js/plugins/DEUS_Levels.js:1813` | TRUE | A C487 |
| C492 | 1459 | `game/js/plugins/DEUS_Levels.js:1833` | TRUE | A C488 |
| C493 | 1459 | `game/js/plugins/DEUS_Levels.js:1835` | TRUE | A C489 |
| C494 | 1459 | `game/js/plugins/DEUS_Levels.js:1845` | TRUE | A C490 |
| C495 | 1459 | `game/js/plugins/DEUS_Levels.js:1873` | TRUE | A C491 |
| C496 | 1459 | `game/js/plugins/DEUS_Levels.js:1876` | TRUE | A C492 |
| C497 | 1459 | `game/js/plugins/DEUS_Levels.js:1765` | TRUE | A C493 |
| C498 | 1460 | `game/js/plugins/DEUS_Fluid.js:56-58` | TRUE | W |
| C499 | 1460 | `game/js/plugins/DEUS_Fluid.js:173-190` | TRUE | W |
| C500 | 1460 | `game/js/plugins/DEUS_Fluid.js:183` | TRUE | W |
| C501 | 1460 | `game/js/plugins/DEUS_Fluid.js:186-190` | TRUE | W |
| C502 | 1460 | `game/js/plugins/DEUS_Fluid.js:291` | TRUE | W |
| C503 | 1461 | `game/js/plugins/DEUS_Minimap.js:59-60` | TRUE | R2 C396 |
| C504 | 1464 | `game/js/plugins/DEUS_Levels.js:1037` | TRUE | A C499 |
| C505 | 1465 | `game/js/plugins/DEUS_Fluid.js:173` | TRUE | A C500 |
| C506 | 1465 | `game/js/plugins/DEUS_Fluid.js:179-189` | TRUE | A C501 |
| C507 | 1466 | `game/js/plugins/DEUS_World.js:605` | TRUE | A C502 |
| C508 | 1466 | `game/js/plugins/DEUS_World.js:613` | TRUE | A C503 |
| C509 | 1468 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:105` | TRUE | A C504 |
| C510 | 1481 | `docs/OWNER_DECISIONS.md:177` | TRUE | A C505 |
| C511 | 1481 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:105` | TRUE | A C506 |
| C512 | 1511 | `game/js/plugins/DEUS_Levels.js:1037` | TRUE | R2 C398 |
| C513 | 1512 | `game/js/plugins/DEUS_World.js:613` | TRUE | R2 C399 |
| C514 | 1513 | `game/js/plugins/DEUS_Fluid.js:179-183` | TRUE | R2 C400 |
| C515 | 1514 | `game/js/plugins/DEUS_Levels.js:997` | TRUE | A C510 |
| C516 | 1515 | `game/js/plugins/DEUS_World.js:605` | TRUE | R2 C401 |
| C517 | 1515 | `game/js/plugins/DEUS_World.js:801` | TRUE | R2 C402 |
| C518 | 1530 | `game/js/plugins/DEUS_Levels.js:997` | TRUE | R2 C403 |
| C519 | 1530 | `game/js/plugins/DEUS_Levels.js:1110-1114` | TRUE | R2 C404 |
| C520 | 1530 | `game/js/plugins/DEUS_Levels.js:990-991` | TRUE | R2 C405 |
| C521 | 1531 | `game/js/plugins/DEUS_Fluid.js:821-844` | TRUE | R2 C406 |
| C522 | 1545 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:196` | TRUE | A C517 |
| C523 | 1553 | `docs/VISION.md:131` | TRUE | A C518 |
| C524 | 1553 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:533-536` | TRUE | A C519 |
| C525 | 1559 | `game/js/plugins/DEUS_Levels.js:1000-1010` | TRUE | A C520 |
| C526 | 1559 | `game/js/plugins/DEUS_Levels.js:1000-1002` | TRUE | A C521 |
| C527 | 1559 | `game/js/plugins/DEUS_Levels.js:1003-1010` | TRUE | A C522 |
| C528 | 1561 | `game/js/plugins/DEUS_Levels.js:1709-1725` | TRUE | A C523 |
| C529 | 1562 | `game/js/plugins/DEUS_Levels.js:1783-1794` | TRUE | A C524 |
| C530 | 1562 | `game/js/plugins/DEUS_Levels.js:1795` | TRUE | A C525 |
| C531 | 1562 | `game/js/plugins/DEUS_Levels.js:1815` | TRUE | A C526 |
| C532 | 1562 | `game/js/plugins/DEUS_Levels.js:1849` | TRUE | A C527 |
| C533 | 1564 | `game/js/plugins/DEUS_Levels.js:1001-1002` | TRUE | A C528 |
| C534 | 1564 | `game/js/plugins/DEUS_Levels.js:1700-1702` | TRUE | A C529 |
| C535 | 1565 | `game/js/plugins/DEUS_Colonists.js:3736` | TRUE | R2 C414 |
| C536 | 1566 | `docs/OWNER_DECISIONS.md:137` | TRUE | R2 C415 |
| C537 | 1567 | `game/js/plugins/DEUS_Fluid.js:941-944` | TRUE | R2 C416 |
| C538 | 1596 | `game/js/plugins/DEUS_Doors.js:444-445` | TRUE | R2 C417 |
| C539 | 1630 | `docs/VISION.md:132` | TRUE | A C534 |
| C540 | 1630 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:537-541` | TRUE | A C535 |
| C541 | 1630 | `docs/RISK_REGISTER.md:60-62` | TRUE | A C536 |
| C542 | 1636 | `game/js/plugins/DEUS_HistoricalDemographics.js:521` | TRUE | R2 C421 |
| C543 | 1637 | `game/js/plugins/DEUS_Doors.js:444` | TRUE | A C538 |
| C544 | 1637 | `game/js/plugins/DEUS_Doors.js:442-451` | TRUE | A C539 |
| C545 | 1637 | `game/js/plugins/DEUS_Doors.js:18` | TRUE | A C540 |
| C546 | 1637 | `game/data/UF_WorldCatalog.json:2147` | TRUE | A C541 |
| C547 | 1637 | `game/data/UF_WorldCatalog.json:2188` | TRUE | A C542 |
| C548 | 1638 | `game/js/plugins/DEUS_Ecology.js:308-389` | TRUE | A C543 |
| C549 | 1638 | `game/js/plugins/DEUS_Ecology.js:764-873` | TRUE | A C544 |
| C550 | 1648 | `game/js/plugins/DEUS_Levels.js:995` | TRUE | R2 C427 |
| C551 | 1677 | `docs/RISK_REGISTER.md:61` | TRUE | R2 C428 |
| C552 | 1683 | `docs/RISK_REGISTER.md:62` | TRUE | R2 C429 |
| C553 | 1691 | `docs/RISK_REGISTER.md:74` | TRUE | R2 C430 |
| C554 | 1693 | `docs/RISK_REGISTER.md:63` | TRUE | R2 C431 |
| C555 | 1713 | `docs/OWNER_DECISIONS.md:183` | TRUE | A C550 |
| C556 | 1714 | `docs/OWNER_DECISIONS.md:251-263` | TRUE | A C551 |
| C557 | 1715 | `docs/OWNER_DECISIONS.md:304-312` | TRUE | A C552 |
| C558 | 1717 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:533` | TRUE | A C553 |
| C559 | 1717 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:558-561` | TRUE | A C554 |
| C560 | 1717 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:577` | TRUE | A C555 |
| C561 | 1717 | `docs/VISION.md:404` | TRUE | A C556 |
| C562 | 1717 | `docs/VISION.md:412` | TRUE | A C557 |
| C563 | 1723 | `game/js/plugins/DEUS_Levels.js:1783-1855` | TRUE | A C558 |
| C564 | 1725 | `game/js/plugins/DEUS_Levels.js:1795-1820` | TRUE | A C559 |
| C565 | 1726 | `game/js/plugins/DEUS_Levels.js:1805` | TRUE | A C560 |
| C566 | 1727 | `game/js/plugins/DEUS_Levels.js:1809-1816` | TRUE | A C561 |
| C567 | 1727 | `game/js/plugins/DEUS_Levels.js:1815` | TRUE | A C562 |
| C568 | 1729 | `game/js/plugins/DEUS_Levels.js:1821-1855` | TRUE | A C563 |
| C569 | 1731 | `game/js/plugins/DEUS_Levels.js:1845-1846` | TRUE | A C564 |
| C570 | 1731 | `game/js/plugins/DEUS_Levels.js:1826` | TRUE | A C565 |
| C571 | 1731 | `game/js/plugins/DEUS_Levels.js:1764` | TRUE | A C566 |
| C572 | 1732 | `game/js/plugins/DEUS_Levels.js:1833` | TRUE | A C569 |
| C573 | 1732 | `game/js/plugins/DEUS_Levels.js:1839` | TRUE | A C568 |
| C574 | 1732 | `game/js/plugins/DEUS_Levels.js:1833` | TRUE | A C569 |
| C575 | 1732 | `game/js/plugins/DEUS_Levels.js:1845` | TRUE | A C570 |
| C576 | 1733 | `game/js/plugins/DEUS_Levels.js:1849` | TRUE | A C571 |
| C577 | 1735 | `game/js/plugins/DEUS_Levels.js:1676-1707` | TRUE | A C572 |
| C578 | 1736 | `game/js/plugins/DEUS_Levels.js:1691` | TRUE | A C573 |
| C579 | 1736 | `game/js/plugins/DEUS_Levels.js:1692-1693` | TRUE | A C574 |
| C580 | 1737 | `game/js/plugins/DEUS_Levels.js:1697` | TRUE | A C575 |
| C581 | 1737 | `game/js/plugins/DEUS_Levels.js:1699-1703` | TRUE | A C576 |
| C582 | 1738 | `game/js/plugins/DEUS_Levels.js:1005-1007` | TRUE | A C577 |
| C583 | 1739 | `game/js/plugins/DEUS_Levels.js:1685-1689` | TRUE | A C578 |
| C584 | 1742 | `game/js/plugins/DEUS_Levels.js:1844-1846` | TRUE | A C579 |
| C585 | 1745 | `game/js/plugins/DEUS_Levels.js:1805` | TRUE | A C580 |
| C586 | 1745 | `game/js/plugins/DEUS_Levels.js:1835` | TRUE | A C581 |
| C587 | 1746 | `game/js/plugins/DEUS_Levels.js:1764` | TRUE | A C582 |
| C588 | 1746 | `game/js/plugins/DEUS_Levels.js:1846` | TRUE | A C583 |
| C589 | 1774 | `game/js/plugins/DEUS_Levels.js:1005-1007` | TRUE | A C584 |
| C590 | 1782 | `game/js/plugins/DEUS_Levels.js:1792` | TRUE | A C585 |
| C591 | 1786 | `game/js/plugins/DEUS_Levels.js:1720-1722` | TRUE | A C586 |
| C592 | 1788 | `game/js/plugins/DEUS_Fluid.js:941-944` | TRUE | A C587 |
| C593 | 1812 | `docs/OWNER_DECISIONS.md:255-261` | TRUE | A C588 |
| C594 | 1863 | `docs/OWNER_DECISIONS.md:230-235` | TRUE | A C589 |
| C595 | 1864 | `docs/OWNER_DECISIONS.md:267-278` | TRUE | A C590 |
| C596 | 1865 | `docs/OWNER_DECISIONS.md:282-289` | TRUE | A C591 |
| C597 | 1866 | `docs/OWNER_DECISIONS.md:293-300` | TRUE | A C592 |
| C598 | 1883 | `game/js/plugins/DEUS_Anim.js:1506` | TRUE | R2 C432 |
| C599 | 1883 | `game/js/plugins/DEUS_Ownership.js:613` | TRUE | R2 C433 |
| C600 | 1883 | `game/js/plugins/DEUS_TimeSpeed.js:189` | TRUE | R2 C434 |
| C601 | 1883 | `game/js/plugins/DEUS_Fog.js:638` | TRUE | R2 C435 |
| C602 | 1883 | `game/js/plugins/DEUS_Wildlife.js:1195` | TRUE | R2 C436 |
| C603 | 1884 | `game/js/plugins/DEUS_Core.js:505-510` | TRUE | A C598 |
| C604 | 1884 | `game/js/plugins/DEUS_TimeSpeed.js:236` | TRUE | A C599 |
| C605 | 1885 | `game/js/plugins/DEUS_TimeSpeed.js:209-217` | TRUE | R2 C439 |
| C606 | 1885 | `game/js/rmmz_managers.js:2102-2112` | TRUE | R2 C440 |
| C607 | 1885 | `game/js/plugins.js:258` | TRUE | R2 C441 |
| C608 | 1885 | `game/js/plugins.js:184` | TRUE | R2 C442 |
| C609 | 1885 | `game/js/plugins/DEUS_NaturalConnections.js:312-329` | TRUE | R2 C443 |
| C610 | 1885 | `game/js/plugins/DEUS_NaturalConnections.js:352-353` | TRUE | R2 C444 |
| C611 | 1886 | `game/js/plugins/DEUS_World.js:1686-1698` | TRUE | R2 C445 |
| C612 | 1886 | `game/js/plugins/DEUS_World.js:1633-1675` | TRUE | R2 C446 |
| C613 | 1887 | `game/js/plugins/DEUS_World.js:136` | TRUE | R2 C447 |
| C614 | 1887 | `game/js/plugins/DEUS_World.js:1688-1689` | TRUE | R2 C448 |
| C615 | 1888 | `game/js/plugins/DEUS_World.js:127-128` | TRUE | W |
| C616 | 1888 | `game/js/plugins.js:58` | TRUE | W |
| C617 | 1888 | `game/js/plugins/DEUS_Fluid.js:356-376` | TRUE | W |
| C618 | 1888 | `game/js/plugins/DEUS_Fluid.js:381-383` | TRUE | W |
| C619 | 1888 | `game/js/plugins/DEUS_Fluid.js:1016-1019` | TRUE | W |
| C620 | 1889 | `game/js/plugins/DEUS_Ecology.js:22-27` | TRUE | A C615 |
| C621 | 1889 | `game/js/plugins/DEUS_Ecology.js:907-914` | TRUE | A C616 |
| C622 | 1889 | `game/js/plugins/DEUS_Ecology.js:876` | TRUE | A C617 |
| C623 | 1889 | `game/js/plugins/DEUS_Ecology.js:888-905` | TRUE | A C618 |
| C624 | 1889 | `game/js/plugins/DEUS_World.js:532` | TRUE | A C619 |
| C625 | 1889 | `game/js/plugins/DEUS_Ecology.js:803` | TRUE | A C620 |
| C626 | 1889 | `game/js/plugins/DEUS_Ecology.js:452-453` | TRUE | A C621 |
| C627 | 1890 | `game/js/plugins/DEUS_World.js:801` | TRUE | A C622 |
| C628 | 1890 | `game/js/plugins/DEUS_World.js:599` | TRUE | A C623 |
| C629 | 1891 | `game/js/plugins/DEUS_Levels.js:4179-4193` | TRUE | R2 C458 |
| C630 | 1891 | `game/js/plugins/DEUS_World.js:2728` | TRUE | R2 C459 |
| C631 | 1892 | `tools/bench_history_sim.js:13` | TRUE | R2 C460 |
| C632 | 1892 | `tools/bench_history_sim.js:37-122` @ebeec892 | TRUE | R2 C461 |
| C633 | 1892 | `tools/bench_history_sim.js:66-67` @ebeec892 | TRUE | R2 C462 |
| C634 | 1893 | `tools/test_new_game_year0.js:284` | TRUE | R2 C463 |
| C635 | 1894 | `tools/test_strata_foundation.js:156-243` | TRUE | R2 C464 |
| C636 | 1894 | `tools/test_strata_foundation.js:191-218` | TRUE | R2 C465 |
| C637 | 1895 | `game/js/plugins/DEUS_Fluid.js:1025-1026` | TRUE | R2 C466 |
| C638 | 1897 | `game/js/plugins/DEUS_Core.js:304-311` | TRUE | A C633 |
| C639 | 1897 | `game/js/plugins/DEUS_Core.js:376-378` | TRUE | A C634 |
| C640 | 1897 | `game/js/plugins/DEUS_Colonists.js:48` | TRUE | A C635 |
| C641 | 1897 | `game/js/plugins/DEUS_Environment.js:52` | TRUE | A C636 |
| C642 | 1897 | `game/js/plugins/DEUS_TimeSpeed.js:33` | TRUE | A C637 |
| C643 | 1898 | `game/js/plugins/DEUS_TimeSpeed.js:45-50` | TRUE | R2 C473 |
| C644 | 1899 | `game/js/plugins/DEUS_Dnd5e.js:415` | TRUE | R2 C474 |
| C645 | 1899 | `game/js/plugins/DEUS_Dnd5e.js:720` | TRUE | R2 C475 |
| C646 | 1899 | `game/js/plugins/DEUS_Dnd5e.js:800` | TRUE | R2 C476 |
