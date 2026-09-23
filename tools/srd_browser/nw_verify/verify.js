// tools/srd_browser/nw_verify/verify.js - drives the SRD 5.1 catalogue browser inside NW.js.
//
// Injected by nw_verify.js as "inject_js_end" into the served page (http://127.0.0.1:<port>/),
// which the runner's package.json names as "main" and lists under "node-remote", so this script
// has the page's DOM, the nw.* API and Node's require(). It waits for the catalogue to load, then
// drives the real DOM through the nine scenarios in the runner's header, writes
// <out>/results.json (and three PNGs via nw.Window.capturePage) and quits the app with
// nw.App.quit(). Every scenario is an explicit assertion that can fail; nothing here prints a
// success it did not observe. Progress goes to <out>/nw_verify.log so a timeout leaves a trail.
//
// Configuration comes from the manifest: nw.App.manifest.srdVerify = { out, url, expectedTotal }.
(function () {
    "use strict";
    var T0 = Date.now();
    var manifest = (typeof nw !== "undefined" && nw.App && nw.App.manifest) || {};
    var cfg = manifest.srdVerify || {};
    var hasNode = typeof require === "function";
    var fs = hasNode ? require("fs") : null;
    var path = hasNode ? require("path") : null;
    var NodeBuffer = hasNode ? require("buffer").Buffer : null;
    var out = cfg.out || "";
    var EXPECTED = {
        creatures: 317,          // scenario 2: Creatures / kind creature (SRD 5.1 has 317 stat blocks)
        deckRows: 22,            // scenario 4: Deck of Many Things has 22 cards
        deckColumn: "Playing Card",
        abolethAC: "Armor Class 17",
        abolethHP: "Hit Points 135",
        total: typeof cfg.expectedTotal === "number" ? cfg.expectedTotal : null
    };

    // ------------------------------------------------------------------ logging and results
    function beacon(msg) {
        // Diagnostic only: shows up in the runner's server log even when Node is unavailable here.
        try { fetch("/__nw_verify/log?m=" + encodeURIComponent(msg) + "&t=" + Date.now(), { cache: "no-store" }).catch(function () {}); } catch (e) { /* ignore */ }
    }
    function log(line) {
        var s = "[" + String(Date.now() - T0).padStart(6) + " ms] " + line;
        try { if (fs && out) fs.appendFileSync(path.join(out, "nw_verify.log"), s + "\n"); } catch (e) { /* ignore */ }
        try { console.log("nw_verify: " + line); } catch (e) { /* ignore */ }
    }
    var results = {
        approach: "inject_js_end into the served page (package.json main = served URL, node-remote)",
        url: location.href,
        userAgent: navigator.userAgent,
        versions: (typeof process !== "undefined" && process.versions) ? { nw: process.versions.nw, chromium: process.versions.chromium, node: process.versions.node } : null,
        hasNode: hasNode,
        startedAt: new Date(T0).toISOString(),
        finishedAt: null,
        window: null,
        scenarios: [],
        screenshots: [],
        errors: null
    };
    function assert(cond, msg) { if (!cond) throw new Error(msg); }
    function scenarioResult(id, name, pass, detail, ms) {
        results.scenarios.push({ id: id, name: name, pass: !!pass, detail: String(detail == null ? "" : detail), ms: ms });
        log((pass ? "PASS " : "FAIL ") + id + " " + name + " -- " + detail);
    }
    function scenario(id, name, fn) {
        var t0 = Date.now();
        return Promise.resolve().then(fn).then(function (detail) {
            scenarioResult(id, name, true, detail, Date.now() - t0);
        }, function (err) {
            scenarioResult(id, name, false, (err && err.message) ? err.message : String(err), Date.now() - t0);
        });
    }

    // ------------------------------------------------------------------ DOM helpers
    function $(sel, root) { return (root || document).querySelector(sel); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function text(el) { return el ? String(el.textContent).replace(/\s+/g, " ").trim() : ""; }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function frames(n) { return new Promise(function (r) { (function step(k) { if (k <= 0) return r(); requestAnimationFrame(function () { step(k - 1); }); })(n); }); }
    function waitFor(label, fn, timeoutMs) {
        var t0 = Date.now();
        return new Promise(function (resolve, reject) {
            (function poll() {
                var v = null;
                try { v = fn(); } catch (e) { v = null; }
                if (v) return resolve(v);
                if (Date.now() - t0 > timeoutMs) return reject(new Error("timed out after " + timeoutMs + " ms waiting for " + label));
                setTimeout(poll, 50);
            })();
        });
    }
    function fire(el, type) { el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true })); }
    function resultNames() { return $$("#results li[role=option] .r-name").map(text); }
    function resultRows() { return $$("#results li[role=option]"); }
    function countLabel() { return text($("#count")); }
    function title() { return text($("#detail .d-title")); }
    function num(n) { return Number(n).toLocaleString("en-US"); }
    function rect(el) { var r = el.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; }
    function inViewport(r, slack) {
        var s = slack || 1;
        return r.left >= -s && r.top >= -s && r.right <= window.innerWidth + s && r.bottom <= window.innerHeight + s;
    }
    /** True when an ancestor (below <html>) scrolls its own content, so a wide child is not page overflow. */
    function insideScroller(el) {
        for (var a = el.parentElement; a && a !== document.documentElement && a !== document.body; a = a.parentElement) {
            var cs = getComputedStyle(a);
            if (/auto|scroll/.test(cs.overflowX + " " + cs.overflowY + " " + cs.overflow)) return true;
        }
        return false;
    }
    /** Ancestors with overflow hidden/clip whose box does not contain the element's box. */
    function clippingAncestors(el) {
        var r = el.getBoundingClientRect(), bad = [];
        for (var a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
            var cs = getComputedStyle(a);
            var clips = /hidden|clip/.test(cs.overflow + " " + cs.overflowX + " " + cs.overflowY);
            if (!clips) continue;
            var ar = a.getBoundingClientRect();
            if (r.top < ar.top - 1 || r.bottom > ar.bottom + 1 || r.left < ar.left - 1 || r.right > ar.right + 1) bad.push(a.tagName + (a.id ? "#" + a.id : "") + (a.className ? "." + String(a.className).split(" ")[0] : ""));
        }
        return bad;
    }
    function clearAll() {
        $("#clear-btn").click();                              // app.js resets search and every filter synchronously
        assert($("#search").value === "" && $("#f-category").value === "" && $("#f-kind").value === "", "Clear button did not reset the search and filters");
    }
    async function search(query, firstName) {
        var input = $("#search");
        input.value = query;
        fire(input, "input");                                  // app.js debounces this by 40 ms
        await waitFor("first result '" + firstName + "' for query '" + query + "'", function () { var n = resultNames(); return n.length && n[0] === firstName; }, 3000);
        return resultNames();
    }
    async function openRow(name) {
        var row = resultRows().find(function (li) { return text($(".r-name", li)) === name; });
        assert(row, "no result row named " + JSON.stringify(name) + "; rows: " + resultNames().slice(0, 5).join(", "));
        row.click();                                           // real DOM click; app.js walks up to the <li>
        await waitFor("detail title '" + name + "'", function () { return title() === name; }, 3000);
        assert(row.classList.contains("active") && row.getAttribute("aria-selected") === "true", "clicked row is not marked active/aria-selected");
        return row;
    }
    function capture(name) {
        return new Promise(function (resolve, reject) {
            assert(hasNode, "Node is not available in the page (node-remote did not apply); cannot write " + name);
            var win = nw.Window.get();
            win.capturePage(function (buf) {
                try {
                    var data = NodeBuffer.isBuffer(buf) ? buf : NodeBuffer.from(String(buf).replace(/^data:image\/png;base64,/, ""), "base64");
                    var file = path.join(out, name);
                    fs.writeFileSync(file, data);
                    var sig = data.slice(0, 8).toString("hex");
                    var info = { file: name, bytes: data.length, png: sig === "89504e470d0a1a0a", width: data.readUInt32BE(16), height: data.readUInt32BE(20), innerWidth: window.innerWidth, innerHeight: window.innerHeight, devicePixelRatio: window.devicePixelRatio, scrollX: window.scrollX, scrollY: window.scrollY };
                    results.screenshots.push(info);
                    log("screenshot " + name + " " + info.width + "x" + info.height + " " + info.bytes + " bytes");
                    resolve(info);
                } catch (e) { reject(e); }
            }, { format: "png", datatype: "buffer" });
        });
    }

    // ------------------------------------------------------------------ the run
    async function run() {
        log("verify.js injected; url=" + location.href + " node=" + hasNode + " out=" + out);
        beacon("injected node=" + hasNode);
        if (!hasNode || !out) { beacon("no-node-or-out"); throw new Error("Node/require unavailable in the page or no srdVerify.out in the manifest"); }
        try { fs.mkdirSync(out, { recursive: true }); } catch (e) { /* exists */ }
        try { fs.unlinkSync(path.join(out, "results.json")); } catch (e) { /* none */ }
        results.window = { innerWidth: window.innerWidth, innerHeight: window.innerHeight, devicePixelRatio: window.devicePixelRatio, screen: screen.width + "x" + screen.height };

        await scenario("S0", "catalogue loads in NW.js (status line, search enabled, results listed)", async function () {
            await waitFor("catalogue status", function () { return /^[\d,]+ entries · \d+ kinds/.test(text($("#status"))); }, 30000);
            assert(!$("#search").disabled, "#search is still disabled after load");
            var n = resultRows().length;
            assert(n > 0, "no result rows after load");
            assert(EXPECTED.total == null || n === EXPECTED.total, "listed " + n + " rows, catalogue files hold " + EXPECTED.total);
            var attribution = text($("#attribution"));
            assert(/System Reference Document 5\.1/.test(attribution), "attribution line missing: " + attribution.slice(0, 80));
            return text($("#status")) + "; " + n + " rows; window " + window.innerWidth + "x" + window.innerHeight + " dpr " + window.devicePixelRatio;
        });

        await scenario("S1", "search 'fireball' shows Fireball first", async function () {
            var names = await search("fireball", "Fireball");
            assert(names[0] === "Fireball", "first result is " + names[0]);
            assert(names.indexOf("Delayed Blast Fireball") > 0, "Delayed Blast Fireball not among the results: " + names.slice(0, 5).join(", "));
            assert(/^\d+ of [\d,]+ entries$/.test(countLabel()), "count label malformed: " + countLabel());
            var shown = ["#l-challenge", "#l-level"].filter(function (s) { return getComputedStyle($(s)).display !== "none"; });
            assert(shown.length === 0, "with category All these filters are drawn although their labels are hidden: " + shown.join(", "));
            return names.length + " results: " + names.slice(0, 3).join(", ") + "; " + countLabel() + "; Challenge and Spell level filters not drawn";
        });

        await scenario("S2", "category Creatures then kind creature narrows the list to 317 and the count label says so", async function () {
            $("#clear-btn").click();
            await waitFor("clear to restore the full list", function () { return EXPECTED.total == null ? resultRows().length > 1000 : resultRows().length === EXPECTED.total; }, 3000);
            assert($("#search").value === "", "Clear did not empty the search box");
            var cat = $("#f-category");
            assert($$("option", cat).some(function (o) { return o.value === "creatures"; }), "category select has no 'creatures' option");
            cat.value = "creatures"; fire(cat, "change");
            await waitFor("category filter", function () { return resultRows().length === EXPECTED.creatures; }, 3000);
            assert(!$("#l-challenge").hidden, "Challenge filter did not appear for Creatures");
            assert(getComputedStyle($("#l-challenge")).display !== "none", "Challenge filter is hidden=false but not drawn");
            assert($("#l-level").hidden && getComputedStyle($("#l-level")).display === "none", "Spell level filter is drawn for Creatures (hidden=" + $("#l-level").hidden + ", display " + getComputedStyle($("#l-level")).display + ")");
            var kind = $("#f-kind");
            var kindOpts = $$("option", kind).map(function (o) { return o.value; });
            assert(kindOpts.indexOf("creature") >= 0, "kind select lacks 'creature'; has " + kindOpts.join(","));
            kind.value = "creature"; fire(kind, "change");
            await sleep(120);
            var n = resultRows().length;
            assert(n === EXPECTED.creatures, "list has " + n + " rows, expected " + EXPECTED.creatures);
            var label = countLabel();
            var expectedLabel = EXPECTED.total == null ? null : num(EXPECTED.creatures) + " of " + num(EXPECTED.total) + " entries";
            assert(expectedLabel == null ? /^317 of [\d,]+ entries$/.test(label) : label === expectedLabel, "count label is " + JSON.stringify(label) + ", expected " + JSON.stringify(expectedLabel));
            var badges = $$("#results li .badge.kind").map(text);
            assert(badges.length === n && badges.every(function (b) { return b === "creature"; }), "not every row carries the 'creature' kind badge");
            return n + " rows; label " + JSON.stringify(label) + "; kind options " + kindOpts.filter(Boolean).join(",");
        });

        await scenario("S3", "open srd:creature:aboleth: stat block shows Armor Class 17, Hit Points 135, Actions and legendary actions", async function () {
            await openRow("Aboleth");
            var id = text($("#detail .d-id code"));
            assert(id === "srd:creature:aboleth", "detail id is " + id);
            assert(location.hash === "#" + encodeURIComponent("srd:creature:aboleth"), "location.hash is " + location.hash);
            var sb = $("#detail .statblock");
            assert(sb, "no .statblock rendered");
            var lines = $$(".sb-line", sb).map(text);
            var ac = lines.find(function (l) { return l.indexOf("Armor Class") === 0; }), hp = lines.find(function (l) { return l.indexOf("Hit Points") === 0; });
            assert(ac && ac.indexOf(EXPECTED.abolethAC) === 0, "AC line: " + ac);
            assert(hp && hp.indexOf(EXPECTED.abolethHP) === 0, "HP line: " + hp);
            var heads = $$("h4.sub", sb).map(text);
            assert(heads.indexOf("Actions") >= 0, "no Actions heading; headings: " + heads.join(","));
            assert(heads.indexOf("Legendary Actions") >= 0, "no Legendary Actions heading; headings: " + heads.join(","));
            var legHead = $$("h4.sub", sb).find(function (h) { return text(h) === "Legendary Actions"; });
            var legEntries = [];
            for (var e = legHead.nextElementSibling; e && e.tagName === "P"; e = e.nextElementSibling) legEntries.push(text(e));
            assert(legEntries.length >= 4, "expected an intro plus at least 3 legendary options after the heading, got " + legEntries.length);
            assert(/can take 3 legendary actions/.test(legEntries[0]), "legendary intro: " + legEntries[0].slice(0, 80));
            var legNames = legEntries.slice(1).map(function (s) { return s.split(". ")[0]; });
            ["Detect", "Tail Swipe", "Psychic Drain"].forEach(function (n) { assert(legNames.some(function (x) { return x.indexOf(n) === 0; }), "legendary option " + n + " missing; have " + legNames.join(",")); });
            var actHead = $$("h4.sub", sb).find(function (h) { return text(h) === "Actions"; });
            var actions = [];
            for (var a = actHead.nextElementSibling; a && a.tagName === "P"; a = a.nextElementSibling) actions.push(text(a).split(". ")[0]);
            assert(actions.indexOf("Multiattack") >= 0 && actions.indexOf("Tentacle") >= 0, "actions listed: " + actions.join(","));
            var abil = $$("table.abilities td", sb).map(text);
            assert(abil.length === 6 && abil[0] === "21 (+5)", "ability cells: " + abil.join(" | "));
            window.scrollTo(0, 0);
            await frames(2);
            var shot = await capture("desktop_results_aboleth.png");
            assert(shot.png, "capturePage did not return a PNG");
            return ac + "; " + hp + "; actions " + actions.join(",") + "; legendary " + legNames.join(",") + "; hash " + location.hash;
        });

        await scenario("S4", "srd:magic-item:deck-of-many-things renders its table (Playing Card column, 22 rows); srd:spell:wish scrolls without clipping", async function () {
            clearAll();
            await search("deck of many things", "Deck of Many Things");
            await openRow("Deck of Many Things");
            assert(text($("#detail .d-id code")) === "srd:magic-item:deck-of-many-things", "wrong id opened");
            var wrap = $("#detail .section .table-wrap");
            assert(wrap, "no .table-wrap in the formatted view");
            var table = $("table.grid", wrap);
            assert(table && table.tagName === "TABLE", "no <table class=grid> inside .table-wrap");
            var ths = $$("thead th", table).map(text);
            assert(ths.indexOf(EXPECTED.deckColumn) >= 0, "header cells: " + ths.join(" | "));
            var rows = $$("tbody tr", table);
            assert(rows.length === EXPECTED.deckRows, "tbody has " + rows.length + " rows");
            var emptyFirst = rows.filter(function (r) { return !text(r.children[0]); }).length;
            assert(emptyFirst === 0, emptyFirst + " rows have an empty first cell");
            assert(rows.every(function (r) { return r.children.length === ths.length; }), "row cell counts differ from the header");
            table.scrollIntoView({ block: "start" });
            window.scrollBy(0, -72);
            await frames(2);
            var tr = rect(table);
            assert(tr.left >= 0 && tr.right <= window.innerWidth + 1, "table overflows horizontally: " + JSON.stringify(tr));
            assert(tr.top >= 0 && tr.top < window.innerHeight, "table top not in view after scroll: " + JSON.stringify(tr));
            var shot = await capture("desktop_deck_table.png");
            assert(shot.png, "capturePage did not return a PNG");

            // Long description: Wish
            await search("wish", "Wish");
            await openRow("Wish");
            assert(text($("#detail .d-id code")) === "srd:spell:wish", "wrong id opened for wish");
            window.scrollTo(0, 0);                             // the table scroll above must not leak into this check
            await frames(2);
            var raw = JSON.parse($("#detail details.raw pre").textContent);
            var dataParas = String(raw.data.description).split(/\n\s*\n/).filter(function (p) { return p.trim().length; });
            var section = $("#detail .section");
            var layoutBottom = rect($(".layout")).bottom, footerTop = rect($("footer.footer")).top;
            assert(footerTop >= layoutBottom - 1, "the footer (top " + Math.round(footerTop) + ") sits over the content (layout bottom " + Math.round(layoutBottom) + "): body height is pinned to the viewport");
            var rendered =$$(":scope > div > p.pre", section).filter(function (p) { return !$("b", p); });   // the spell view's own paragraphs (At Higher Levels carries a <b>)
            assert(rendered.length === dataParas.length, "rendered " + rendered.length + " description paragraphs, data has " + dataParas.length);
            var lastPara = rendered[rendered.length - 1];
            var de = document.documentElement;
            assert(de.scrollHeight > de.clientHeight, "page is not scrollable although the entry is long (scrollHeight " + de.scrollHeight + ", clientHeight " + de.clientHeight + ")");
            var firstTop = rect(rendered[0]).top;
            assert(rect(lastPara).bottom > window.innerHeight, "the last paragraph already fits without scrolling (" + rect(lastPara).bottom + " <= " + window.innerHeight + "); test cannot judge scrolling");
            window.scrollTo(0, de.scrollHeight);
            await frames(2);
            assert(window.scrollY > 0, "window did not scroll");
            var footer = $("footer.footer");
            assert(inViewport(rect(footer)), "footer not in view at the bottom: " + JSON.stringify(rect(footer)));
            var footerBottom = rect(footer).bottom;
            assert(footerBottom >= window.innerHeight - 2, "the footer is not the last thing on the page (bottom " + Math.round(footerBottom) + " of " + window.innerHeight + ")");
            lastPara.scrollIntoView({ block: "center" });      // the verbatim, dice and raw JSON sections follow it
            await frames(2);
            var lr = rect(lastPara);
            assert(inViewport(lr), "last paragraph not fully in view after scrollIntoView: " + JSON.stringify(lr));
            var clips = clippingAncestors(lastPara);
            assert(clips.length === 0, "last paragraph is clipped by " + clips.join(", "));
            var hit = document.elementFromPoint(lr.left + Math.min(40, lr.width / 2), lr.top + Math.min(10, lr.height / 2));
            assert(hit && (hit === lastPara || lastPara.contains(hit)), "another element covers the last paragraph: " + (hit ? hit.tagName + "." + hit.className : "none"));
            var wishLen = String(raw.data.description).length;
            window.scrollTo(0, 0);
            return "table " + ths.join("/") + " x " + rows.length + " rows; Wish description " + wishLen + " chars in " + rendered.length + " paragraphs, first at y=" + Math.round(firstTop) + ", page scrollHeight " + de.scrollHeight + ", scrolled to " + window.scrollY;
        });

        var clipboardSnapshot = null;
        await scenario("S5", "Copy Stable ID puts the id on the system clipboard (read back with nw.Clipboard)", async function () {
            var clip = nw.Clipboard.get();
            try { clipboardSnapshot = clip.readAvailableTypes().map(function (t) { return { type: t, data: clip.get(t) }; }); } catch (e) { clipboardSnapshot = null; }
            try { clip.set("nw_verify sentinel " + T0, "text"); } catch (e) { throw new Error("nw.Clipboard.set failed: " + e.message); }
            var id = text($("#detail .d-id code"));
            assert(id === "srd:spell:wish", "unexpected current entry " + id);
            var btn = $$("#detail .d-id button").find(function (b) { return text(b) === "Copy Stable ID"; });
            assert(btn, "no Copy Stable ID button");
            btn.click();
            var status = $("#detail .copy-status");
            await waitFor("copy status text", function () { return text(status) !== ""; }, 3000);
            var st = text(status);
            var got = await waitFor("clipboard to hold the id", function () { var t = clip.get("text"); return t === id ? t : null; }, 3000).catch(function () { return clip.get("text"); });
            assert(got === id, "clipboard holds " + JSON.stringify(String(got).slice(0, 60)) + ", status " + JSON.stringify(st));
            assert(st === "Copied", "status label says " + JSON.stringify(st));
            return "clipboard text = " + got + "; status " + JSON.stringify(st);
        });
        try { if (clipboardSnapshot && clipboardSnapshot.length) nw.Clipboard.get().set(clipboardSnapshot); else if (clipboardSnapshot) nw.Clipboard.get().clear(); log("clipboard restored (" + (clipboardSnapshot ? clipboardSnapshot.map(function (s) { return s.type; }).join(",") || "empty" : "unknown") + ")"); } catch (e) { log("clipboard restore failed: " + e.message); }

        await scenario("S6", "setting location.hash to #srd:spell:fireball switches the detail pane", async function () {
            assert(title() === "Wish", "precondition: current title is " + title());
            location.hash = "#srd:spell:fireball";
            await waitFor("detail title Fireball", function () { return title() === "Fireball"; }, 3000);
            assert(text($("#detail .d-id code")) === "srd:spell:fireball", "detail id is " + text($("#detail .d-id code")));
            var active = $("#results li.active .r-name");
            assert(active && text(active) === "Fireball", "active row is " + (active ? text(active) : "none"));
            var school = text($("#detail .spell-head .school"));
            assert(/3rd-level evocation/i.test(school), "spell line: " + school);
            var spellText = text($("#detail .section"));            // the formatted view only, not the verbatim section
            var labelCount = (spellText.match(/At Higher Levels\./g) || []).length;
            assert(labelCount === 1, "'At Higher Levels.' appears " + labelCount + " times in the formatted spell view");
            assert(/At Higher Levels\. When you cast this spell using a spell slot of 4th level/.test(spellText), "At Higher Levels text not rendered as expected");
            return "title Fireball; " + school + "; " + countLabel() + "; hash " + location.hash;
        });

        await scenario("S7", "at 900 px wide the layout has no horizontal overflow and the detail pane stays visible", async function () {
            var win = nw.Window.get();
            var before = window.innerWidth;
            win.resizeTo(900, 900);
            await waitFor("innerWidth <= 900 (was " + before + ")", function () { return window.innerWidth <= 900 && window.innerWidth !== before; }, 5000);
            window.scrollTo(0, 0);                             // judge the layout from the top of the page
            await frames(3);
            var de = document.documentElement;
            var iw = window.innerWidth;
            assert(iw >= 860 && iw <= 900, "innerWidth after resizeTo(900) is " + iw);
            assert(de.scrollWidth <= de.clientWidth, "documentElement.scrollWidth " + de.scrollWidth + " > clientWidth " + de.clientWidth);
            assert(document.body.scrollWidth <= de.clientWidth, "body.scrollWidth " + document.body.scrollWidth + " > clientWidth " + de.clientWidth);
            var detail = $("#detail");
            assert(!detail.hidden && getComputedStyle(detail).display !== "none", "#detail hidden");
            var dr = rect(detail), sr = rect($(".sidebar")), mr = rect($(".main"));
            assert(dr.width > 300 && dr.left >= 0 && dr.right <= iw + 1, "detail rect " + JSON.stringify(dr));
            assert(sr.right <= mr.left + 1, "sidebar (right " + sr.right + ") overlaps main (left " + mr.left + ")");
            assert(sr.width >= 280, "sidebar collapsed to " + sr.width + " px");
            var t = $("#detail .d-title");
            assert(inViewport(rect(t)), "detail title not in view: " + JSON.stringify(rect(t)));
            var hit = document.elementFromPoint(dr.left + 40, rect(t).top + 8);
            assert(hit && detail.contains(hit), "detail pane is covered at its title by " + (hit ? hit.tagName + "." + hit.className : "nothing"));
            var overflowing = $$("body *").filter(function (el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.right > iw + 1 && getComputedStyle(el).position !== "absolute" && !insideScroller(el); }).map(function (el) { return el.tagName + (el.id ? "#" + el.id : "") + (el.className ? "." + String(el.className).split(" ")[0] : ""); });
            assert(overflowing.length === 0, "elements extend past the viewport: " + overflowing.slice(0, 6).join(", "));
            window.scrollTo(0, 0);
            await frames(2);
            var shot = await capture("narrow_900.png");
            assert(shot.png && shot.width <= 900, "screenshot is " + shot.width + " px wide");
            return "innerWidth " + iw + " (from " + before + "); scrollWidth " + de.scrollWidth + " <= clientWidth " + de.clientWidth + "; sidebar " + Math.round(sr.width) + " px, detail " + Math.round(dr.width) + " px at x=" + Math.round(dr.left);
        });

        await scenario("S8", "zero console errors, window errors, unhandled rejections and failed resource loads from page load to the end", async function () {
            var hooks = window.__srdVerifyErrors;
            assert(hooks, "hooks.js (inject_js_start) did not install window.__srdVerifyErrors, so errors before injection cannot be ruled out");
            var res = performance.getEntriesByType("resource").map(function (e) { return { name: e.name.replace(location.origin, ""), type: e.initiatorType, transferSize: e.transferSize, encodedBodySize: e.encodedBodySize, responseEnd: Math.round(e.responseEnd) }; });
            var failedRes = res.filter(function (e) { return !/^\/__nw_verify\//.test(e.name) && (e.responseEnd === 0 || (e.transferSize === 0 && e.encodedBodySize === 0)); });
            var expectedFiles = ["/catalog/catalogue_manifest.json", "/catalog/creatures.json", "/catalog/spells.json", "/catalog/equipment.json", "/catalog/magic_items.json", "/catalog/character_options.json", "/catalog/rules.json", "/img/system/IconSet.png"];
            var missing = expectedFiles.filter(function (f) { return !res.some(function (e) { return e.name === f; }); });
            results.errors = {
                consoleErrors: hooks.consoleErrors, consoleWarnings: hooks.consoleWarnings, windowErrors: hooks.windowErrors, rejections: hooks.rejections,
                resourceErrors: hooks.resourceErrors, fetchFailures: hooks.fetchFailures, failedResourceEntries: failedRes, resourceEntries: res.length, missingExpectedResources: missing, hooksInstalledAt: hooks.installedAt
            };
            var problems = [];
            ["consoleErrors", "windowErrors", "rejections", "resourceErrors", "fetchFailures"].forEach(function (k) { if (hooks[k].length) problems.push(k + " " + hooks[k].length + ": " + hooks[k].slice(0, 2).join(" | ")); });
            if (failedRes.length) problems.push("failed resource entries " + failedRes.length + ": " + failedRes.map(function (e) { return e.name; }).slice(0, 4).join(", "));
            if (missing.length) problems.push("expected resources never loaded: " + missing.join(", "));
            assert(problems.length === 0, problems.join("; "));
            return res.length + " resource entries (" + expectedFiles.length + " expected files all present), 0 console errors, 0 window errors, 0 rejections, 0 element load failures, 0 fetch failures" + (hooks.consoleWarnings.length ? "; " + hooks.consoleWarnings.length + " console warning(s): " + hooks.consoleWarnings.slice(0, 2).join(" | ") : "");
        });

        await scenario("S9", "three PNG screenshots written at device scale 1", async function () {
            var want = ["desktop_results_aboleth.png", "desktop_deck_table.png", "narrow_900.png"];
            var missing = want.filter(function (n) { return !results.screenshots.some(function (s) { return s.file === n; }); });
            assert(missing.length === 0, "not captured: " + missing.join(", "));
            var bad = results.screenshots.filter(function (s) { return !s.png || s.bytes < 1000 || s.devicePixelRatio !== 1 || s.width !== s.innerWidth || s.height !== s.innerHeight; });
            assert(bad.length === 0, "unexpected screenshots: " + JSON.stringify(bad));
            return results.screenshots.map(function (s) { return s.file + " " + s.width + "x" + s.height + " " + s.bytes + " B"; }).join("; ");
        });
    }

    function finish(fatal) {
        results.finishedAt = new Date().toISOString();
        results.fatal = fatal ? String(fatal && fatal.stack || fatal) : null;
        if (fatal) log("FATAL " + results.fatal);
        try {
            if (fs && out) {
                var tmp = path.join(out, "results.json.tmp");
                fs.writeFileSync(tmp, JSON.stringify(results, null, 2));
                fs.renameSync(tmp, path.join(out, "results.json"));
                log("results.json written; quitting");
            }
        } catch (e) { log("could not write results.json: " + e.message); beacon("write-failed " + e.message); }
        beacon("done");
        setTimeout(function () { try { nw.App.quit(); } catch (e) { try { window.close(); } catch (e2) { /* nothing left to try */ } } }, 150);
    }

    run().then(function () { finish(null); }, function (err) { finish(err); });
})();
