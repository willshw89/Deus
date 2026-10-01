const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
let failed = false;

function assert(condition, message) {
    if (!condition) {
        console.error('FAIL:', message);
        failed = true;
    }
}

// 1. Files must not exist
const badFiles = [
    'tools/originality_check.js',
    'tools/check_furniture_originality.js',
    'tools/test_object_originality.js',
    'docs/systems/ORIGINALITY_CHECK.md'
];

for (const f of badFiles) {
    assert(!fs.existsSync(path.join(ROOT, f)), `File still exists: ${f}`);
}

// 2. tools/ops/quarantine.json must not name them
const qPath = path.join(ROOT, 'tools', 'ops', 'quarantine.json');
if (fs.existsSync(qPath)) {
    const qContent = fs.readFileSync(qPath, 'utf8');
    assert(!qContent.includes('originality_check'), 'quarantine.json contains originality_check');
    assert(!qContent.includes('check_furniture_originality'), 'quarantine.json contains check_furniture_originality');
    assert(!qContent.includes('test_object_originality'), 'quarantine.json contains test_object_originality');
    assert(!qContent.includes('originality_index'), 'quarantine.json contains originality_index');
}

// 3. any file under tools/ (other than this test) requires, spawns or names them
function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else if (fullPath.endsWith('.js') && fullPath !== __filename) {
            const content = fs.readFileSync(fullPath, 'utf8');
            assert(!content.includes('originality_check'), `${fullPath} contains originality_check`);
            assert(!content.includes('check_furniture_originality'), `${fullPath} contains check_furniture_originality`);
            assert(!content.includes('test_object_originality'), `${fullPath} contains test_object_originality`);
        }
    }
}
scanDir(path.join(ROOT, 'tools'));

// 4. any script this lane changed fails node --check
try {
    const mergeBase = cp.execSync('git merge-base main HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    const diffFiles = cp.execSync(`git diff --name-only ${mergeBase} HEAD -- tools`, { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
    
    for (const f of diffFiles) {
        if (f.endsWith('.js') && fs.existsSync(path.join(ROOT, f))) {
            try {
                cp.execSync(`"C:\\Program Files\\nodejs\\node.exe" --check "${f}"`, { cwd: ROOT, stdio: 'pipe' });
            } catch (e) {
                assert(false, `Syntax error in ${f}:\n${e.stderr ? e.stderr.toString() : e.message}`);
            }
        }
    }
} catch (e) {
    // If git commands fail (e.g. no main branch), warn but don't fail unless there's a real issue
    console.error('Warning: Could not check changed files syntax via git diff:', e.message);
}

if (failed) {
    process.exit(1);
} else {
    console.log('PASS: No originality checks found.');
    process.exit(0);
}
