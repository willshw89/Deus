"use strict";
// Renders the default-table section of LEDGER_API.md from createLedger().describe(), so the doc cannot drift from code.
//   node tasks/WG.65.15/lane-l1/gen_ledger_tables.js           print the section
//   node tasks/WG.65.15/lane-l1/gen_ledger_tables.js --write   replace the section in LEDGER_API.md
//   node tasks/WG.65.15/lane-l1/gen_ledger_tables.js --check   exit 1 if LEDGER_API.md's section differs
const fs = require("fs");
const path = require("path");
const { createLedger } = require("../../../game/js/sim/ledger.js");

const DOC = path.join(__dirname, "LEDGER_API.md");
const BEGIN = "<!-- BEGIN GENERATED TABLES: node tasks/WG.65.15/lane-l1/gen_ledger_tables.js --write -->";
const END = "<!-- END GENERATED TABLES -->";

function render() {
    const d = createLedger().describe(), out = [];
    const esc = k => k.split("|").join("\\|");   // a "|" inside a GFM table cell must be escaped, even in code
    const cls = Object.keys(d.classes).sort();
    const comp = c => Object.keys(d.classes[c].composition).map(f => d.classes[c].composition[f] === 1 && Object.keys(d.classes[c].composition).length === 1 ? f : f + " " + d.classes[c].composition[f]).join(" + ");

    out.push("### Families (Q-MASS[family])", "", "| Family | Unit | Finite | Classes |", "|---|---|---|---|");
    for (const f of Object.keys(d.families).sort())
        out.push("| `" + f + "` | " + d.families[f].unit + " | " + (d.families[f].finite ? "yes" : "no") + " | " + cls.filter(c => d.classes[c].composition[f] !== undefined).map(c => "`" + c + "`").join(", ") + " |");

    out.push("", "### Classes and their forms", "", "| Class | Family (composition) | Forms | Ore |", "|---|---|---|---|");
    for (const c of cls) out.push("| `" + c + "` | " + comp(c) + " | " + d.classes[c].forms.join(", ") + " | " + (d.classes[c].ore ? "**ore**" : "") + " |");

    out.push("", "### Transform table (" + d.transforms.length + " allowed moves)", "",
        "One line per process and class pair; every listed from-form may go to every listed to-form. Anything not listed is refused with `E_NO_ENTRY`.", "",
        "| Process | From class | From forms | To class | To forms |", "|---|---|---|---|---|");
    const groups = new Map();
    for (const t of d.transforms) {
        const k = t.id + "|" + t.from + "|" + t.to;
        if (!groups.has(k)) groups.set(k, { id: t.id, from: t.from, to: t.to, ff: new Set(), tf: new Set() });
        groups.get(k).ff.add(t.fromForm);
        groups.get(k).tf.add(t.toForm);
    }
    const rows = Array.from(groups.values()).sort((a, b) => (d.classes[a.from].composition.mineral ? 0 : 1) - (d.classes[b.from].composition.mineral ? 0 : 1) ||
        Object.keys(d.classes[a.from].composition)[0].localeCompare(Object.keys(d.classes[b.from].composition)[0]) || a.from.localeCompare(b.from) || a.id.localeCompare(b.id) || a.to.localeCompare(b.to));
    for (const g of rows) out.push("| " + g.id + " | `" + g.from + "` | " + Array.from(g.ff).sort().join(", ") + " | `" + g.to + "` | " + Array.from(g.tf).sort().join(", ") + " |");

    out.push("", "### Recipes", "", "| Recipe | Inputs (per time) | Outputs (per time) |", "|---|---|---|");
    for (const id of Object.keys(d.recipes).sort())
        out.push("| `" + id + "` | " + d.recipes[id].inputs.map(e => e[1] + " `" + esc(e[0]) + "`").join(" + ") + " | " + d.recipes[id].outputs.map(e => e[1] + " `" + esc(e[0]) + "`").join(" + ") + " |");

    const nonOreNonFinite = cls.filter(c => !d.classes[c].ore && !d.classes[c].finite).reduce((a, c) => a.concat(d.classes[c].forms.map(f => c + "|" + f)), []).sort();
    const all = cls.reduce((a, c) => a.concat(d.classes[c].forms.map(f => c + "|" + f)), []).sort();
    const scope = list => {
        const s = list.slice().sort().join(",");
        if (s === all.join(",")) return "every class and form, ore and finite included (" + list.length + " pairs)";
        if (s === nonOreNonFinite.join(",")) return "every class and form except ore and finite classes (" + list.length + " pairs)";
        return list.map(k => "`" + esc(k) + "`").join(", ");
    };
    out.push("", "### Named sources and sinks", "", "| Kind | Name | May touch | allowFinite | Owner-confirmed | Authority |", "|---|---|---|---|---|---|");
    for (const [kind, t] of [["source", d.sources], ["sink", d.sinks]])
        for (const n of Object.keys(t).sort())
            out.push("| " + kind + " | `" + n + "` | " + scope(t[n].allowed) + " | " + (kind === "sink" ? "n/a" : t[n].allowFinite ? "yes" : "no") + " | " + (t[n].ownerConfirmed ? "yes" : "**no**") + " | " + t[n].authority + " |");
    out.push("", "Log ring size: " + d.logLimit + " entries.");
    return out.join("\n");
}

const section = BEGIN + "\n\n" + render() + "\n\n" + END;
if (process.argv.includes("--write") || process.argv.includes("--check")) {
    const doc = fs.readFileSync(DOC, "utf8").replace(/\r\n/g, "\n");
    const a = doc.indexOf(BEGIN), b = doc.indexOf(END);
    if (a < 0 || b < a) { console.log("FAIL markers not found in " + DOC); process.exit(1); }
    const current = doc.slice(a, b + END.length);
    if (process.argv.includes("--check")) {
        const same = current === section;
        console.log((same ? "PASS" : "FAIL") + " LEDGER_API.md generated tables " + (same ? "match" : "differ from") + " createLedger().describe()");
        process.exit(same ? 0 : 1);
    }
    fs.writeFileSync(DOC, doc.slice(0, a) + section + doc.slice(b + END.length));
    console.log("wrote the generated section of " + path.relative(process.cwd(), DOC));
} else console.log(section);
