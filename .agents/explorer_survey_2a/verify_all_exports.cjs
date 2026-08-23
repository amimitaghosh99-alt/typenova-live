const fs = require('fs');
const path = require('path');
const ts = require('typescript');

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

// Check each file's exports
const exportUsageReport = [];

files.forEach(filePath => {
  const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const code = fs.readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);

  function examine(name, line, kind) {
    let externalUsages = 0;
    let internalUsages = 0;
    const externalFiles = [];

    // Check internal usages
    const nameRegex = new RegExp(`\\b${name}\\b`, 'g');
    const internalMatches = code.match(nameRegex) || [];
    // If it only matches the declaration itself, internal usage is 0
    internalUsages = internalMatches.length - 1;

    // Check external usages
    files.forEach(other => {
      if (other === filePath) return;
      const otherRel = path.relative(rootDir, other).replace(/\\/g, '/');
      const otherCode = fs.readFileSync(other, 'utf8');
      if (new RegExp(`\\b${name}\\b`).test(otherCode)) {
        // Check if imported from this file
        const baseName = path.basename(filePath, path.extname(filePath));
        // Check if otherCode has import ... from ... matching filePath
        const importFromPattern = new RegExp(`from\\s+['"][^'"]*${baseName}['"]`);
        if (importFromPattern.test(otherCode) || otherCode.includes(`from '@/`) || otherCode.includes(`from '../`)) {
          externalUsages++;
          externalFiles.push(otherRel);
        }
      }
    });

    exportUsageReport.push({
      file: rel,
      name,
      line,
      kind,
      internalUsages,
      externalUsages,
      externalFiles
    });
  }

  ts.forEachChild(sf, node => {
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(el => {
          const line = sf.getLineAndCharacterOfPosition(el.getStart()).line + 1;
          examine(el.name.text, line, 're-export');
        });
      }
    } else if (node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
        if (node.name) examine(node.name.text, line, 'function/class');
      } else if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) {
        if (node.name) examine(node.name.text, line, 'type/interface');
      } else if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name)) {
            examine(decl.name.text, line, 'const/variable');
          }
        });
      }
    }
  });
});

const deadExports = exportUsageReport.filter(e => e.externalUsages === 0);
console.log(`Total exports analyzed: ${exportUsageReport.length}`);
console.log(`Unused external exports: ${deadExports.length}`);

fs.writeFileSync('.agents/explorer_survey_2a/dead_exports_report.json', JSON.stringify(deadExports, null, 2));
