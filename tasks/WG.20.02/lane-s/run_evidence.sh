#!/usr/bin/env bash
# tasks/WG.20.02/lane-s/run_evidence.sh: regenerate the lane-s evidence files in a fresh clone.
# Evidence helper only (not a gate). Usage, from the worktree root, in Git Bash:
#   bash tasks/WG.20.02/lane-s/run_evidence.sh clone  <dir>          fresh clone of HEAD into <dir> (default autocrlf)
#   bash tasks/WG.20.02/lane-s/run_evidence.sh gates  <dir> <out>    both gate commands -> <out>/gate_*.txt
#   bash tasks/WG.20.02/lane-s/run_evidence.sh provoke <dir> <out> <from> <to>   provocations for checks [from,to) (0-based)
#   bash tasks/WG.20.02/lane-s/run_evidence.sh tamper <dir> <out>    --check on a tampered output, and an invalid stratumPx
#   bash tasks/WG.20.02/lane-s/run_evidence.sh scope  <dir> <out>    changed paths vs base, committed images, allowedPaths
# Each command's exit code is captured raw as EXIT=<n>. The clone is never pushed; delete it afterwards.
set -u
MODE="$1"; DIR="$2"; OUT="${3:-}"
BASE=b612bc7217349bce695e15395bd041f63673b89b

case "$MODE" in
clone)
    SRC="$(git rev-parse --show-toplevel)"; SHA="$(git rev-parse HEAD)"
    rm -rf "$DIR"
    git clone --quiet --no-checkout "$SRC" "$DIR"; echo "EXIT=$? (git clone)"
    git -C "$DIR" checkout --quiet "$SHA"; echo "EXIT=$? (git checkout $SHA)"
    git -C "$DIR" rev-parse HEAD
    ;;
gates)
    cd "$DIR" || exit 2
    H="$(git rev-parse HEAD)"; A="$(git config core.autocrlf)"
    {
        echo "clone HEAD: $H"
        echo "git config core.autocrlf (effective in the clone): ${A:-unset}"
        echo '$ node tools/art/build_catalogue.js --check'
        node tools/art/build_catalogue.js --check; echo "EXIT=$?"
    } > "$OUT/gate_build_check.txt" 2>&1
    {
        echo "clone HEAD: $H"
        echo '$ node tools/art/test_catalogue.js'
        node tools/art/test_catalogue.js; echo "EXIT=$?"
    } > "$OUT/gate_test_catalogue.txt" 2>&1
    tail -2 "$OUT/gate_build_check.txt"; tail -3 "$OUT/gate_test_catalogue.txt"
    ;;
provoke)
    FROM="$4"; TO="$5"
    cd "$DIR" || exit 2
    H="$(git rev-parse HEAD)"
    mapfile -t CHECKS < <(node tools/art/test_catalogue.js 2>&1 | sed -n 's/^\(PASS\|FAIL\) catalogue\.\([a-z0-9_]*\):.*/\2/p')
    F="$OUT/provocations.txt"
    if [ "$FROM" = 0 ]; then
        {
            echo "clone HEAD: $H"
            echo "Each line: UF_TEST_PROVOKE=catalogue.<check> node tools/art/test_catalogue.js -> exit code, number of OTHER checks that failed, and the provoked check's own output line (raw)."
            echo "checks found in an unprovoked run: ${#CHECKS[@]}"
        } > "$F"
    fi
    for ((i = FROM; i < TO && i < ${#CHECKS[@]}; i++)); do
        c="${CHECKS[$i]}"
        o="$(UF_TEST_PROVOKE="catalogue.$c" node tools/art/test_catalogue.js 2>&1)"; rc=$?
        own="$(printf '%s\n' "$o" | grep -E "^(PASS|FAIL) catalogue\.$c:" | head -1)"
        others="$(printf '%s\n' "$o" | grep -E '^FAIL catalogue\.' | grep -vc -E "^FAIL catalogue\.$c:")"
        echo "PROVOKE catalogue.$c EXIT=$rc otherFails=$others | $own" >> "$F"
    done
    if [ "$TO" -ge "${#CHECKS[@]}" ]; then
        o="$(UF_TEST_PROVOKE=catalogue.no_such_check node tools/art/test_catalogue.js 2>&1)"; rc=$?
        echo "PROVOKE catalogue.no_such_check EXIT=$rc | $(printf '%s\n' "$o" | grep '^FAIL catalogue.provoke' | cut -c1-160)" >> "$F"
    fi
    grep -c '^PROVOKE' "$F"
    ;;
tamper)
    cd "$DIR" || exit 2
    {
        echo "clone HEAD: $(git rev-parse HEAD)"
        echo '$ echo tamper >> art/catalogue/conflicts.md; node tools/art/build_catalogue.js --check'
        echo tamper >> art/catalogue/conflicts.md
        node tools/art/build_catalogue.js --check; echo "EXIT=$?"
        echo '$ git checkout -- art/catalogue/conflicts.md; node tools/art/build_catalogue.js --check'
        git checkout -- art/catalogue/conflicts.md
        node tools/art/build_catalogue.js --check; echo "EXIT=$?"
        echo '$ rm docs/art/catalogue/BAND_UPPER2.md; node tools/art/build_catalogue.js --check'
        rm docs/art/catalogue/BAND_UPPER2.md
        node tools/art/build_catalogue.js --check; echo "EXIT=$?"
        git checkout -- docs/art/catalogue/BAND_UPPER2.md
        echo '$ node -e "<build with geometry.stratumPx = [24,24,24,24,0]>"'
        node -e "
const B = require('./tools/art/build_catalogue.js');
const g = JSON.parse(require('fs').readFileSync('art/catalogue/geometry.json', 'utf8'));
g.stratumPx = [24, 24, 24, 24, 0];
const r = B.build({ geometry: g });
console.log('build ok=' + r.ok + '; ' + r.errors.map(e => e.code + ': ' + e.msg).join('; '));
process.exit(r.ok ? 0 : 1);"
        echo "EXIT=$?"
        echo '$ node -e "<build with geometry.stratumPx = [20,20,20,20,20] (sums to 100, layerPx 96)>"'
        node -e "
const B = require('./tools/art/build_catalogue.js');
const g = JSON.parse(require('fs').readFileSync('art/catalogue/geometry.json', 'utf8'));
g.stratumPx = [20, 20, 20, 20, 20];
const r = B.build({ geometry: g });
console.log('build ok=' + r.ok + '; ' + r.errors.map(e => e.code + ': ' + e.msg).join('; '));
process.exit(r.ok ? 0 : 1);"
        echo "EXIT=$?"
        echo '$ git status --porcelain (clone must be clean after the demo)'
        git status --porcelain; echo "EXIT=$?"
    } > "$OUT/check_tamper_and_invalid_geometry.txt" 2>&1
    cat "$OUT/check_tamper_and_invalid_geometry.txt"
    ;;
scope)
    cd "$DIR" || exit 2
    {
        echo "clone HEAD: $(git rev-parse HEAD)"
        echo "\$ git diff --name-only $BASE..HEAD | files outside allowedPaths"
        git diff --name-only "$BASE..HEAD" | grep -v -E '^(art/catalogue/|docs/art/catalogue/|tools/art/build_catalogue\.js$|tools/art/test_catalogue\.js$|tools/art/fixtures/catalogue/|tasks/WG\.20\.02/lane-s/)'
        echo "EXIT=$? (grep: 1 = no file outside allowedPaths)"
        echo "\$ git diff --name-only $BASE..HEAD | wc -l"
        git diff --name-only "$BASE..HEAD" | wc -l; echo "EXIT=$?"
        echo "\$ git diff --name-only $BASE..HEAD | image files (png/jpg/gif/bmp/webp)"
        git diff --name-only "$BASE..HEAD" | grep -i -E '\.(png|jpe?g|gif|bmp|webp)$'
        echo "EXIT=$? (grep: 1 = none)"
        echo '$ grep for data:image / base64 image payloads in the catalogue outputs'
        grep -l -E 'data:image|iVBORw0KGgo' -r art/catalogue docs/art/catalogue tools/art/fixtures/catalogue
        echo "EXIT=$? (grep: 1 = none)"
        echo '$ node -e "<catalogue counts>"'
        node -e "
const c = JSON.parse(require('fs').readFileSync('art/catalogue/catalogue.json', 'utf8'));
const painted = c.entries.filter(e => e.slot).length;
const atl = c.sheets.filter(s => s.kind === 'ATLAS').sort((a, b) => b.w * b.h - a.w * a.h || a.sheetId.localeCompare(b.sheetId));
const maxSide = Math.max(...c.sheets.map(s => Math.max(s.w, s.h)));
const kinds = {}; for (const s of c.sheets) kinds[s.kind] = (kinds[s.kind] || 0) + 1;
console.log('entries ' + c.entries.length + '; painted slots ' + painted + '; derived/no slot ' + (c.entries.length - painted));
console.log('sheets ' + c.sheets.length + ' ' + JSON.stringify(kinds) + '; largest atlas (area) ' + atl[0].sheetId + ' ' + atl[0].w + 'x' + atl[0].h + '; largest side of any sheet ' + maxSide);
console.log('outOfScope ' + c.outOfScope.length + '; sources ' + c.sources.length);"
        echo "EXIT=$?"
        echo '$ wc -l art/catalogue/conflicts.md'
        wc -l art/catalogue/conflicts.md; echo "EXIT=$?"
        echo '$ sha256sum art/catalogue/catalogue.json'
        sha256sum art/catalogue/catalogue.json; echo "EXIT=$?"
    } > "$OUT/scope_and_counts.txt" 2>&1
    cat "$OUT/scope_and_counts.txt"
    ;;
*)
    echo "unknown mode $MODE"; exit 2 ;;
esac
