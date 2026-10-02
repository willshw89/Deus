const { simplex3d } = require('../game/js/libs/simplex-wasm.js');

// Standard JS "Math.sin" simplex pseudo-implementation for comparison
function jsSimplex3d(x, y, z) {
    let ix = Math.floor(x)|0;
    let iy = Math.floor(y)|0;
    let iz = Math.floor(z)|0;
    
    function hash(hx, hy, hz) {
        let h = Math.imul(hx, 374761393) + Math.imul(hy, 668265263) + Math.imul(hz, 1274126177);
        return h / 2147483648.0;
    }
    
    let v1 = hash(ix, iy, iz);
    let v2 = hash(ix + 1, iy, iz);
    return (v1 + v2) * 0.5;
}

const ITERATIONS = 10000000;

console.log('--- Benchmarking Simplex 3D ---');
console.log(`Iterations: ${ITERATIONS}`);

// Warmup
for (let i = 0; i < 1000; i++) {
    jsSimplex3d(i * 0.1, i * 0.2, i * 0.3);
    simplex3d(i * 0.1, i * 0.2, i * 0.3);
}

// Test JS version
let startJs = performance.now();
let sumJs = 0;
for (let i = 0; i < ITERATIONS; i++) {
    sumJs += jsSimplex3d(i * 0.1, i * 0.2, i * 0.3);
}
let timeJs = performance.now() - startJs;

// Test Wasm version
let startWasm = performance.now();
let sumWasm = 0;
for (let i = 0; i < ITERATIONS; i++) {
    sumWasm += simplex3d(i * 0.1, i * 0.2, i * 0.3);
}
let timeWasm = performance.now() - startWasm;

console.log(`JS version:   ${timeJs.toFixed(2)} ms (checksum: ${sumJs})`);
console.log(`Wasm version: ${timeWasm.toFixed(2)} ms (checksum: ${sumWasm})`);
console.log(`Speedup:      ${(timeJs / timeWasm).toFixed(2)}x`);

if (timeWasm < timeJs) {
    console.log('SUCCESS: Wasm is faster than JS implementation!');
} else {
    console.log('NOTE: Wasm might not show peak performance on tiny test loads or due to crossing JS-Wasm boundary overhead.');
}
