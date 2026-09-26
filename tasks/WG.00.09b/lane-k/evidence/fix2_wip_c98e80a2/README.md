# WIP c98e80a2 runs (2026-09-26): the renderer fix before the canvases_freed change

One fresh clone of c98e80a2 (the renderer fix and the stricter switch_same_frame; canvases_freed not yet changed):
`layers_flat.log` (`node tools/test_layer_render_flat.js --suite layers_flat`, EXIT=0, 12/12), `depth.log` (`--suite depth`,
EXIT=0, 27/27), `provoke_layers_flat.log` (`--provoke --jobs 3`, EXIT=0, 8/8 caught), `provoke_depth.log`
(`--suite depth --provoke --jobs 3`, EXIT=1: 15/16 caught, `NOT CAUGHT depth.canvases_freed`). The final code is c2184c94.
