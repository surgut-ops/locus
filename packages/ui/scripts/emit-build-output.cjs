const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'dist');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, '.build'), '');
