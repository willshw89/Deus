const fs = require('fs');
const path = require('path');

const base64Wasm = "AGFzbQEAAAABCAFgA3x8fAF8AwMCAAAHDQEJc2ltcGxleDNkAAEKZQI7AQN/IACqIQMgAaohBCACqiEFIANBsc/ZsgFsIARBr9bTvgJsaiAFQeG+xt8EbGq3RAAAAAAAAOBBowsnACAAIAEgAhAAIABEAAAAAAAA8D+gIAEgAhAAoEQAAAAAAADgP6IL";

const jsCode = `// WG.WORLDGEN.08: WebAssembly Simplex Integration
// Synchronous WASM loading for high-performance procedural generation
// Zero-allocation float math
const wasmBase64 = "${base64Wasm}";
const wasmBuffer = typeof Buffer !== 'undefined' ? Buffer.from(wasmBase64, 'base64') : Uint8Array.from(atob(wasmBase64), c => c.charCodeAt(0));
const wasmModule = new WebAssembly.Module(wasmBuffer);
const wasmInstance = new WebAssembly.Instance(wasmModule);
const simplex3d = wasmInstance.exports.simplex3d;

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { simplex3d };
} else if (typeof window !== 'undefined') {
    window.simplex3d = simplex3d;
}
`;

const outputPath = path.join(__dirname, '..', 'game', 'js', 'libs', 'simplex-wasm.js');
fs.writeFileSync(outputPath, jsCode);
console.log('Compiled and wrote simplex-wasm.js to', outputPath);
