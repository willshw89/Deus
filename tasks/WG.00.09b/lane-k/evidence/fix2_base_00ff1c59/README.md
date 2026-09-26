# canvases_freed on the merge base 00ff1c59 (2026-09-26)

`node tools/test_layer_render_flat.js --suite depth --provoke --only canvases_freed` in a fresh clone of 00ff1c59 (the PM's
merge of main 1f683b94 into the lane, before any Fix 2 change). EXIT=1: `NOT CAUGHT depth.canvases_freed`. The in-place
level switch (Lane N) makes no spriteset, so the switches never touched the canvas pool the check was about.
