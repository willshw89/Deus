// tools/validate_materials.js - Validates the material property registry in catalog
// Checks physical consistency, required properties, ranges, tags, and backward compatibility.
"use strict";

const fs = require("fs");
const path = require("path");

function validateMaterials(catalogOrPath) {
    let catalog;
    if (typeof catalogOrPath === "string") {
        const raw = fs.readFileSync(catalogOrPath, "utf8");
        catalog = JSON.parse(raw);
    } else {
        catalog = catalogOrPath;
    }

    const mats = catalog.materials;
    if (!mats || typeof mats !== "object") {
        return { ok: false, errors: ["Missing top-level 'materials' object in catalog"] };
    }

    const errors = [];
    const hexColorRe = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

    // 1. Validate Woods
    const woods = mats.woods;
    if (!woods || typeof woods !== "object") {
        errors.push("Missing 'materials.woods' dictionary");
    } else {
        const requiredWoodProps = [
            "name", "category", "density", "structuralStrength", "hardness",
            "flexibility", "workability", "rotResistance", "burnQuality",
            "insulation", "beauty", "rarity", "color", "tags"
        ];
        for (const [id, w] of Object.entries(woods)) {
            for (const prop of requiredWoodProps) {
                if (w[prop] === undefined || w[prop] === null) {
                    errors.push(`Wood '${id}' is missing required property '${prop}'`);
                }
            }
            if (typeof w.density !== "number" || w.density <= 0 || w.density > 2.0) {
                errors.push(`Wood '${id}' has invalid density: ${w.density} (expected 0.1 - 2.0 g/cm^3)`);
            }
            if (w.color && !hexColorRe.test(w.color)) {
                errors.push(`Wood '${id}' has invalid hex color: '${w.color}'`);
            }
            if (!Array.isArray(w.tags) || w.tags.length === 0) {
                errors.push(`Wood '${id}' must have a non-empty tags array`);
            }
        }
    }

    // 2. Validate Stones
    const stones = mats.stones;
    if (!stones || typeof stones !== "object") {
        errors.push("Missing 'materials.stones' dictionary");
    } else {
        const requiredStoneProps = [
            "name", "category", "density", "compressiveStrength", "fractureResistance",
            "workability", "weatherResistance", "heatResistance", "beauty", "rarity",
            "color", "tags"
        ];
        for (const [id, s] of Object.entries(stones)) {
            for (const prop of requiredStoneProps) {
                if (s[prop] === undefined || s[prop] === null) {
                    errors.push(`Stone '${id}' is missing required property '${prop}'`);
                }
            }
            if (typeof s.density !== "number" || s.density < 1.0 || s.density > 5.0) {
                errors.push(`Stone '${id}' has invalid density: ${s.density} (expected 1.0 - 5.0 g/cm^3)`);
            }
            if (s.color && !hexColorRe.test(s.color)) {
                errors.push(`Stone '${id}' has invalid hex color: '${s.color}'`);
            }
            if (!Array.isArray(s.tags) || s.tags.length === 0) {
                errors.push(`Stone '${id}' must have a non-empty tags array`);
            }
        }
    }

    // 3. Validate Metals
    const metals = mats.metals;
    if (!metals || typeof metals !== "object") {
        errors.push("Missing 'materials.metals' dictionary");
    } else {
        const requiredMetalProps = [
            "name", "density", "hardness", "toughness", "edgeRetention",
            "ductility", "corrosionResistance", "meltingPointBeats",
            "fuelRequirement", "rarity", "value", "color", "tags"
        ];
        for (const [id, m] of Object.entries(metals)) {
            for (const prop of requiredMetalProps) {
                if (m[prop] === undefined || m[prop] === null) {
                    errors.push(`Metal '${id}' is missing required property '${prop}'`);
                }
            }
            if (typeof m.density !== "number" || m.density < 1.0 || m.density > 25.0) {
                errors.push(`Metal '${id}' has invalid density: ${m.density} (expected 1.0 - 25.0 g/cm^3)`);
            }
            if (m.color && !hexColorRe.test(m.color)) {
                errors.push(`Metal '${id}' has invalid hex color: '${m.color}'`);
            }
            if (!Array.isArray(m.tags) || m.tags.length === 0) {
                errors.push(`Metal '${id}' must have a non-empty tags array`);
            }
        }
    }

    // 4. Validate Legacy Aliases (Ensures backward compatibility)
    if (mats.aliases && typeof mats.aliases === "object") {
        for (const [alias, target] of Object.entries(mats.aliases)) {
            const [domain, targetId] = target.split(":");
            if (!mats[domain] || !mats[domain][targetId]) {
                errors.push(`Alias '${alias}' points to non-existent target '${target}'`);
            }
        }
    }

    // 5. Validate Functional Substitution Roles
    const roles = mats.functionalRoles;
    if (roles && typeof roles === "object") {
        for (const [roleId, r] of Object.entries(roles)) {
            if (!r || typeof r !== "object") {
                errors.push(`Functional role '${roleId}' must be an object`);
                continue;
            }
            if (!r.name || typeof r.name !== "string") {
                errors.push(`Functional role '${roleId}' is missing a valid 'name'`);
            }
            if (r.materialFilter) {
                const { domain, property } = r.materialFilter;
                if (!["woods", "stones", "metals"].includes(domain)) {
                    errors.push(`Functional role '${roleId}' has invalid filter domain '${domain}'`);
                }
            }
        }
    }

    return {
        ok: errors.length === 0,
        errors,
        counts: {
            woods: woods ? Object.keys(woods).length : 0,
            stones: stones ? Object.keys(stones).length : 0,
            metals: metals ? Object.keys(metals).length : 0,
            aliases: mats.aliases ? Object.keys(mats.aliases).length : 0,
            roles: roles ? Object.keys(roles).length : 0
        }
    };
}

if (require.main === module) {
    const catalogPath = path.resolve(__dirname, "..", "game", "data", "UF_WorldCatalog.json");
    console.log(`Validating materials in: ${catalogPath}`);
    const res = validateMaterials(catalogPath);
    if (!res.ok) {
        console.error("FAIL: Material validation errors found:");
        for (const err of res.errors) {
            console.error(`  - ${err}`);
        }
        process.exit(1);
    } else {
        console.log(`PASS: Material registry is valid. Woods: ${res.counts.woods}, Stones: ${res.counts.stones}, Metals: ${res.counts.metals}, Aliases: ${res.counts.aliases}, Roles: ${res.counts.roles}`);
        process.exit(0);
    }
}

module.exports = { validateMaterials };

