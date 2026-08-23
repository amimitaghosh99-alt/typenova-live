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

const allSrcFiles = getAllFiles(srcDir);
const allProjectFiles = getAllFiles(rootDir, ['.ts', '.tsx', '.js', '.jsx', '.html', '.css']);

// 1. Dependency Graph & Orphaned Files
const fileImportMap = new Map(); // file -> Set of imported file paths
const fileImportedByMap = new Map(); // file -> Set of files importing it

allSrcFiles.forEach(f => {
  fileImportMap.set(f, new Set());
  fileImportedByMap.set(f, new Set());
});

const configPath = ts.findConfigFile(rootDir, ts.sys.fileExists, 'tsconfig.app.json') ||
                   ts.findConfigFile(rootDir, ts.sys.fileExists, 'tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const parsedCommandLine = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  path.dirname(configPath)
);
const compilerOptions = parsedCommandLine.options;
const host = ts.createCompilerHost(compilerOptions);

allSrcFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  ts.forEachChild(sf, node => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const spec = node.moduleSpecifier.text;
        const resolved = ts.resolveModuleName(spec, filePath, compilerOptions, host);
        if (resolved && resolved.resolvedModule && !resolved.resolvedModule.isExternalLibraryImport) {
          const resolvedPath = path.normalize(resolved.resolvedModule.resolvedFileName);
          if (fileImportMap.has(filePath)) {
            fileImportMap.get(filePath).add(resolvedPath);
          }
          if (fileImportedByMap.has(resolvedPath)) {
            fileImportedByMap.get(resolvedPath).add(filePath);
          }
        }
      }
    }
  });
});

const orphanedFiles = [];
allSrcFiles.forEach(f => {
  const rel = path.relative(rootDir, f).replace(/\\/g, '/');
  // Root entries
  if (rel === 'src/main.tsx' || rel === 'src/index.css' || rel === 'src/vite-env.d.ts') return;
  const importers = fileImportedByMap.get(f);
  if (!importers || importers.size === 0) {
    orphanedFiles.push({
      file: rel,
      size: fs.statSync(f).size
    });
  }
});

console.log('--- ORPHANED / UNUSED FILES ---');
console.log(JSON.stringify(orphanedFiles, null, 2));

// 2. Unused Exports Check
const detailedExports = [];
allSrcFiles.forEach(filePath => {
  const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
  if (rel === 'src/main.tsx') return;

  const content = fs.readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

  function checkExport(name, line, isDefault, isTypeOnly) {
    let usageCount = 0;
    const usages = [];

    allSrcFiles.forEach(otherFile => {
      if (otherFile === filePath) return;
      const otherContent = fs.readFileSync(otherFile, 'utf8');
      const otherRel = path.relative(rootDir, otherFile).replace(/\\/g, '/');

      // If default export, check if otherFile imports default from this file
      if (isDefault) {
        // Look for import X from './path' or import X from '@/path'
        const fileBase = path.basename(filePath, path.extname(filePath));
        const importMatch = new RegExp(`import\\s+(?:type\\s+)?([a-zA-Z0-9_$]+)(?:\\s*,|\\s+from\\s+['"][^'"]*${fileBase}['"])`);
        if (importMatch.test(otherContent)) {
          usageCount++;
          usages.push(otherRel);
        }
      } else {
        // Named export: check if name is imported
        const namedMatch = new RegExp(`\\b${name}\\b`);
        // And ensure otherFile imports from this file or has identifier
        if (namedMatch.test(otherContent)) {
          const importsFromThis = fileImportMap.get(otherFile)?.has(filePath);
          if (importsFromThis) {
            usageCount++;
            usages.push(otherRel);
          }
        }
      }
    });

    // Check if used in App.tsx or index.html or scripts
    if (usageCount === 0) {
      detailedExports.push({
        file: rel,
        name,
        line,
        isDefault,
        isTypeOnly
      });
    }
  }

  ts.forEachChild(sf, node => {
    if (ts.isExportDeclaration(node)) {
      const isTypeOnly = node.isTypeOnly;
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(el => {
          const line = sf.getLineAndCharacterOfPosition(el.getStart()).line + 1;
          checkExport(el.name.text, line, false, isTypeOnly || el.isTypeOnly);
        });
      }
    } else if (ts.isExportAssignment(node)) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      checkExport('default', line, true, false);
    } else if (node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      const isDefault = node.modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
      const line = sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
        const name = node.name ? node.name.text : 'default';
        checkExport(name, line, isDefault, false);
      } else if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) {
        const name = node.name ? node.name.text : 'default';
        checkExport(name, line, isDefault, true);
      } else if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name)) {
            checkExport(decl.name.text, line, isDefault, false);
          }
        });
      }
    }
  });
});

console.log(`\n--- UNUSED EXPORTS (${detailedExports.length}) ---`);
console.log(JSON.stringify(detailedExports, null, 2));

fs.writeFileSync('.agents/explorer_survey_2a/survey_raw_data.json', JSON.stringify({
  orphanedFiles,
  detailedExports
}, null, 2));
