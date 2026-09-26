# Fix 2 reproduction on 3538594d (2026-09-26)

3538594d = the merged lane (00ff1c59: Fix 1 + main 1f683b94 with Lane N's in-place switch) plus the stricter
`switch_same_frame` observation only (the test code, a `_paintsAtBind` counter in `Sprite_DepthPlane.bind`); the renderer
is otherwise that of 00ff1c59.

- `repro_layers_flat.log`: `node tools/test_layer_render_flat.js` in a fresh clone
  (`git clone -c core.autocrlf=false <worktree> %TEMP%\lanek-fix2-3538594d-repro`, `git checkout --detach 3538594d`).
  EXIT=1, 11/12: at `levels:viewChanged` every plane is bound to the right level but NOT PAINTED since bound, and units
  A / B have no sprite; in the first drawn frame (the same `Graphics.frameCount`) everything is complete.
