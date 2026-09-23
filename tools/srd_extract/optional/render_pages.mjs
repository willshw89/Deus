// tools/srd_extract/optional/render_pages.mjs - render SRD pages to PNG and probe glyph decoding with pdf.js.
//
// OPTIONAL verification aid, not part of the pipeline: no catalogue tool depends on it. It needs two npm
// packages that are NOT in the repository. Install them once in a scratch folder outside the project:
//   mkdir %TEMP%\pdfrender && cd %TEMP%\pdfrender && npm init -y && npm install pdfjs-dist@4 @napi-rs/canvas
// then run from the project root with --modules pointing at that folder's node_modules:
//   node tools/srd_extract/optional/render_pages.mjs --modules %TEMP%\pdfrender\node_modules --out <dir> --scale 2 11 90 208
//   node tools/srd_extract/optional/render_pages.mjs --modules ... --probe 90 [--needle "adversaries"]
// render: writes page_NNN.png per page number given (pdf.js with the PDF's own fonts and CMaps).
// --probe: prints pdf.js's text items for one page with their Unicode code points and font, which is how the
//   two glyph rules of lib/srd_text.js (U+008A -> em dash, grave accent -> U+2019) were confirmed on 2026-09-22.
// Verified with pdfjs-dist 4.10.38 and @napi-rs/canvas 0.1.x on Node 24.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const modules = path.resolve(opt("--modules", path.join(process.env.TEMP || "/tmp", "pdfrender", "node_modules")));
const pdfPath = path.resolve(opt("--pdf", path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..", "..", "SRD_CC_v5.1.pdf")));
const outDir = path.resolve(opt("--out", path.join(process.env.TEMP || "/tmp", "srd_pages")));
const scale = Number(opt("--scale", "2")) || 2;
const probePage = opt("--probe", null);
const needle = opt("--needle", null);
const pages = args.filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== "--probe" && args[i - 1] !== "--scale").map(Number);

if (!fs.existsSync(path.join(modules, "pdfjs-dist"))) {
    console.error(`render_pages: pdfjs-dist not found under ${modules}; see the header for the install steps and pass --modules.`);
    process.exit(2);
}
const require = createRequire(path.join(modules, "x.js"));
const canvas = require("@napi-rs/canvas");
globalThis.Path2D = canvas.Path2D;
globalThis.DOMMatrix = canvas.DOMMatrix;
globalThis.ImageData = canvas.ImageData;
const pdfjs = await import(pathToFileURL(path.join(modules, "pdfjs-dist", "legacy", "build", "pdf.mjs")).href);
const nm = path.join(modules, "pdfjs-dist");

class CanvasFactory {
    create(w, h) { const c = canvas.createCanvas(w, h); return { canvas: c, context: c.getContext("2d") }; }
    reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
    destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; cc.canvas = null; cc.context = null; }
}
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(pdfPath)), cMapUrl: nm + "/cmaps/", cMapPacked: true, standardFontDataUrl: nm + "/standard_fonts/", canvasFactory: new CanvasFactory() }).promise;

if (probePage) {
    const page = await doc.getPage(Number(probePage));
    const tc = await page.getTextContent();
    const items = tc.items.filter(i => i.str !== undefined);
    let hits = 0;
    for (const it of items) {
        if (needle ? it.str.includes(needle) : /[^\x20-\x7E]/.test(it.str)) {
            hits++;
            console.log(JSON.stringify({ str: it.str, font: it.fontName, codes: [...it.str].map(c => c.codePointAt(0).toString(16)).join(" "), x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) }));
        }
    }
    console.log(`page ${probePage}: ${items.length} text items, ${hits} ${needle ? `containing ${JSON.stringify(needle)}` : "with non-ASCII characters"}`);
} else {
    fs.mkdirSync(outDir, { recursive: true });
    for (const p of pages) {
        const page = await doc.getPage(p);
        const viewport = page.getViewport({ scale });
        const factory = new CanvasFactory();
        const cc = factory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await page.render({ canvasContext: cc.context, viewport, canvasFactory: factory }).promise;
        const file = path.join(outDir, `page_${String(p).padStart(3, "0")}.png`);
        fs.writeFileSync(file, cc.canvas.toBuffer("image/png"));
        console.log(`rendered ${file} (${Math.ceil(viewport.width)}x${Math.ceil(viewport.height)})`);
    }
}
