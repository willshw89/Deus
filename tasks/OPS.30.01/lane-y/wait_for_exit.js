#!/usr/bin/env node
"use strict";
// OPS.30.01 lane-y helper: blocks (in the foreground) until <log> contains a line "EXIT=<n>" or <maxSec> pass, so a
// command longer than the shell tool's 10-minute limit can run as a job while this session keeps waiting on it
// instead of ending its turn. Prints the lines added since the last call and the EXIT line when it appears.
// Usage: node tasks/OPS.30.01/lane-y/wait_for_exit.js <log> [maxSec=570]
// Exit: 0 the EXIT line is there; 3 still running at maxSec (call again).
const fs = require("fs");
const [log, maxArg] = process.argv.slice(2);
const maxMs = Number(maxArg || 570) * 1000;
const t0 = Date.now();
const read = () => { try { return fs.readFileSync(log, "utf8"); } catch (_) { return ""; } };
const tick = () => {
    const text = read();
    const done = /^EXIT=\S+/m.test(text);
    if (done || Date.now() - t0 >= maxMs) {
        const lines = text.split(/\r?\n/).filter(l => /^(GATE |RESULT|EXIT=|LEFTOVER|REFUSED|LIST ERROR|CENSUS (COMPLETE|PARTIAL|COUNTS)|run_gate)/.test(l));
        console.log(lines.join("\n"));
        console.log(done ? "WAIT: finished" : `WAIT: still running after ${Math.round((Date.now() - t0) / 1000)} s`);
        process.exit(done ? 0 : 3);
    }
    setTimeout(tick, 2000);
};
tick();
