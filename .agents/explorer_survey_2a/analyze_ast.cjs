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
console.log(`Found ${files.length} TypeScript files in src/`);

// Build TS Program for accurate symbol and reference tracking
const configPath = ts.findConfigFile(rootDir, ts.sys.fileExists, 'tsconfig.app.json') ||
                   ts.findConfigFile(rootDir, ts.sys.fileExists, 'tsconfig.json');

let program;
let checker;
if (configPath) {
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedCommandLine = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  );
  program = ts.createProgram(parsedCommandLine.fileNames, parsedCommandLine.options);
  checker = program.getTypeChecker();
}

console.log('TypeScript Program created successfully.');

// Collect all exports and imports
const fileExports = new Map(); // file -> [ { name, line, isDefault } ]
const allImports = []; // [ { fromFile, importedName, moduleSpecifier, resolvedFile, line } ]
const unusedImports = [];
const commentedOutBlocks = [];

files.forEach(filePath => {
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const sourceCode = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  const exports = [];
  const imports = [];

  // Check for large commented-out code blocks (> 3 lines of code-like comments)
  const commentRegex = /\/\*[\s\S]*?\*\/|\/\/.*/g;
  let match;
  while ((match = commentRegex.exec(sourceCode)) !== null) {
    const comment = match[0];
    const lines = comment.split('\n');
    if (lines.length >= 4) {
      // Check if it looks like code (contains ;, {, }, const, function, return, import, etc.)
      if (/(\bconst\b|\blet\b|\bfunction\b|\breturn\b|\bimport\b|\bexport\b|=>|\{|\})/m.test(comment)) {
        const lineNum = sourceCode.substring(0, match.index).split('\n').length;
        commentedOutBlocks.push({
          file: relPath,
          startLine: lineNum,
          lineCount: lines.length,
          snippet: lines.slice(0, 3).join('\n') + '...'
        });
      }
    }
  }

  function visit(node) {
    // Check ExportDeclaration or ExportAssignment or modifiers with Export
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(el => {
          const line = sourceFile.getLineAndCharacterOfPosition(el.getStart()).line + 1;
          exports.push({ name: el.name.text, line, isDefault: false });
        });
      }
    } else if (ts.isExportAssignment(node)) {
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      exports.push({ name: 'default', line, isDefault: true });
    } else if (node.modifiers && node.modifiers.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      const isDefault = node.modifiers.some(m => m.kind === ts.SyntaxKind.DefaultKeyword);
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) {
        const name = node.name ? node.name.text : (isDefault ? 'default' : 'anonymous');
        exports.push({ name, line, isDefault });
      } else if (ts.isVariableStatement(node)) {
        node.declarationList.declarations.forEach(decl => {
          if (ts.isIdentifier(decl.name)) {
            exports.push({ name: decl.name.text, line, isDefault });
          }
        });
      }
    }

    // Check ImportDeclaration
    if (ts.isImportDeclaration(node)) {
      const moduleSpec = node.moduleSpecifier.text;
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      if (node.importClause) {
        if (node.importClause.name) {
          imports.push({ name: node.importClause.name.text, isDefault: true, line, node: node.importClause.name });
        }
        if (node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(el => {
              const elLine = sourceFile.getLineAndCharacterOfPosition(el.getStart()).line + 1;
              imports.push({ name: el.name.text, isDefault: false, line: elLine, node: el.name });
            });
          } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            const nsLine = sourceFile.getLineAndCharacterOfPosition(node.importClause.namedBindings.getStart()).line + 1;
            imports.push({ name: node.importClause.namedBindings.name.text, isNamespace: true, line: nsLine, node: node.importClause.namedBindings.name });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  fileExports.set(relPath, exports);

  // Check if imported identifiers are used elsewhere in sourceFile
  imports.forEach(imp => {
    let count = 0;
    function checkUsage(node) {
      if (node !== imp.node && ts.isIdentifier(node) && node.text === imp.name) {
        // Make sure it's an identifier usage, not another declaration/import
        const parent = node.parent;
        if (!ts.isImportSpecifier(parent) && !ts.isImportClause(parent) && !ts.isNamespaceImport(parent)) {
          count++;
        }
      }
      ts.forEachChild(node, checkUsage);
    }
    checkUsage(sourceFile);
    if (count === 0) {
      unusedImports.push({
        file: relPath,
        name: imp.name,
        line: imp.line
      });
    }
  });
});

console.log(`Unused imports found: ${unusedImports.length}`);
fs.writeFileSync('.agents/explorer_survey_2a/ast_unused_imports.json', JSON.stringify(unusedImports, null, 2));
fs.writeFileSync('.agents/explorer_survey_2a/ast_commented_blocks.json', JSON.stringify(commentedOutBlocks, null, 2));

// Next, check unused exports across the entire project
// An export is unused if no other file imports it AND it's not the main entry (main.tsx, App.tsx, etc.)
const entryFiles = ['src/main.tsx', 'src/App.tsx', 'src/index.css'];

const unusedExports = [];
fileExports.forEach((exports, exportFile) => {
  if (exportFile === 'src/main.tsx') return;

  exports.forEach(exp => {
    let isImported = false;

    // Search across all files for import matching
    for (const filePath of files) {
      const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
      if (relPath === exportFile) continue;

      const code = fs.readFileSync(filePath, 'utf8');
      // Match exact name in import statements or dynamic imports
      const importRegex = new RegExp(`\\b${exp.name}\\b`);
      if (importRegex.test(code)) {
        isImported = true;
        break;
      }
    }

    if (!isImported) {
      unusedExports.push({
        file: exportFile,
        name: exp.name,
        line: exp.line,
        isDefault: exp.isDefault
      });
    }
  });
});

console.log(`Potentially unused exports: ${unusedExports.length}`);
fs.writeFileSync('.agents/explorer_survey_2a/ast_unused_exports.json', JSON.stringify(unusedExports, null, 2));
