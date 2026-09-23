// tools/srd_browser/nw_verify/hooks.js - error collectors for the NW.js verification run.
//
// Injected by nw_verify.js as "inject_js_start", so it runs in the served page BEFORE
// catalog_query.js and app.js (inject_js_end would miss anything those scripts log while the
// DOM is still parsing). Everything it sees goes on window.__srdVerifyErrors, which verify.js
// reads at the end of the run (scenario 8: zero console errors, window errors, unhandled
// rejections, failed element loads and non-ok/rejected fetches). It changes nothing the page
// does: every hooked call is forwarded to the original.
(function () {
    "use strict";
    var log = {
        installedAt: new Date().toISOString(),
        consoleErrors: [],
        consoleWarnings: [],
        windowErrors: [],
        rejections: [],
        resourceErrors: [],
        fetchFailures: []
    };
    window.__srdVerifyErrors = log;

    function fmt(args) {
        try {
            return Array.prototype.map.call(args, function (a) {
                if (a instanceof Error) return a.stack || a.message;
                if (typeof a === "object") { try { return JSON.stringify(a); } catch (e) { return String(a); } }
                return String(a);
            }).join(" ");
        } catch (e) { return "(unformattable console arguments)"; }
    }
    var origError = console.error, origWarn = console.warn;
    console.error = function () { log.consoleErrors.push(fmt(arguments)); return origError.apply(console, arguments); };
    console.warn = function () { log.consoleWarnings.push(fmt(arguments)); return origWarn.apply(console, arguments); };

    // Capture phase: element load failures (img/script/link) fire "error" on the element and do not
    // bubble, but a capturing listener on window still sees them. Script errors arrive as ErrorEvent.
    window.addEventListener("error", function (ev) {
        var t = ev && ev.target;
        if (t && t !== window && t.tagName) {
            log.resourceErrors.push(t.tagName + " " + (t.src || t.href || "(no url)"));
        } else {
            log.windowErrors.push((ev && ev.message ? ev.message : String(ev)) + (ev && ev.filename ? " at " + ev.filename + ":" + ev.lineno + ":" + ev.colno : ""));
        }
    }, true);
    window.addEventListener("unhandledrejection", function (ev) {
        var r = ev && ev.reason;
        log.rejections.push(r && (r.stack || r.message) ? (r.stack || r.message) : String(r));
    });

    // The page loads its catalogue with fetch(); an HTTP error is a failed resource load too.
    var origFetch = window.fetch;
    if (typeof origFetch === "function") {
        window.fetch = function (input, init) {
            var url = typeof input === "string" ? input : (input && input.url ? input.url : String(input));
            return origFetch.apply(this, arguments).then(function (res) {
                if (!res.ok) log.fetchFailures.push(url + " -> HTTP " + res.status);
                return res;
            }, function (err) {
                log.fetchFailures.push(url + " -> " + (err && err.message ? err.message : String(err)));
                throw err;
            });
        };
    }
})();
