const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'game', 'img', 'characters');
const targets = [
    'Human', 'Dwarf', 'Elf', 'Orc', 'Goblin', 'Gnome',
    'Boar', 'Wolf', 'Bear', 'Fox', 'Hare', 'GiantSpider', 'Troll'
];

const files = fs.readdirSync(dir)
    .filter(f => (f.startsWith('$UF_') || f.startsWith('!$UF_')) && targets.some(t => f.includes(t)))
    .map(f => path.join('game', 'img', 'characters', f));

console.log(`Staging ${files.length} character assets...`);

for (let i = 0; i < files.length; i += 25) {
    const batch = files.slice(i, i + 25).map(f => `"${f}"`).join(' ');
    execSync(`git add ${batch}`, { cwd: path.join(__dirname, '..') });
}

console.log('Staging complete.');
