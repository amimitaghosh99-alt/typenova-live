const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// I need to fetch the original lines from github!
// Wait, I can just use git checkout to restore and then do it properly.
