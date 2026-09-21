const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'game', 'img', 'characters');
const files = fs.readdirSync(dir);
for (const file of files) {
    if (file.includes('Barrel_Food') || file.includes('Crate_Wood')) {
        const full = path.join(dir, file);
        fs.unlinkSync(full);
        console.log('Deleted:', file);
    }
}
