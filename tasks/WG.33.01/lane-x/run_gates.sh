#!/usr/bin/env bash
# tasks/WG.33.01/lane-x/run_gates.sh <out-dir>
# Runs every gateTests entry of tasks/WG.33.01/lane-x/lane.json exactly as written, from the root of the
# checkout this script lives in, in the foreground. Writes the raw output of command N to <out-dir>/gate_N.txt
# and prints "$ <command>" plus "EXIT=<code>" for each, then --strict on main (raw, all lines).
set -u
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)" || exit 1
OUT="${1:?usage: run_gates.sh <out-dir>}"
mkdir -p "$OUT" || exit 1
cd "$ROOT" || exit 1
echo "root: $(cygpath -w "$ROOT" 2>/dev/null || echo "$ROOT")"
echo "HEAD: $(git rev-parse HEAD)"
n=0
node -e 'const l=require("./tasks/WG.33.01/lane-x/lane.json");for(const g of l.gateTests)console.log([g.cmd].concat(g.args).join("\t"))' > "$OUT/.cmds" || exit 1
while IFS=$'\t' read -r -a cmd; do
    n=$((n+1))
    echo "\$ ${cmd[*]}"
    "${cmd[@]}" > "$OUT/gate_$n.txt" 2>&1
    code=$?
    tail -3 "$OUT/gate_$n.txt"
    echo "EXIT=$code"
    echo "EXIT=$code" >> "$OUT/gate_$n.txt"
done < "$OUT/.cmds"
rm -f "$OUT/.cmds"
echo "\$ node tools/verify_world_state_registry.js --strict"
node tools/verify_world_state_registry.js --strict > "$OUT/strict_main.txt" 2>&1
code=$?
echo "EXIT=$code" >> "$OUT/strict_main.txt"
tail -2 "$OUT/strict_main.txt"
echo "git status --short (lines): $(git status --short | wc -l)"
