const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../../');
const srcDir = path.join(rootDir, 'src');

function getAllFiles(dir, exts = ['.ts', '.tsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else {
      if (exts.includes(path.extname(file))) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = getAllFiles(srcDir);
const commentedCode = [];

files.forEach(file => {
  const rel = path.relative(rootDir, file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf8').split('\n');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    // Check if line is a comment that looks like commented out code
    if (trimmed.startsWith('//') && !trimmed.startsWith('///')) {
      const content = trimmed.replace(/^\/\/\s*/, '');
      if (/^(const|let|var|import|export|console\.log|return|function|if\s*\(|await|set[A-Z]|<[A-Z])/.test(content)) {
        commentedCode.push({
          file: rel,
          line: idx + 1,
          code: trimmed
        });
      }
    }
  });
});

console.log(`Found ${commentedCode.length} commented-out code lines:`);
console.log(JSON.stringify(commentedCode, null, 2));

fs.writeFileSync('.agents/explorer_survey_2a/commented_code_lines.json', JSON.stringify(commentedCode, null, 2));
