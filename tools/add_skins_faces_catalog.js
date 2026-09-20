// Adds the "skins" and "faces" sections (VISION V99, V100; user 2026-09-19 14:42 and 14:44) to data/UF_WorldCatalog.json.
// Written 2026-09-19 by Claude Code. Text-based and layout-preserving: the catalog is re-read immediately before it is
// written, each section is appended as the last top-level key (or its own lines are replaced), and the result is parsed
// and compared: every other top-level key must be unchanged (same value, same order) or nothing is written. Other
// engineers edit other sections at the same time.
// Usage: "C:\Program Files\nodejs\node.exe" tools/add_skins_faces_catalog.js [--game <game folder>] [--check] [--replace]
//   --game     the game folder whose data/UF_WorldCatalog.json is edited (default: game/ next to tools/)
//   --check    only report what would change; write nothing
//   --replace  when a different section is already there, replace it (default: leave it and report)
// Exit code: 0 done (or already there), 1 the file could not be edited safely.
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const gameIdx = args.indexOf("--game");
const gameDir = path.resolve(gameIdx >= 0 ? args[gameIdx + 1] : path.join(__dirname, "..", "game"));
const checkOnly = args.includes("--check");
const replace = args.includes("--replace");
const file = path.join(gameDir, "data", "UF_WorldCatalog.json");

// Per culture id (the catalog's "cultures" keys, plus the five peoples of VISION V87 by their PEOPLES.md ids).
// recipe: the stand-in, a gradient map by brightness of Window.png: back = the wallpaper parts (x 0-95), frame = the frame,
// cursor, arrows and pause sign (x 96-191, y 0-143); [dark, mid, light]; mix = share of the original colour kept. The
// text colour row (x 96-191, y 144-191) is never changed. recipe null = Window.png as it is (carved oak: the human skin).
const SKINS = {
    about: "Window skins per culture (UF_Factions; VISION V99, user 2026-09-19 14:42: \"Every faction should have a different menu skin\"). Every window of the player (every Window_Base) loads the skin of the player's faction's culture (faction.culture, else its species): img/system/<file>.png when that file exists, else a stand-in built once from img/system/<base>.png with the culture's recipe. A conversation (UF_Talk) draws each side's skin frame around that side's portrait: the stranger's side in the stranger's skin. recipe: a gradient map by brightness; back = [dark, mid, light] for the two wallpaper parts (x 0-95), frame = [dark, mid, light] for the frame, cursor, arrows and pause sign; mix = share of the original colour kept (0-1). The text colour row (x 96-191, y 144-191) is never changed, so text colours stay as Window.png has them (ColorManager reads Window.png). recipe null = <base> as it is. like = use another culture's entry. default = a culture without an entry. material = what Gemini's skin is made of (ASSET_REQUESTS AR-1700 to AR-1710, docs/handoffs/HANDOFF_skins_faces.md). Owner: Claude Code.",
    base: "Window",
    default: { file: "Window", recipe: null, material: "Window.png as it is (carved oak)" },
    cultures: {
        human: { file: "Window_human", material: "carved dark oak, aged parchment and brass fittings", recipe: null },
        elf: { file: "Window_elf", material: "living wood and leaves with pale gold inlay, green-gold", recipe: { back: ["#08140a", "#23461f", "#b9d28a"], frame: ["#142010", "#6e8c28", "#f0e290"], mix: 0.08 } },
        dwarf: { file: "Window_dwarf", material: "dressed grey stone and dark iron, rune-cut, iron rivets", recipe: { back: ["#0c0e12", "#383e48", "#b0b8c4"], frame: ["#141820", "#5e6878", "#dce4f0"], mix: 0.08 } },
        gnome: { file: "Window_gnome", material: "polished brass, rivets and small gears on dark teal enamel", recipe: { back: ["#081418", "#1e3c44", "#98b8b4"], frame: ["#2a1c06", "#b08a2c", "#fff0a8"], mix: 0.05 } },
        goblin: { file: "Window_goblin", material: "rusted scrap iron, patched hide and lashings", recipe: { back: ["#12120a", "#3a3a22", "#9a9670"], frame: ["#1e0e06", "#8c4a1e", "#e0a060"], mix: 0.05 } },
        orc: { file: "Window_orc", material: "bone, red-brown hide and black iron", recipe: { back: ["#1a0806", "#561c12", "#b87060"], frame: ["#2c2418", "#a89a80", "#f4ecd8"], mix: 0.05 } },
        lizardfolk: { file: "Window_lizardfolk", material: "woven reeds and shell, marsh teal and reed green", recipe: { back: ["#061210", "#1c3c34", "#8ab4a0"], frame: ["#10201a", "#4e8a6a", "#f0dcc8"], mix: 0.05 } },
        kobold: { file: "Window_kobold", material: "earthy ochre clay and tunnel rock hung with brass trinkets", recipe: { back: ["#180a04", "#52280e", "#d08850"], frame: ["#221006", "#b0602a", "#f8c878"], mix: 0.05 } },
        undead: { file: "Window_undead", material: "grave stone, tarnished bronze and grey-green moss", recipe: { back: ["#0a0e08", "#2e3a28", "#8c9c80"], frame: ["#141a12", "#6a7a5e", "#cad8b8"], mix: 0.05 } },
        starborn: { file: "Window_starborn", material: "cold crystal and light: a blue-violet glass lattice with silver", recipe: { back: ["#06061a", "#20206a", "#a8a8ff"], frame: ["#0e0e30", "#6a5ad8", "#e4e2ff"], mix: 0.05 } },
        swarm: { file: "Window_swarm", material: "dark chitin, living membrane and sinew with a violet sheen", recipe: { back: ["#050c06", "#193620", "#78a068"], frame: ["#10081a", "#4a3a5a", "#b8d078"], mix: 0.05 } },
        automaton: { like: "starborn" }
    }
};

// Portrait styles (VISION V100). standIn: the code-drawn frame (UF_GenFrame) drawn around today's portrait until the
// culture's face sheets exist: shape of the opening (square, arch, pointed, round, notched, blob, cave), ornament
// (studs, leaves, ticks, teeth, stitches, knobs, diamonds, veins, bars, beads, none), thickness (share of the side),
// colours. frame/background/palette/motifs: the brief for Gemini's sheets (ASSET_REQUESTS AR-1720 to AR-1730).
const FACES = {
    about: "Portraits per culture (VISION V100, user 2026-09-19 14:44: \"Every faction should have it's own U7 faceset style\"; V49, V62). Read by UF_Factions (cultureFace, faceStyle, drawPortrait) for UF_Talk's portraitOf and UF_Sheet's faceSpecOf. A person's portrait, in order: unit data.face (an explicit face); the sheets of the person's culture (faction.culture, else the faction's species, else the unit's species): img/faces/<pattern> with {culture} the culture id and {n} 1 to sheets, used only for that culture's own people (its id, or its species list); then that people's species sheets (species.<species>.<gender>.<adult|elder>: sheet, indices, content = the content-mood cells, framed = the art has its own frame); then the portrait chosen before (catalog sheet.faces, talk.portraits, the code-drawn UF_GenFace) drawn inside a code-drawn frame in the culture's colours (cultures.<id>.standIn), so factions already look different before the art arrives. A species sheet with framed false gets the same code-drawn frame around it. Culture sheets: 576 x 288 RMMZ face sheets, eight 144 x 144 faces; layout = the cell of each adult and elder man and woman in the calm top row; the row below holds the same four faces content (contentMoods = unit moods that pick the lower row). Babies and children keep the chain's older portraits (framed). Creatures get no frame. cultures.<id>: frame, background, palette, motifs = Gemini's brief (ASSET_REQUESTS AR-1720 to AR-1730, docs/handoffs/HANDOFF_skins_faces.md); species = the peoples whose faces the culture's sheets show; like = another culture's entry; default = a person whose culture has no entry. standIn: shape of the opening (square, arch, pointed, round, notched, blob, cave), ornament (studs, leaves, ticks, teeth, stitches, knobs, diamonds, veins, bars, beads, none), thickness (share of the side), colors (frame, light, dark, back). Owner: Claude Code.",
    pattern: "UF_Faces_{culture}_{n}",
    sheets: 4,
    layout: { adult_male: 0, adult_female: 1, elder_male: 2, elder_female: 3 },
    contentMoods: ["Ecstatic", "Happy"],
    species: {
        human: {
            male: {
                adult: { sheet: "UF_Faces_Human_Male_Adult", indices: [0, 1, 2, 3], content: [4, 5, 6, 7], framed: true },
                elder: { sheet: "UF_Faces_Human_Male_Elder", indices: [0, 1, 2, 3], content: [4, 5, 6, 7], framed: false }
            },
            female: {
                adult: { sheet: "UF_Faces_Human_Female_Adult", indices: [0, 1, 2, 3], content: [4, 5, 6, 7], framed: true },
                elder: { sheet: "UF_Faces_Human_Female_Elder", indices: [0, 1, 2, 3], content: [4, 5, 6, 7], framed: false }
            }
        }
    },
    cultures: {
        default: { frame: "a plain dark wooden frame", background: "dark umber", palette: "neutral browns", motifs: "none",
            standIn: { shape: "square", ornament: "none", thickness: 0.09, colors: { frame: "#5a4a36", light: "#a89272", dark: "#221a10", back: "#14110d" } } },
        human: { frame: "a carved stone arch", background: "deep midnight navy", palette: "warm skin tones, undyed wool, oak brown, brass", motifs: "homespun tunics and hoods, leather collars, simple brooches and caps",
            standIn: { shape: "arch", ornament: "studs", thickness: 0.1, colors: { frame: "#8c8676", light: "#dcd6c4", dark: "#36322a", back: "#0b1030" } } },
        elf: { frame: "a leafy bower of living branches", background: "deep forest green with dappled light", palette: "green-gold, pale gold, bark brown, moss", motifs: "leaf circlets, fine braids, pointed ears, embroidered hems",
            standIn: { shape: "blob", ornament: "leaves", thickness: 0.11, colors: { frame: "#4c7428", light: "#c4dc78", dark: "#1a2c0e", back: "#0c2014" } } },
        dwarf: { frame: "a rune-cut stone niche", background: "hearth-lit dark rock", palette: "slate grey, iron, copper, ember orange", motifs: "braided beards (women too, shorter), iron clasps, rune bands, leather aprons",
            standIn: { shape: "square", ornament: "ticks", thickness: 0.12, colors: { frame: "#6a6e78", light: "#c8ccd4", dark: "#24262c", back: "#1e120a" } } },
        gnome: { frame: "a brass-and-gear roundel", background: "dark teal enamel", palette: "brass, copper, teal, cream", motifs: "goggles, pointed caps, tool loops, big noses, spectacles",
            standIn: { shape: "round", ornament: "teeth", thickness: 0.1, colors: { frame: "#a8822a", light: "#f4dc88", dark: "#3e2a08", back: "#0c2226" } } },
        goblin: { frame: "a patched hide and scrap frame", background: "smoky olive dusk", palette: "green-grey skin, rust, mud brown, dull yellow", motifs: "big ears, scrap earrings, patched hoods, stitched leather",
            standIn: { shape: "notched", ornament: "stitches", thickness: 0.11, colors: { frame: "#6e5232", light: "#c49c64", dark: "#281a0c", back: "#1c1c0e" } } },
        orc: { frame: "a bone-and-iron frame", background: "dark red-brown", palette: "grey-green skin, bone, red-brown hide, black iron", motifs: "tusks, war paint, iron rings, fur mantles",
            standIn: { shape: "square", ornament: "knobs", thickness: 0.12, colors: { frame: "#cbc0a0", light: "#f4ecd4", dark: "#463626", back: "#2a0c08" } } },
        lizardfolk: { frame: "a reed-and-shell frame", background: "murky marsh teal", palette: "scale green, teal, shell pink, reed gold", motifs: "scales, crests and frills, shell beads, woven reeds",
            standIn: { shape: "arch", ornament: "bars", thickness: 0.11, colors: { frame: "#4a7a5a", light: "#f0d8c4", dark: "#142a1e", back: "#0a1a18" } } },
        kobold: { frame: "a tunnel-rock niche hung with trinkets", background: "lamp-lit clay ochre", palette: "rust-red scales, ochre, clay, brass trinkets", motifs: "small horns, snouts, strings of trinkets, candle stubs",
            standIn: { shape: "cave", ornament: "beads", thickness: 0.11, colors: { frame: "#7a5a3a", light: "#e8b860", dark: "#2a1a0c", back: "#2a1608" } } },
        undead: { frame: "a tomb niche", background: "grave grey-green", palette: "grey skin, bone, tarnished bronze, grave-moss green", motifs: "sunken eyes, burial wraps, tarnished circlets, bare bone",
            standIn: { shape: "pointed", ornament: "bars", thickness: 0.11, colors: { frame: "#626c5c", light: "#c4ccb8", dark: "#1c2018", back: "#0e120e" } } },
        starborn: { frame: "a crystal lattice", background: "night blue with starlight", palette: "blue-violet, silver, pale light, a little gold", motifs: "glowing sigils, smooth plates, crystal circlets, luminous eyes",
            standIn: { shape: "notched", ornament: "diamonds", thickness: 0.1, colors: { frame: "#5c50c4", light: "#dcd8ff", dark: "#1a163e", back: "#06061a" } } },
        swarm: { frame: "a living membrane", background: "wet dark chitin green", palette: "chitin green-black, sickly yellow-green, violet sheen", motifs: "mandibles, compound eyes, carapace ridges, antennae",
            standIn: { shape: "blob", ornament: "veins", thickness: 0.12, colors: { frame: "#3a4a2e", light: "#b8cc70", dark: "#0e140a", back: "#080e0a" } } },
        automaton: { like: "starborn" }
    }
};

const SECTIONS = { skins: SKINS, faces: FACES };

// Lines like the neighbouring sections: scalar fields one per line, small objects inline ({ "a": 1 }), nested maps one
// entry per line.
const inline = v => {
    if (Array.isArray(v)) return `[${v.map(inline).join(", ")}]`;
    if (v && typeof v === "object") {
        const ks = Object.keys(v);
        return ks.length ? `{ ${ks.map(k => `${JSON.stringify(k)}: ${inline(v[k])}`).join(", ")} }` : "{}";
    }
    return JSON.stringify(v);
};
function lines(key, obj) {
    const out = [`  ${JSON.stringify(key)}: {`];
    const keys = Object.keys(obj);
    keys.forEach((k, i) => {
        const comma = i < keys.length - 1 ? "," : "";
        const v = obj[k];
        if ((k === "cultures" || k === "species") && v && typeof v === "object") {
            out.push(`    ${JSON.stringify(k)}: {`);
            const ids = Object.keys(v);
            ids.forEach((id, j) => out.push(`      ${JSON.stringify(id)}: ${inline(v[id])}${j < ids.length - 1 ? "," : ""}`));
            out.push(`    }${comma}`);
        } else if (v && typeof v === "object" && !Array.isArray(v)) {
            out.push(`    ${JSON.stringify(k)}: ${inline(v)}${comma}`);
        } else {
            out.push(`    ${JSON.stringify(k)}: ${Array.isArray(v) ? inline(v) : JSON.stringify(v)}${comma}`);
        }
    });
    out.push("  }");
    return out;
}

function build(raw) {
    let catalog = JSON.parse(raw);
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    let text = raw;
    const notes = [];
    for (const [key, value] of Object.entries(SECTIONS)) {
        if (catalog[key] !== undefined) {
            if (JSON.stringify(catalog[key]) === JSON.stringify(value)) { notes.push(`${key}: already there, unchanged`); continue; }
            if (!replace) { notes.push(`${key}: a different section is already there (run with --replace); left as it is`); continue; }
        }
        const ls = text.split(/\r?\n/);
        const block = lines(key, value);
        if (catalog[key] !== undefined) {
            const start = ls.findIndex(l => l.startsWith(`  ${JSON.stringify(key)}: {`));
            if (start < 0) throw new Error(`a "${key}" key exists but not as a 2-space-indented block`);
            let end = -1;
            for (let i = start + 1; i < ls.length; i++) if (/^  \},?\s*$/.test(ls[i])) { end = i; break; }
            if (end < 0) throw new Error(`no closing line for the ${key} section`);
            if (/,\s*$/.test(ls[end])) block[block.length - 1] += ",";
            ls.splice(start, end - start + 1, ...block);
            notes.push(`${key}: replaced (${block.length} lines)`);
        } else {
            let close = ls.length - 1;
            while (close >= 0 && ls[close].trim() === "") close--;
            if (ls[close] !== "}") throw new Error(`the last line is not "}": ${JSON.stringify(ls[close])}`);
            let prev = close - 1;
            while (prev >= 0 && ls[prev].trim() === "") prev--;
            if (!/^  [\]}]\s*$/.test(ls[prev]) && !/^  "[^"]+": .*[^,]\s*$/.test(ls[prev])) throw new Error(`unexpected line before the closing brace: ${ls[prev].slice(0, 80)}`);
            ls[prev] = ls[prev].replace(/\s*$/, ",");
            ls.splice(close, 0, ...block);
            notes.push(`${key}: added (${block.length} lines)`);
        }
        text = ls.join(eol);
        catalog = JSON.parse(text);
    }
    if (text === raw) return { text: null, notes };
    // Everything else must be exactly as it was.
    const before = JSON.parse(raw), after = JSON.parse(text);
    const mine = new Set(Object.keys(SECTIONS));
    const bk = Object.keys(before).filter(k => !mine.has(k)), ak = Object.keys(after).filter(k => !mine.has(k));
    if (bk.join("\u0000") !== ak.join("\u0000")) throw new Error("the other top-level keys changed order or set");
    for (const k of bk) if (JSON.stringify(after[k]) !== JSON.stringify(before[k])) throw new Error(`top-level key "${k}" would change`);
    for (const k of mine) if (JSON.stringify(after[k]) !== JSON.stringify(SECTIONS[k]) && (replace || before[k] === undefined)) throw new Error(`the written ${k} section does not read back as intended`);
    notes.push(`${bk.length} other keys unchanged`);
    return { text, notes };
}

function main() {
    const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    const r = build(raw);
    console.log(`${file}: ${r.notes.join("; ")}`);
    if (!r.text || checkOnly) return 0;
    // Re-read right before writing: if anyone changed the file meanwhile, build again from their version.
    const now = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    const final = now === raw ? r : build(now);
    if (!final.text) return 0;
    fs.writeFileSync(file, final.text);
    const check = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const k of Object.keys(SECTIONS)) if (JSON.stringify(check[k]) !== JSON.stringify(SECTIONS[k])) { console.error(`${k}: does not read back`); return 1; }
    console.log(`wrote ${file}`);
    return 0;
}

module.exports = { SKINS, FACES };
if (require.main === module) {
    try {
        process.exit(main());
    } catch (e) {
        console.error(`not written: ${e.message}`);
        process.exit(1);
    }
}
