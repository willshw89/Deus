"use strict";

const { createHash } = require("crypto");

// Type/length-delimited canonical hashing. All cells participate, including empty
// layers; no spot samples, expected hashes, or production checksum self-comparison.
function fingerprint(value) {
    const hash = createHash("sha256");
    function visit(v) {
        if (v === null || typeof v !== "object") {
            const text = String(v);
            hash.update(`${typeof v}:${Buffer.byteLength(text, "utf8")}:${text}`);
        } else if (ArrayBuffer.isView(v)) {
            hash.update(`${v.constructor.name}:${v.length}:`);
            hash.update(Buffer.from(v.buffer, v.byteOffset, v.byteLength));
        } else if (Object.prototype.toString.call(v) === "[object Map]") {
            const entries = [...v.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
            hash.update(`map:${entries.length}:`);
            for (const [key, item] of entries) { visit(key); visit(item); }
        } else if (Object.prototype.toString.call(v) === "[object Set]") {
            const entries = [...v].sort((a, b) => String(a).localeCompare(String(b)));
            hash.update(`set:${entries.length}:`);
            for (const item of entries) visit(item);
        } else if (Array.isArray(v)) {
            hash.update(`array:${v.length}:`);
            if (v.length && v.every(n => typeof n === "number")) {
                hash.update(Buffer.from(new Float64Array(v).buffer));
            } else for (const item of v) visit(item);
        } else {
            const keys = Object.keys(v).sort();
            hash.update(`object:${keys.length}:`);
            for (const key of keys) { visit(key); visit(v[key]); }
        }
    }
    visit(value);
    return hash.digest("hex");
}

function layerFingerprint(runtime, map, z) {
    const L = runtime.env.UF.Levels;
    const raw = L.baseline(z, 0, 0);
    // Packed chunk indices depend on a shared palette. Hash actual five-stratum
    // materials and connectors too; these accessors are non-enumerable.
    const baseline = { ...raw, strataMaterials: raw.strata.m, connectors: raw.conn };
    if (baseline.features) {
        baseline.features = { ...baseline.features };
        delete baseline.features.ms; // measured cut-generation duration, not terrain
    }
    return fingerprint({ data: map.data, objects: map.ufObjects, events: map.events,
        width: map.width, height: map.height, tilesetId: map.tilesetId, area: map.ufArea,
        shape: L.shapeGrid(z, 0, 0), baseline });
}

function stateFingerprint(world) {
    const truth = JSON.parse(JSON.stringify(world));
    // No fields are removed from saved world truth.
    const parts = {};
    for (const key of Object.keys(truth).sort()) parts[key] = fingerprint(truth[key]);
    return parts;
}

module.exports = { fingerprint, layerFingerprint, stateFingerprint };
