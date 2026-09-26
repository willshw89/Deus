# ADR-003 Rev 2 citation verdicts at b612bc72

Input: `cites_rev2_at_b612bc72.md` (476 citations of `c456cb73:docs/adr/ADR-003_sim_render_split_and_lod.md`, dumped by `../cite_check.js`).

Method: six read-only sub-agents judged slices C001-C080, C081-C160, C161-C240, C241-C320, C321-C400 and C401-C476 against the cited lines at `b612bc7217349bce695e15395bd041f63673b89b` (TRUE / IMPRECISE / FALSE). The writer then re-checked every non-TRUE verdict and the citations the Rev 2 review flagged:
- C058, C188 and C410 changed from TRUE to IMPRECISE, agreeing with the Rev 2 review.
- C210 and C383 say in the text that they cite `docs/OWNER_DECISIONS.md` "at `0c1baf8d`". They are judged at that commit (TRUE there). Rev 3 re-pins every document citation to `b612bc72`.
- First-pass totals were TRUE 449, IMPRECISE 20, FALSE 7.

Totals: TRUE 448, IMPRECISE 22, FALSE 6 (of 476).

| id | ADR line | citation | verdict | reason | Rev 3 fix |
|---|---:|---|---|---|---|
| C001 | 14 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:509` | FALSE | WBS :509 at b612bc72 is not the SIM.00.01 row (row at :519). Stale: :509 was the row at the lane base ebeec892. | Header now cites `docs/worldgen/DEUS_WORLDGEN_WBS.md:519`. |
| C002 | 18 | `docs/VISION.md:131` @0c1baf8d | TRUE |  |  |
| C003 | 87 | `game/js/rmmz_managers.js:1982-1991` | TRUE |  |  |
| C004 | 88 | `game/js/rmmz_managers.js:1993-2010` | TRUE |  |  |
| C005 | 91 | `game/js/rmmz_managers.js:2102-2112` | TRUE |  |  |
| C006 | 91 | `game/js/rmmz_managers.js:2146` | TRUE |  |  |
| C007 | 91 | `game/js/rmmz_managers.js:2157-2165` | TRUE |  |  |
| C008 | 92 | `game/js/rmmz_scenes.js:819-831` | IMPRECISE | Scene_Map.update calls updateMainMultiply (:824); updateMain is reached through :833-839. | §1.1 now cites the call at :824 and updateMainMultiply at :833-839. |
| C009 | 92 | `game/js/rmmz_scenes.js:841-846` | TRUE |  |  |
| C010 | 92 | `game/js/rmmz_scenes.js:833-839` | TRUE |  |  |
| C011 | 96 | `game/js/plugins/DEUS_Core.js:74-98` | TRUE |  |  |
| C012 | 97 | `game/js/plugins/DEUS_Jobs.js:1778` | TRUE |  |  |
| C013 | 100 | `game/js/plugins/DEUS_TimeSpeed.js:147-153` | TRUE |  |  |
| C014 | 100 | `game/js/plugins/DEUS_TimeSpeed.js:158-173` | TRUE |  |  |
| C015 | 101 | `game/js/plugins/DEUS_TimeSpeed.js:45-50` | TRUE |  |  |
| C016 | 103 | `game/js/plugins/DEUS_TimeSpeed.js:231-241` | TRUE |  |  |
| C017 | 103 | `game/js/plugins.js:184` | TRUE |  |  |
| C018 | 103 | `game/js/plugins/DEUS_Levels.js:4287` | TRUE |  |  |
| C019 | 103 | `game/js/plugins/DEUS_NaturalConnections.js:508` | TRUE |  |  |
| C020 | 103 | `game/js/plugins/DEUS_Depth.js:834` | TRUE |  |  |
| C021 | 105 | `game/js/plugins/DEUS_TimeSpeed.js:209-217` | TRUE |  |  |
| C022 | 108 | `game/js/plugins/DEUS_Core.js:60-62` | TRUE |  |  |
| C023 | 108 | `game/js/plugins/DEUS_Core.js:304-311` | TRUE |  |  |
| C024 | 108 | `game/js/plugins/DEUS_Core.js:376-378` | TRUE |  |  |
| C025 | 110 | `game/js/plugins/DEUS_Core.js:505-510` | TRUE |  |  |
| C026 | 110 | `game/js/plugins/DEUS_TimeSpeed.js:236` | TRUE |  |  |
| C027 | 111 | `game/js/plugins/DEUS_Core.js:305` | TRUE |  |  |
| C028 | 112 | `game/js/plugins/DEUS_Core.js:321-325` | TRUE |  |  |
| C029 | 112 | `docs/systems/UF_History.md:1161` | TRUE |  |  |
| C030 | 115 | `game/js/plugins/DEUS_Colonists.js:48` | TRUE |  |  |
| C031 | 116 | `game/js/plugins/DEUS_Environment.js:52` | TRUE |  |  |
| C032 | 117 | `game/js/plugins/DEUS_TimeSpeed.js:33` | TRUE |  |  |
| C033 | 119 | `docs/ARCHITECTURE.md:18` | TRUE |  |  |
| C034 | 122 | `game/js/plugins/DEUS_Ecology.js:994` | TRUE |  |  |
| C035 | 122 | `game/js/plugins/DEUS_Colonists.js:5750` | TRUE |  |  |
| C036 | 129 | `game/js/plugins/DEUS_World.js:2932` | TRUE |  |  |
| C037 | 129 | `game/js/plugins/DEUS_World.js:1677-1702` | TRUE |  |  |
| C038 | 130 | `game/js/plugins/DEUS_Fluid.js:1016` | TRUE |  |  |
| C039 | 130 | `game/js/plugins/DEUS_Fluid.js:731-752` | TRUE |  |  |
| C040 | 130 | `game/js/plugins/DEUS_Fluid.js:55` | TRUE |  |  |
| C041 | 131 | `game/js/plugins/DEUS_Ecology.js:992` | TRUE |  |  |
| C042 | 131 | `game/js/plugins/DEUS_Ecology.js:764-872` | TRUE |  |  |
| C043 | 131 | `game/js/plugins/DEUS_Ecology.js:994-999` | TRUE |  |  |
| C044 | 132 | `game/js/plugins/DEUS_Fire.js:617` | TRUE |  |  |
| C045 | 132 | `game/js/plugins/DEUS_Fire.js:138-140` | TRUE |  |  |
| C046 | 133 | `game/js/plugins/DEUS_Environment.js:796` | TRUE |  |  |
| C047 | 133 | `game/js/plugins/DEUS_Environment.js:690-710` | TRUE |  |  |
| C048 | 133 | `game/js/plugins/DEUS_Environment.js:730-744` | TRUE |  |  |
| C049 | 134 | `game/js/plugins/DEUS_Colonists.js:5748` | TRUE |  |  |
| C050 | 134 | `game/js/plugins/DEUS_Colonists.js:48` | TRUE |  |  |
| C051 | 134 | `game/js/plugins/DEUS_Colonists.js:63` | TRUE |  |  |
| C052 | 134 | `game/js/plugins/DEUS_Colonists.js:5750` | TRUE |  |  |
| C053 | 135 | `game/js/plugins/DEUS_Jobs.js:1777` | TRUE |  |  |
| C054 | 136 | `game/js/plugins/DEUS_Projects.js:1596` | TRUE |  |  |
| C055 | 136 | `game/js/plugins/DEUS_Projects.js:38` | TRUE |  |  |
| C056 | 137 | `game/js/plugins/DEUS_Combat.js:1414` | TRUE |  |  |
| C057 | 138 | `game/js/plugins/DEUS_Factions.js:657` | TRUE |  |  |
| C058 | 138 | `game/js/plugins/DEUS_Factions.js:631-632` | IMPRECISE | [writer, agreeing with the Rev 2 review] :631 is CONTACT_CELLS; the 120 is CONTACT_EVERY at :632. | §1.2 cites `DEUS_Factions.js:632`. |
| C059 | 139 | `game/js/plugins/DEUS_Ownership.js:613` | TRUE |  |  |
| C060 | 140 | `game/js/plugins/DEUS_TimeSpeed.js:189` | TRUE |  |  |
| C061 | 141 | `game/js/plugins/DEUS_Anim.js:1506` | TRUE |  |  |
| C062 | 141 | `game/js/plugins/DEUS_Anim.js:1509-1522` | TRUE |  |  |
| C063 | 142 | `game/js/plugins/DEUS_Fog.js:638` | TRUE |  |  |
| C064 | 142 | `game/js/plugins/DEUS_Fog.js:510-518` | TRUE |  |  |
| C065 | 142 | `game/js/plugins/DEUS_Fog.js:53` | TRUE |  |  |
| C066 | 143 | `game/js/plugins/DEUS_Wildlife.js:1195` | TRUE |  |  |
| C067 | 143 | `game/js/plugins/DEUS_Wildlife.js:1197` | TRUE |  |  |
| C068 | 144 | `game/js/plugins/DEUS_Core.js:505` | TRUE |  |  |
| C069 | 145 | `game/js/plugins/DEUS_Core.js:175` | TRUE |  |  |
| C070 | 146 | `game/js/plugins/DEUS_NaturalConnections.js:508` | TRUE |  |  |
| C071 | 146 | `game/js/plugins/DEUS_NaturalConnections.js:512-515` | TRUE |  |  |
| C072 | 147 | `game/js/plugins/DEUS_TimeSpeed.js:232` | TRUE |  |  |
| C073 | 148 | `game/js/plugins/DEUS_Combat.js:1479` | TRUE |  |  |
| C074 | 149 | `game/js/plugins/DEUS_Factions.js:751` | TRUE |  |  |
| C075 | 149 | `game/js/plugins/DEUS_Factions.js:1156` | TRUE |  |  |
| C076 | 150 | `game/js/plugins/DEUS_History.js:3662` | TRUE |  |  |
| C077 | 150 | `game/js/plugins/DEUS_History.js:3780` | TRUE |  |  |
| C078 | 151 | `game/js/plugins/DEUS_Levels.js:4287` | TRUE |  |  |
| C079 | 152 | `game/js/plugins/DEUS_Depth.js:834` | TRUE |  |  |
| C080 | 153 | `game/js/plugins/DEUS_ColonyOverseer.js:196` | TRUE |  |  |
| C081 | 153 | `game/js/plugins/DEUS_Containers.js:1323` | TRUE |  |  |
| C082 | 153 | `game/js/plugins/DEUS_Interact.js:885` | TRUE |  |  |
| C083 | 153 | `game/js/plugins/DEUS_Select.js:2289` | TRUE |  |  |
| C084 | 153 | `game/js/plugins/DEUS_Sheet.js:2252` | TRUE |  |  |
| C085 | 153 | `game/js/plugins/DEUS_Talk.js:1938` | TRUE |  |  |
| C086 | 159 | `game/js/plugins/DEUS_World.js:1677-1702` | TRUE |  |  |
| C087 | 160 | `game/js/plugins/DEUS_World.js:1686-1698` | TRUE |  |  |
| C088 | 160 | `game/js/plugins/DEUS_World.js:1633-1675` | TRUE |  |  |
| C089 | 160 | `game/js/plugins/DEUS_World.js:140` | TRUE |  |  |
| C090 | 161 | `game/js/plugins/DEUS_World.js:136` | TRUE |  |  |
| C091 | 161 | `game/js/plugins/DEUS_World.js:1689` | TRUE |  |  |
| C092 | 161 | `game/js/plugins/DEUS_World.js:1699-1701` | TRUE |  |  |
| C093 | 161 | `game/js/plugins/DEUS_World.js:1613-1628` | TRUE |  |  |
| C094 | 163 | `game/js/plugins/DEUS_World.js:847-855` | TRUE |  |  |
| C095 | 163 | `game/js/rmmz_objects.js:7062-7064` | TRUE |  |  |
| C096 | 166 | `game/js/rmmz_objects.js:888-911` | FALSE | The bare `:888-911` follows an rmmz_objects.js cite, so it resolves to the wrong file; the intended DEUS_World.js:888-911 (spawnUnitEvent) is right. | §1.3 names `spawnUnitEvent`, `DEUS_World.js:888-911`. |
| C097 | 169 | `game/js/plugins/DEUS_Fluid.js:737-745` | TRUE |  |  |
| C098 | 170 | `game/js/plugins/DEUS_World.js:127-128` | TRUE |  |  |
| C099 | 170 | `game/js/plugins.js:58` | TRUE |  |  |
| C100 | 170 | `game/js/plugins/DEUS_Fluid.js:356-376` | IMPRECISE | stepArea processes one queue up to its budget (:374), not "the whole queue"; the per-cell level decode is at :380-383. | §1.3 says "up to its budget per call" and cites `DEUS_Fluid.js:380-383`. |
| C101 | 173 | `game/js/plugins/DEUS_Ecology.js:22-27` | FALSE | Header :22-27 says "Every six game hours" (the population roll); hourly stepping is the comment at :876 and tickHour :888-905. (Rev 2 review, checklist 7.2.) | §1.3 cites :876, :888-905 for hourly and :907-914, :22-27, POPULATION_INTERVAL :45 for six-hourly. |
| C102 | 173 | `game/js/plugins/DEUS_Ecology.js:888-920` | TRUE |  |  |
| C103 | 173 | `game/js/plugins/DEUS_Ecology.js:878-886` | TRUE |  |  |
| C104 | 175 | `game/js/plugins/DEUS_World.js:532` | TRUE |  |  |
| C105 | 175 | `game/js/plugins/DEUS_World.js:106-108` | TRUE |  |  |
| C106 | 176 | `game/js/plugins/DEUS_Ecology.js:803` | TRUE |  |  |
| C107 | 177 | `game/js/plugins/DEUS_Ecology.js:452-453` | TRUE |  |  |
| C108 | 179 | `game/js/plugins/DEUS_Fire.js:488-494` | TRUE |  |  |
| C109 | 179 | `game/js/plugins/DEUS_Fire.js:562-588` | TRUE |  |  |
| C110 | 182 | `game/js/plugins/DEUS_Sheet.js:833-846` | TRUE |  |  |
| C111 | 183 | `game/js/plugins/DEUS_Anim.js:702` | TRUE |  |  |
| C112 | 183 | `game/js/plugins/DEUS_Anim.js:714` | TRUE |  |  |
| C113 | 183 | `game/js/plugins/DEUS_Anim.js:1504-1522` | TRUE |  |  |
| C114 | 183 | `game/js/plugins/DEUS_Anim.js:1605-1631` | TRUE |  |  |
| C115 | 183 | `game/js/plugins/DEUS_Anim.js:1624` | TRUE |  |  |
| C116 | 184 | `game/js/plugins/DEUS_Culling.js:292-307` | TRUE |  |  |
| C117 | 185 | `game/js/plugins/DEUS_Tiles.js:505-512` | TRUE |  |  |
| C118 | 185 | `game/js/plugins/DEUS_Tiles.js:1247-1256` | TRUE |  |  |
| C119 | 186 | `game/js/plugins/DEUS_Camera.js:85-93` | TRUE |  |  |
| C120 | 186 | `game/js/rmmz_objects.js:9220-9224` | TRUE |  |  |
| C121 | 189 | `game/js/plugins/DEUS_World.js:595-640` | TRUE |  |  |
| C122 | 189 | `game/js/plugins/DEUS_World.js:801` | TRUE |  |  |
| C123 | 189 | `game/js/plugins/DEUS_World.js:811-822` | TRUE |  |  |
| C124 | 190 | `game/js/plugins/DEUS_World.js:2819-2820` | TRUE |  |  |
| C125 | 191 | `game/js/plugins/DEUS_World.js:535-539` | TRUE |  |  |
| C126 | 191 | `game/js/plugins/DEUS_Levels.js:4179-4193` | TRUE |  |  |
| C127 | 191 | `game/js/plugins/DEUS_World.js:2724-2730` | TRUE |  |  |
| C128 | 195 | `game/js/plugins/DEUS_NaturalConnections.js:312-329` | TRUE |  |  |
| C129 | 195 | `game/js/plugins/DEUS_NaturalConnections.js:352-353` | TRUE |  |  |
| C130 | 196 | `game/js/plugins/DEUS_Fluid.js:896-923` | TRUE |  |  |
| C131 | 197 | `game/js/plugins/DEUS_Ecology.js:736-752` | TRUE |  |  |
| C132 | 197 | `game/js/plugins/DEUS_Ecology.js:20` | TRUE |  |  |
| C133 | 197 | `docs/INVARIANT_REGISTRY.md:53` | TRUE |  |  |
| C134 | 198 | `game/js/plugins/DEUS_Levels.js:1700-1702` | TRUE |  |  |
| C135 | 198 | `game/js/plugins/DEUS_Levels.js:1720-1722` | TRUE |  |  |
| C136 | 198 | `game/js/plugins/DEUS_Levels.js:1001-1002` | TRUE |  |  |
| C137 | 198 | `docs/RISK_REGISTER.md:60` | TRUE |  |  |
| C138 | 201 | `game/js/plugins/DEUS_Colonists.js:648-670` | TRUE |  |  |
| C139 | 204 | `game/js/plugins/DEUS_Factions.js:594-625` | TRUE |  |  |
| C140 | 206 | `game/js/plugins/DEUS_Core.js:448-468` | TRUE |  |  |
| C141 | 207 | `game/js/plugins/DEUS_Fluid.js:846-866` | TRUE |  |  |
| C142 | 208 | `game/js/plugins/DEUS_World.js:2915` | TRUE |  |  |
| C143 | 209 | `game/js/plugins/DEUS_TimeSpeed.js:54` | TRUE |  |  |
| C144 | 209 | `game/js/plugins/DEUS_TimeSpeed.js:84-95` | TRUE |  |  |
| C145 | 214 | `game/js/plugins/DEUS_World.js:187-211` | TRUE |  |  |
| C146 | 215 | `game/js/plugins/DEUS_World.js:545-548` | TRUE |  |  |
| C147 | 216 | `game/js/plugins/DEUS_World.js:556` | TRUE |  |  |
| C148 | 218 | `game/js/plugins/DEUS_World.js:429` | TRUE |  |  |
| C149 | 218 | `game/js/plugins/DEUS_World.js:1133` | TRUE |  |  |
| C150 | 219 | `game/js/plugins/DEUS_Items.js:304` | TRUE |  |  |
| C151 | 220 | `game/js/plugins/DEUS_Jobs.js:101-107` | TRUE |  |  |
| C152 | 221 | `game/js/plugins/DEUS_Fire.js:214` | TRUE |  |  |
| C153 | 222 | `game/js/plugins/DEUS_Fluid.js:50-58` | TRUE |  |  |
| C154 | 222 | `game/js/plugins/DEUS_Fluid.js:127-137` | IMPRECISE | The Uint8Array grids are created at :179, :187-189, not in :50-58 or :127-137. | §1.5 cites DEPTH_MAX :50, packing :127-137, grids :179 and :187-189. |
| C155 | 222 | `game/js/plugins/DEUS_Fluid.js:55` | TRUE |  |  |
| C156 | 222 | `game/js/plugins/DEUS_Fluid.js:356-376` | TRUE |  |  |
| C157 | 225 | `tools/test_liquid_depth_simulation.js:121-125` | TRUE |  |  |
| C158 | 225 | `game/js/plugins/DEUS_Fluid.js:1025-1026` | TRUE |  |  |
| C159 | 226 | `tools/bench_history_sim.js:13` | TRUE |  |  |
| C160 | 226 | `tools/bench_history_sim.js:37-122` @ebeec892 | TRUE |  |  |
| C161 | 226 | `tools/bench_history_sim.js:66-67` @ebeec892 | TRUE |  |  |
| C162 | 259 | `game/js/plugins/DEUS_Fog.js:119` | TRUE |  |  |
| C163 | 259 | `game/js/plugins/DEUS_Minimap.js:840-843` | TRUE |  |  |
| C164 | 259 | `game/js/plugins/DEUS_Select.js:321` | TRUE |  |  |
| C165 | 259 | `game/js/plugins/DEUS_Select.js:3411` | TRUE |  |  |
| C166 | 259 | `game/js/plugins/DEUS_Levels.js:4203-4204` | TRUE |  |  |
| C167 | 260 | `game/js/plugins/DEUS_DayNight.js:121-127` | TRUE |  |  |
| C168 | 260 | `game/js/plugins/DEUS_Environment.js:690-710` | TRUE |  |  |
| C169 | 290 | `game/js/plugins/DEUS_World.js:187-211` | TRUE |  |  |
| C170 | 293 | `game/js/rmmz_core.js:2672` | TRUE |  |  |
| C171 | 293 | `game/js/rmmz_core.js:2682` | TRUE |  |  |
| C172 | 293 | `game/js/rmmz_core.js:2694` | TRUE |  |  |
| C173 | 293 | `game/js/rmmz_core.js:2726` | TRUE |  |  |
| C174 | 293 | `game/js/rmmz_core.js:2793` | TRUE |  |  |
| C175 | 318 | `tools/bench_history_sim.js:66-67` | TRUE |  |  |
| C176 | 319 | `game/js/plugins/DEUS_Core.js:98` | TRUE |  |  |
| C177 | 336 | `docs/INVARIANT_REGISTRY.md:52` | TRUE |  |  |
| C178 | 361 | `docs/ARCHITECTURE.md:18` | TRUE |  |  |
| C179 | 366 | `game/js/plugins/DEUS_Core.js:60-61` | TRUE |  |  |
| C180 | 376 | `game/js/plugins/DEUS_Core.js:321-325` | TRUE |  |  |
| C181 | 382 | `game/js/plugins/DEUS_World.js:136` | TRUE |  |  |
| C182 | 383 | `game/js/plugins/DEUS_World.js:140` | TRUE |  |  |
| C183 | 384 | `game/js/plugins/DEUS_Ecology.js:996` | TRUE |  |  |
| C184 | 385 | `game/js/plugins/DEUS_Fire.js:138-140` | TRUE |  |  |
| C185 | 386 | `game/js/plugins/DEUS_Environment.js:52` | TRUE |  |  |
| C186 | 387 | `game/js/plugins/DEUS_Colonists.js:48` | TRUE |  |  |
| C187 | 387 | `game/js/plugins/DEUS_Colonists.js:63` | TRUE |  |  |
| C188 | 388 | `game/js/plugins/DEUS_Factions.js:631-632` | IMPRECISE | [writer, agreeing with the Rev 2 review] as C058. | §3.3 cites `DEUS_Factions.js:632`. |
| C189 | 389 | `game/js/plugins/DEUS_NaturalConnections.js:512` | TRUE |  |  |
| C190 | 390 | `game/js/plugins/DEUS_Projects.js:38` | TRUE |  |  |
| C191 | 391 | `game/js/plugins/DEUS_Fluid.js:55` | TRUE |  |  |
| C192 | 391 | `game/js/plugins/DEUS_Fluid.js:1016-1019` | TRUE |  |  |
| C193 | 392 | `game/js/plugins/DEUS_Core.js:60-62` | TRUE |  |  |
| C194 | 392 | `game/js/plugins/DEUS_Core.js:304-311` | TRUE |  |  |
| C195 | 400 | `game/js/plugins/DEUS_TimeSpeed.js:158-173` | TRUE |  |  |
| C196 | 423 | `game/js/plugins/DEUS_TimeSpeed.js:46-47` | TRUE |  |  |
| C197 | 424 | `game/js/plugins/DEUS_TimeSpeed.js:147-153` | TRUE |  |  |
| C198 | 424 | `game/js/plugins/DEUS_TimeSpeed.js:155-185` | TRUE |  |  |
| C199 | 424 | `game/js/plugins/DEUS_TimeSpeed.js:231-241` | TRUE |  |  |
| C200 | 473 | `game/js/plugins/DEUS_World.js:1709-1710` | TRUE |  |  |
| C201 | 499 | `game/js/plugins/DEUS_Fluid.js:184` | TRUE |  |  |
| C202 | 499 | `game/js/plugins/DEUS_Fluid.js:671` | TRUE |  |  |
| C203 | 517 | `game/js/plugins/DEUS_World.js:613` | TRUE |  |  |
| C204 | 545 | `game/js/plugins/DEUS_Core.js:256-272` | TRUE |  |  |
| C205 | 545 | `game/js/plugins/DEUS_Core.js:268` | TRUE |  |  |
| C206 | 545 | `game/js/plugins/DEUS_World.js:1418-1420` | TRUE |  |  |
| C207 | 596 | `game/js/plugins/DEUS_Environment.js:88` | TRUE |  |  |
| C208 | 596 | `game/js/plugins/DEUS_Environment.js:120` | TRUE |  |  |
| C209 | 602 | `game/js/plugins/DEUS_World.js:535-539` | TRUE |  |  |
| C210 | 611 | `docs/OWNER_DECISIONS.md:171-187` @0c1baf8d | TRUE |  |  |
| C211 | 612 | `game/js/plugins/DEUS_World.js:155` | TRUE |  |  |
| C212 | 618 | `game/js/plugins/DEUS_Minimap.js:56-58` | TRUE |  |  |
| C213 | 621 | `game/js/plugins/DEUS_Camera.js:35-51` | TRUE |  |  |
| C214 | 707 | `game/js/plugins/DEUS_Ecology.js:214` | TRUE |  |  |
| C215 | 707 | `game/js/plugins/DEUS_Ecology.js:672-678` | TRUE |  |  |
| C216 | 707 | `game/js/plugins/DEUS_Ecology.js:722` | TRUE |  |  |
| C217 | 707 | `game/js/plugins/DEUS_Ecology.js:888-920` | TRUE |  |  |
| C218 | 708 | `game/js/plugins/DEUS_Ecology.js:127` | TRUE |  |  |
| C219 | 708 | `game/js/plugins/DEUS_Ecology.js:772-796` | TRUE |  |  |
| C220 | 708 | `game/js/plugins/DEUS_Ecology.js:736-752` | TRUE |  |  |
| C221 | 709 | `game/js/plugins/DEUS_Fluid.js:127-137` | IMPRECISE | :127-137 are the byte-packing helpers; the per-level grids are at :179, :188. | §6 Fluids row cites :127-137 and :179, :187-189. |
| C222 | 709 | `game/js/plugins/DEUS_Fluid.js:457` | TRUE |  |  |
| C223 | 710 | `game/js/plugins/DEUS_Fire.js:214` | TRUE |  |  |
| C224 | 710 | `game/js/plugins/DEUS_Fire.js:389` | TRUE |  |  |
| C225 | 711 | `game/js/plugins/DEUS_World.js:595-640` | IMPRECISE | buildArea runs to :689; the generators run at :650 and diffs replay at :682-685. | §6 Geology row cites `DEUS_World.js:599-689`, :650, :682-685. |
| C226 | 711 | `game/js/plugins/DEUS_World.js:811-822` | TRUE |  |  |
| C227 | 712 | `game/js/plugins/DEUS_History.js:363-410` | TRUE |  |  |
| C228 | 712 | `game/js/plugins/DEUS_History.js:390-395` | TRUE |  |  |
| C229 | 712 | `game/js/plugins/DEUS_HistoricalDemographics.js:468` | TRUE |  |  |
| C230 | 712 | `game/js/plugins/DEUS_HistoricalDemographics.js:8-9` | TRUE |  |  |
| C231 | 713 | `game/js/plugins/DEUS_Jobs.js:101-107` | TRUE |  |  |
| C232 | 713 | `game/js/plugins/DEUS_Projects.js:179-189` | TRUE |  |  |
| C233 | 714 | `game/js/plugins/DEUS_Items.js:304` | TRUE |  |  |
| C234 | 715 | `game/js/plugins/DEUS_Environment.js:88` | TRUE |  |  |
| C235 | 715 | `game/js/plugins/DEUS_Environment.js:120` | TRUE |  |  |
| C236 | 716 | `game/js/plugins/DEUS_Factions.js:656-660` | TRUE |  |  |
| C237 | 716 | `game/js/plugins/DEUS_Factions.js:194` | TRUE |  |  |
| C238 | 716 | `game/js/plugins/DEUS_Factions.js:594-625` | TRUE |  |  |
| C239 | 739 | `game/js/plugins/DEUS_World.js:187-211` | TRUE |  |  |
| C240 | 753 | `game/js/plugins/DEUS_Fluid.js:517-532` | TRUE |  |  |
| C241 | 754 | `game/js/plugins/DEUS_Fluid.js:896-923` | TRUE |  |  |
| C242 | 759 | `game/js/plugins/DEUS_Ecology.js:463-470` | TRUE |  |  |
| C243 | 778 | `game/js/plugins/DEUS_World.js:1133` | TRUE |  |  |
| C244 | 779 | `game/js/plugins/DEUS_Factions.js:594-625` | FALSE | world:unitRemoved lowers faction population only for a dead or dying unit (:620); a live removed unit does not lower it. The Rev 2 claim that absorption would lower counters is wrong as stated. | §1.4 and §7.4 reworded; the dead-or-dying test cited at `DEUS_Factions.js:620`, handler :619-625. |
| C245 | 786 | `docs/systems/UF_History.md:102` | TRUE |  |  |
| C246 | 790 | `game/js/plugins/DEUS_World.js:1136-1137` | TRUE |  |  |
| C247 | 801 | `game/js/plugins/DEUS_World.js:1739` | TRUE |  |  |
| C248 | 801 | `game/js/plugins/DEUS_World.js:2915` | TRUE |  |  |
| C249 | 826 | `game/js/plugins/DEUS_Fluid.js:9-18` | TRUE |  |  |
| C250 | 826 | `game/js/plugins/DEUS_Fluid.js:52` | IMPRECISE | :52 is TYPE_WATER; the depth scale is DEPTH_MAX = 7 at :50. | §7.8 Q-WATER cites `DEPTH_MAX = 7`, `:50`. |
| C251 | 832 | `game/js/plugins/DEUS_Items.js:304` | TRUE |  |  |
| C252 | 835 | `game/js/plugins/DEUS_Fire.js:389` | TRUE |  |  |
| C253 | 836 | `game/js/plugins/DEUS_Colonists.js:1548` | IMPRECISE | :1548 only zeroes foodLb/waterGal; the rounding is at :5389 and :5410-5411. | §7.8 Q-FOOD cites `DEUS_Colonists.js:5389`, `:5410-5411`. |
| C254 | 849 | `docs/RISK_REGISTER.md:61` | TRUE |  |  |
| C255 | 886 | `game/js/plugins/DEUS_Core.js:321-325` | TRUE |  |  |
| C256 | 899 | `game/js/plugins/DEUS_Sheet.js:833-846` | TRUE |  |  |
| C257 | 900 | `game/js/plugins/DEUS_Anim.js:1504-1522` | TRUE |  |  |
| C258 | 900 | `game/js/plugins/DEUS_Anim.js:1605-1631` | TRUE |  |  |
| C259 | 900 | `game/js/plugins/DEUS_Ownership.js:613` | TRUE |  |  |
| C260 | 900 | `game/js/plugins/DEUS_TimeSpeed.js:84-95` | TRUE |  |  |
| C261 | 900 | `game/js/plugins/DEUS_TimeSpeed.js:188-203` | TRUE |  |  |
| C262 | 907 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:105` @0c1baf8d | TRUE |  |  |
| C263 | 908 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:525-528` @0c1baf8d | TRUE |  |  |
| C264 | 909 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:529-533` @0c1baf8d | TRUE |  |  |
| C265 | 914 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:609` | FALSE | WBS :609 is blank at b612bc72; the "Step 8" line is :650. Stale: it was :609 at the lane base ebeec892. | §8 cites `docs/worldgen/DEUS_WORLDGEN_WBS.md:650`. |
| C266 | 946 | `game/js/plugins/DEUS_Core.js:264-270` | TRUE |  |  |
| C267 | 958 | `game/js/plugins/DEUS_World.js:411` | TRUE |  |  |
| C268 | 958 | `game/js/plugins/DEUS_World.js:418` | TRUE |  |  |
| C269 | 959 | `game/js/plugins/DEUS_Dnd5e.js:415` | TRUE |  |  |
| C270 | 959 | `game/js/plugins/DEUS_Dnd5e.js:720` | TRUE |  |  |
| C271 | 959 | `game/js/plugins/DEUS_Dnd5e.js:800` | TRUE |  |  |
| C272 | 960 | `game/js/plugins/DEUS_FactionMenus.js:442` | TRUE |  |  |
| C273 | 960 | `game/js/plugins/DEUS_FactionMenus.js:468` | TRUE |  |  |
| C274 | 960 | `game/js/plugins/DEUS_FactionMenus.js:478` | TRUE |  |  |
| C275 | 961 | `game/js/plugins/DEUS_Visuals.js:151-171` | TRUE |  |  |
| C276 | 965 | `game/js/plugins/DEUS_Fire.js:575` | TRUE |  |  |
| C277 | 966 | `game/js/plugins/DEUS_World.js:545-548` | TRUE |  |  |
| C278 | 966 | `game/js/plugins/DEUS_World.js:556` | TRUE |  |  |
| C279 | 972 | `game/js/plugins/DEUS_World.js:800-808` | TRUE |  |  |
| C280 | 972 | `game/js/plugins/DEUS_World.js:2819-2820` | TRUE |  |  |
| C281 | 978 | `game/js/plugins/DEUS_Fluid.js:733` | TRUE |  |  |
| C282 | 978 | `game/js/plugins/DEUS_Fluid.js:747` | TRUE |  |  |
| C283 | 979 | `game/js/plugins/DEUS_Combat.js:1416-1422` | TRUE |  |  |
| C284 | 980 | `game/js/plugins/DEUS_Ecology.js:68` | TRUE |  |  |
| C285 | 982 | `game/js/plugins/DEUS_Fluid.js:55` | TRUE |  |  |
| C286 | 992 | `game/js/plugins/DEUS_Ecology.js:442-453` | TRUE |  |  |
| C287 | 1025 | `game/js/plugins/DEUS_World.js:2901-2905` | TRUE |  |  |
| C288 | 1025 | `game/js/plugins/DEUS_World.js:2907-2916` | TRUE |  |  |
| C289 | 1026 | `game/js/plugins/DEUS_Anim.js:1075` | TRUE |  |  |
| C290 | 1027 | `game/js/plugins/DEUS_Select.js:321` | TRUE |  |  |
| C291 | 1028 | `game/js/plugins/DEUS_Levels.js:4203-4204` | TRUE |  |  |
| C292 | 1028 | `game/js/plugins/DEUS_Select.js:3411` | TRUE |  |  |
| C293 | 1029 | `game/js/plugins/DEUS_Fog.js:119` | TRUE |  |  |
| C294 | 1030 | `game/js/plugins/DEUS_Minimap.js:840-843` | TRUE |  |  |
| C295 | 1031 | `game/js/plugins/DEUS_Fluid.js:821-844` | TRUE |  |  |
| C296 | 1031 | `game/js/plugins/DEUS_Fluid.js:994-1011` | TRUE |  |  |
| C297 | 1032 | `game/js/plugins/DEUS_Core.js:448-468` | TRUE |  |  |
| C298 | 1032 | `game/js/plugins/DEUS_Core.js:471-490` | TRUE |  |  |
| C299 | 1034 | `game/js/rmmz_managers.js:389` | TRUE |  |  |
| C300 | 1034 | `game/js/rmmz_managers.js:405` | TRUE |  |  |
| C301 | 1093 | `game/js/plugins/DEUS_Environment.js:88` | TRUE |  |  |
| C302 | 1093 | `game/js/plugins/DEUS_Environment.js:120` | TRUE |  |  |
| C303 | 1093 | `game/js/plugins/DEUS_Items.js:163` | TRUE |  |  |
| C304 | 1106 | `game/js/plugins/DEUS_Ownership.js:613` | TRUE |  |  |
| C305 | 1106 | `game/js/plugins/DEUS_TimeSpeed.js:84-95` | TRUE |  |  |
| C306 | 1106 | `game/js/plugins/DEUS_TimeSpeed.js:188-203` | TRUE |  |  |
| C307 | 1106 | `game/js/plugins/DEUS_Anim.js:1504-1522` | TRUE |  |  |
| C308 | 1106 | `game/js/plugins/DEUS_Anim.js:1605-1631` | TRUE |  |  |
| C309 | 1110 | `docs/systems/UF_History.md:106` | TRUE |  |  |
| C310 | 1111 | `game/js/plugins/DEUS_Ecology.js:736-752` | TRUE |  |  |
| C311 | 1113 | `docs/ARCHITECTURE.md:18` | TRUE |  |  |
| C312 | 1116 | `game/js/plugins/DEUS_Core.js:321-325` | TRUE |  |  |
| C313 | 1116 | `docs/systems/UF_History.md:1161` | TRUE |  |  |
| C314 | 1129 | `game/js/plugins/UF_Core.js:13` | TRUE |  |  |
| C315 | 1132 | `game/js/plugins/DEUS_Callings.js:404` | TRUE |  |  |
| C316 | 1133 | `game/js/plugins/DEUS_DeathForensics.js:542` | TRUE |  |  |
| C317 | 1134 | `game/js/plugins/DEUS_Fluid.js:1026` | TRUE |  |  |
| C318 | 1135 | `game/js/plugins/DEUS_Containers.js:1345` | TRUE |  |  |
| C319 | 1136 | `game/js/plugins/UF_Households.js:1067` | TRUE |  |  |
| C320 | 1142 | `game/package.json:3` | IMPRECISE | package.json :3 is the generic "main" key; the NW.js window and chromium-args are :4-11. | §13.5 cites `game/package.json:4-11`. |
| C321 | 1142 | `game/js/plugins/DEUS_Core.js:69` | TRUE |  |  |
| C322 | 1142 | `game/js/plugins/DEUS_Core.js:98` | TRUE |  |  |
| C323 | 1142 | `game/js/plugins/DEUS_Core.js:134` | TRUE |  |  |
| C324 | 1142 | `game/js/plugins/DEUS_FactionMenus.js:455` | TRUE |  |  |
| C325 | 1143 | `game/js/rmmz_core.js:471` | TRUE |  |  |
| C326 | 1143 | `game/js/rmmz_core.js:808` | TRUE |  |  |
| C327 | 1143 | `game/js/rmmz_core.js:1177` | TRUE |  |  |
| C328 | 1143 | `game/js/rmmz_core.js:1851` | TRUE |  |  |
| C329 | 1143 | `game/js/plugins/DEUS_Depth.js:219` | TRUE |  |  |
| C330 | 1143 | `game/js/plugins/DEUS_Depth.js:685` | TRUE |  |  |
| C331 | 1144 | `game/js/rmmz_core.js:2185` | TRUE |  |  |
| C332 | 1144 | `game/js/rmmz_core.js:2672` | TRUE |  |  |
| C333 | 1144 | `game/js/rmmz_core.js:2682` | TRUE |  |  |
| C334 | 1144 | `game/js/rmmz_core.js:2694` | TRUE |  |  |
| C335 | 1144 | `game/js/rmmz_core.js:2726` | TRUE |  |  |
| C336 | 1144 | `game/js/rmmz_core.js:2793` | TRUE |  |  |
| C337 | 1145 | `game/js/rmmz_scenes.js:747` | TRUE |  |  |
| C338 | 1145 | `game/js/rmmz_sprites.js:3345` | TRUE |  |  |
| C339 | 1146 | `game/js/rmmz_core.js:5652` | TRUE |  |  |
| C340 | 1146 | `game/js/rmmz_core.js:6021` | TRUE |  |  |
| C341 | 1147 | `game/js/rmmz_managers.js:1103` | TRUE |  |  |
| C342 | 1147 | `game/js/rmmz_managers.js:1491` | TRUE |  |  |
| C343 | 1148 | `game/js/rmmz_managers.js:345` | TRUE |  |  |
| C344 | 1148 | `game/js/rmmz_managers.js:389` | TRUE |  |  |
| C345 | 1148 | `game/js/rmmz_managers.js:405` | TRUE |  |  |
| C346 | 1148 | `game/js/rmmz_managers.js:538` | TRUE |  |  |
| C347 | 1148 | `game/js/rmmz_core.js:6416` | TRUE |  |  |
| C348 | 1149 | `game/js/plugins/DEUS_WorldGen.js:45-46` | TRUE |  |  |
| C349 | 1149 | `game/js/plugins/DEUS_Look.js:93` | TRUE |  |  |
| C350 | 1149 | `game/js/plugins/DEUS_World.js:2813` | TRUE |  |  |
| C351 | 1150 | `game/js/plugins/DEUS_Sheet.js:1158` | TRUE |  |  |
| C352 | 1150 | `game/js/plugins/DEUS_Interact.js:525` | TRUE |  |  |
| C353 | 1150 | `game/js/plugins/DEUS_ColonyOverseer.js:173` | TRUE |  |  |
| C354 | 1151 | `game/js/plugins/DEUS_World.js:899` | TRUE |  |  |
| C355 | 1152 | `game/js/rmmz_managers.js:1982-2112` | TRUE |  |  |
| C356 | 1167 | `game/js/plugins/DEUS_History.js:3396-3408` | TRUE |  |  |
| C357 | 1167 | `game/js/plugins/DEUS_History.js:363-410` | TRUE |  |  |
| C358 | 1168 | `game/js/plugins/DEUS_History.js:390-395` | TRUE |  |  |
| C359 | 1168 | `game/js/plugins/DEUS_HistoricalDemographics.js:468` | TRUE |  |  |
| C360 | 1169 | `game/js/plugins/DEUS_HistoricalDemographics.js:8-9` | TRUE |  |  |
| C361 | 1172 | `game/js/plugins/DEUS_History.js:428-557` | TRUE |  |  |
| C362 | 1173 | `game/js/plugins/DEUS_HistoricalDemographics.js:319` | TRUE |  |  |
| C363 | 1173 | `game/js/plugins/DEUS_HistoricalDemographics.js:397` | TRUE |  |  |
| C364 | 1173 | `game/js/plugins/DEUS_History.js:547` | TRUE |  |  |
| C365 | 1174 | `docs/systems/UF_History.md:93` | TRUE |  |  |
| C366 | 1174 | `docs/systems/UF_History.md:106` | TRUE |  |  |
| C367 | 1177 | `game/js/plugins/DEUS_History.js:1665-2732` | TRUE |  |  |
| C368 | 1177 | `game/js/plugins/DEUS_History.js:1658-1664` | TRUE |  |  |
| C369 | 1177 | `game/js/plugins/DEUS_History.js:1704-1712` | TRUE |  |  |
| C370 | 1177 | `game/js/plugins/DEUS_History.js:1845-1862` | TRUE |  |  |
| C371 | 1177 | `game/js/plugins/DEUS_History.js:2725-2726` | TRUE |  |  |
| C372 | 1178 | `game/js/plugins/DEUS_History.js:3409-3426` | TRUE |  |  |
| C373 | 1179 | `game/data/UF_WorldCatalog.json:7670-7675` | TRUE |  |  |
| C374 | 1180 | `game/data/UF_WorldCatalog.json:6128-6146` | TRUE |  |  |
| C375 | 1183 | `docs/systems/UF_History.md:192-201` | TRUE |  |  |
| C376 | 1184 | `docs/systems/UF_History.md:31-44` | TRUE |  |  |
| C377 | 1197 | `docs/systems/UF_History.md:106` | TRUE |  |  |
| C378 | 1202 | `docs/systems/UF_History.md:192-201` | IMPRECISE | UF_History.md :192-201 give timings; the byte-identical repeats are stated at :207. | §14.2 item 5 cites :194-201 and :207. |
| C379 | 1205 | `docs/systems/UF_History.md:31-44` | IMPRECISE | UF_History.md :31-44 is the integration matrix (worker time includes generation and materialization, :27), not a demographics-only run. | §14.1 and §14.2 item 6 reworded and cite :27, :31-44. |
| C380 | 1211 | `docs/INVARIANT_REGISTRY.md:51` | TRUE |  |  |
| C381 | 1212 | `docs/systems/UF_History.md:106` | TRUE |  |  |
| C382 | 1213 | `game/js/plugins/DEUS_FactionMenus.js:280-292` | TRUE |  |  |
| C383 | 1220 | `docs/OWNER_DECISIONS.md:171-187` @0c1baf8d | TRUE |  |  |
| C384 | 1225 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:105` @0c1baf8d | TRUE |  |  |
| C385 | 1231 | `game/js/plugins/DEUS_World.js:155` | TRUE |  |  |
| C386 | 1231 | `game/js/plugins/DEUS_World.js:156` | TRUE |  |  |
| C387 | 1231 | `game/js/plugins/DEUS_World.js:158` | TRUE |  |  |
| C388 | 1232 | `game/js/plugins/DEUS_Levels.js:61` | TRUE |  |  |
| C389 | 1232 | `game/js/plugins/DEUS_Levels.js:150` | TRUE |  |  |
| C390 | 1232 | `game/js/plugins/DEUS_Levels.js:998` | TRUE |  |  |
| C391 | 1232 | `game/js/plugins/DEUS_Levels.js:1137` | TRUE |  |  |
| C392 | 1232 | `game/js/plugins/DEUS_Levels.js:1141` | TRUE |  |  |
| C393 | 1232 | `game/js/plugins/DEUS_Levels.js:1805` | TRUE |  |  |
| C394 | 1233 | `game/js/plugins/DEUS_Fluid.js:56-58` | TRUE |  |  |
| C395 | 1233 | `game/js/plugins/DEUS_Fluid.js:291` | TRUE |  |  |
| C396 | 1234 | `game/js/plugins/DEUS_Minimap.js:59-60` | TRUE |  |  |
| C397 | 1243 | `game/js/plugins/DEUS_Levels.js:993` | TRUE |  |  |
| C398 | 1266 | `game/js/plugins/DEUS_Levels.js:1037` | TRUE |  |  |
| C399 | 1267 | `game/js/plugins/DEUS_World.js:613` | TRUE |  |  |
| C400 | 1268 | `game/js/plugins/DEUS_Fluid.js:179-183` | TRUE |  |  |
| C401 | 1269 | `game/js/plugins/DEUS_World.js:605` | TRUE |  |  |
| C402 | 1269 | `game/js/plugins/DEUS_World.js:801` | TRUE |  |  |
| C403 | 1281 | `game/js/plugins/DEUS_Levels.js:997` | TRUE |  |  |
| C404 | 1281 | `game/js/plugins/DEUS_Levels.js:1110-1114` | TRUE |  |  |
| C405 | 1281 | `game/js/plugins/DEUS_Levels.js:990-991` | TRUE |  |  |
| C406 | 1282 | `game/js/plugins/DEUS_Fluid.js:821-844` | TRUE |  |  |
| C407 | 1302 | `docs/VISION.md:131` @0c1baf8d | TRUE |  |  |
| C408 | 1302 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:525-528` @0c1baf8d | TRUE |  |  |
| C409 | 1306 | `game/js/plugins/DEUS_Levels.js:1000-1010` | TRUE |  |  |
| C410 | 1307 | `game/js/plugins/DEUS_Levels.js:1785-1795` | IMPRECISE | [writer, agreeing with the Rev 2 review, checklist 7.1] :1785-1795 is the JSDoc and signature; damageCell is called at :1815 (box) and :1849 (sphere). | §16.1 cites :1783-1794, :1795, :1815, :1849. |
| C411 | 1307 | `game/js/plugins/DEUS_Levels.js:1708-1725` | TRUE |  |  |
| C412 | 1308 | `game/js/plugins/DEUS_Levels.js:1001-1002` | TRUE |  |  |
| C413 | 1308 | `game/js/plugins/DEUS_Levels.js:1700-1702` | TRUE |  |  |
| C414 | 1309 | `game/js/plugins/DEUS_Colonists.js:3736` | TRUE |  |  |
| C415 | 1310 | `docs/OWNER_DECISIONS.md:137` | TRUE |  |  |
| C416 | 1311 | `game/js/plugins/DEUS_Fluid.js:941-944` | TRUE |  |  |
| C417 | 1340 | `game/js/plugins/DEUS_Doors.js:444-445` | TRUE |  |  |
| C418 | 1371 | `docs/VISION.md:132` @0c1baf8d | IMPRECISE | VISION :132 names directive 0021-V §7 only; §8 is from the directive text. | §17 intro: "from directive 0021-V §7. The geology end state is directive 0021-V §8." |
| C419 | 1371 | `docs/worldgen/DEUS_WORLDGEN_WBS.md:529-533` @0c1baf8d | TRUE |  |  |
| C420 | 1371 | `docs/RISK_REGISTER.md:60-62` | TRUE |  |  |
| C421 | 1375 | `game/js/plugins/DEUS_HistoricalDemographics.js:521` | TRUE |  |  |
| C422 | 1376 | `game/js/plugins/DEUS_Doors.js:18` | IMPRECISE | Doors :18 is the header comment; the "rubble" default is at :444. | §17.1 cites `DEUS_Doors.js:444`, the break :442-451, header :18; says "doors". |
| C423 | 1376 | `game/js/plugins/DEUS_Doors.js:444-451` | TRUE |  |  |
| C424 | 1376 | `game/data/UF_WorldCatalog.json:2147` | TRUE |  |  |
| C425 | 1376 | `game/data/UF_WorldCatalog.json:2188` | TRUE |  |  |
| C426 | 1377 | `game/js/plugins/DEUS_Ecology.js:764-872` | IMPRECISE | :764-872 (stepBeat) covers sprouts by beat count; regrowth records are scheduled and processed by game hour at :308-387. | §17.1 cites scheduleResource/processResources :308-389 and stepBeat :764-873. |
| C427 | 1387 | `game/js/plugins/DEUS_Levels.js:995` | TRUE |  |  |
| C428 | 1415 | `docs/RISK_REGISTER.md:61` | TRUE |  |  |
| C429 | 1421 | `docs/RISK_REGISTER.md:62` | TRUE |  |  |
| C430 | 1429 | `docs/RISK_REGISTER.md:74` | TRUE |  |  |
| C431 | 1431 | `docs/RISK_REGISTER.md:63` | TRUE |  |  |
| C432 | 1454 | `game/js/plugins/DEUS_Anim.js:1506` | TRUE |  |  |
| C433 | 1454 | `game/js/plugins/DEUS_Ownership.js:613` | TRUE |  |  |
| C434 | 1454 | `game/js/plugins/DEUS_TimeSpeed.js:189` | TRUE |  |  |
| C435 | 1454 | `game/js/plugins/DEUS_Fog.js:638` | TRUE |  |  |
| C436 | 1454 | `game/js/plugins/DEUS_Wildlife.js:1195` | TRUE |  |  |
| C437 | 1455 | `game/js/plugins/DEUS_Wildlife.js:505-510` | IMPRECISE | The bare `:505-510` resolves to the previous row's file; the intended DEUS_Core.js:505-510 is right. | Appendix A.3 names `DEUS_Core.js:505-510`. |
| C438 | 1455 | `game/js/plugins/DEUS_TimeSpeed.js:236` | TRUE |  |  |
| C439 | 1456 | `game/js/plugins/DEUS_TimeSpeed.js:209-217` | TRUE |  |  |
| C440 | 1456 | `game/js/rmmz_managers.js:2102-2112` | TRUE |  |  |
| C441 | 1456 | `game/js/plugins.js:258` | TRUE |  |  |
| C442 | 1456 | `game/js/plugins.js:184` | TRUE |  |  |
| C443 | 1456 | `game/js/plugins/DEUS_NaturalConnections.js:312-329` | TRUE |  |  |
| C444 | 1456 | `game/js/plugins/DEUS_NaturalConnections.js:352-353` | TRUE |  |  |
| C445 | 1457 | `game/js/plugins/DEUS_World.js:1686-1698` | TRUE |  |  |
| C446 | 1457 | `game/js/plugins/DEUS_World.js:1633-1675` | TRUE |  |  |
| C447 | 1458 | `game/js/plugins/DEUS_World.js:136` | TRUE |  |  |
| C448 | 1458 | `game/js/plugins/DEUS_World.js:1688-1689` | TRUE |  |  |
| C449 | 1459 | `game/js/plugins/DEUS_World.js:127-128` | TRUE |  |  |
| C450 | 1459 | `game/js/plugins.js:58` | TRUE |  |  |
| C451 | 1459 | `game/js/plugins/DEUS_Fluid.js:356-376` | IMPRECISE | As C100: the all-levels decode is at :380-382. | Appendix A.7 cites `DEUS_Fluid.js:380-383`. |
| C452 | 1459 | `game/js/plugins/DEUS_Fluid.js:1016-1019` | TRUE |  |  |
| C453 | 1460 | `game/js/plugins/DEUS_World.js:532` | TRUE |  |  |
| C454 | 1460 | `game/js/plugins/DEUS_Ecology.js:803` | TRUE |  |  |
| C455 | 1460 | `game/js/plugins/DEUS_Ecology.js:452-453` | TRUE |  |  |
| C456 | 1461 | `game/js/plugins/DEUS_Ecology.js:801` | IMPRECISE | Bare `:801` resolves to DEUS_Ecology.js; the intended DEUS_World.js:801 (PEEK_CACHE = 6) is right. | Appendix A.9 names `DEUS_World.js:801`. |
| C457 | 1461 | `game/js/plugins/DEUS_Ecology.js:599` | IMPRECISE | Bare `:599` resolves to DEUS_Ecology.js; the intended DEUS_World.js:599 (buildArea) is right. | Appendix A.9 names `DEUS_World.js:599`. |
| C458 | 1462 | `game/js/plugins/DEUS_Levels.js:4179-4193` | TRUE |  |  |
| C459 | 1462 | `game/js/plugins/DEUS_World.js:2728` | TRUE |  |  |
| C460 | 1463 | `tools/bench_history_sim.js:13` | TRUE |  |  |
| C461 | 1463 | `tools/bench_history_sim.js:37-122` @ebeec892 | TRUE |  |  |
| C462 | 1463 | `tools/bench_history_sim.js:66-67` @ebeec892 | TRUE |  |  |
| C463 | 1464 | `tools/test_new_game_year0.js:284` | TRUE |  |  |
| C464 | 1465 | `tools/test_strata_foundation.js:156-243` | TRUE |  |  |
| C465 | 1465 | `tools/test_strata_foundation.js:191-218` | TRUE |  |  |
| C466 | 1466 | `game/js/plugins/DEUS_Fluid.js:1025-1026` | TRUE |  |  |
| C467 | 1468 | `game/js/plugins/DEUS_Fluid.js:62` | FALSE | DEUS_Core.js :62 is startHour; the timeSpeed code is :61 and the comment :59-60. | Appendix A.16 says L59-60 comment, L61 code. |
| C468 | 1468 | `game/js/plugins/DEUS_Fluid.js:304-311` | IMPRECISE | Bare cite resolves to DEUS_Fluid.js; the intended DEUS_Core.js:304-311 is right. | Appendix A.16 names `DEUS_Core.js:304-311`. |
| C469 | 1468 | `game/js/plugins/DEUS_Fluid.js:376-378` | IMPRECISE | Bare cite resolves to DEUS_Fluid.js; the intended DEUS_Core.js:376-378 is right. | Appendix A.16 names `DEUS_Core.js:376-378`. |
| C470 | 1468 | `game/js/plugins/DEUS_Colonists.js:48` | TRUE |  |  |
| C471 | 1468 | `game/js/plugins/DEUS_Environment.js:52` | TRUE |  |  |
| C472 | 1468 | `game/js/plugins/DEUS_TimeSpeed.js:33` | TRUE |  |  |
| C473 | 1469 | `game/js/plugins/DEUS_TimeSpeed.js:45-50` | TRUE |  |  |
| C474 | 1470 | `game/js/plugins/DEUS_Dnd5e.js:415` | TRUE |  |  |
| C475 | 1470 | `game/js/plugins/DEUS_Dnd5e.js:720` | TRUE |  |  |
| C476 | 1470 | `game/js/plugins/DEUS_Dnd5e.js:800` | TRUE |  |  |
