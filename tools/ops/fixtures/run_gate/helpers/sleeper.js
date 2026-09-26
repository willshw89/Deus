// run_gate fixture helper (OPS.30.01): a child process that only waits; it ends itself after 10 minutes.
"use strict";
setTimeout(() => process.exit(0), 10 * 60 * 1000);
