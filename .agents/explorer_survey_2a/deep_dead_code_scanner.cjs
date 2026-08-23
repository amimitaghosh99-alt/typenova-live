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

// Configure TS with strict unused checks
const configPath = ts.findConfigFile(rootDir, ts.sys.fileExists, 'tsconfig.app.json') ||
                   ts.findConfigFile(rootDir, ts.sys.fileExists, 'tsconfig.json');

let parsedCommandLine;
if (configPath) {
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  parsedCommandLine = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  );
}

// Enable strict unused checks in TS options
const compilerOptions = {
  ...parsedCommandLine.options,
  noUnusedLocals: true,
  noUnusedParameters: true,
  allowUnreachableCode: false
};

const program = ts.createProgram(parsedCommandLine.fileNames, compilerOptions);
const diagnostics = ts.getPreEmitDiagnostics(program);

const unusedDiagnostics = [];
diagnostics.forEach(diag => {
  if (diag.file) {
    const rel = path.relative(rootDir, diag.file.fileName).replace(/\\/g, '/');
    if (rel.startsWith('src/')) {
      const { line, character } = diag.file.getLineAndCharacterOfPosition(diag.start);
      unusedDiagnostics.push({
        file: rel,
        line: line + 1,
        column: character + 1,
        code: diag.code,
        message: ts.flattenDiagnosticMessageText(diag.messageText, '\n')
      });
    }
  }
});

console.log(`TS Diagnostics found with noUnusedLocals/Parameters: ${unusedDiagnostics.length}`);
fs.writeFileSync('.agents/explorer_survey_2a/ts_unused_diagnostics.json', JSON.stringify(unusedDiagnostics, null, 2));

// Detailed report of every diagnostic
unusedDiagnostics.forEach(d => {
  console.log(`[TS${d.code}] ${d.file}:${d.line}:${d.column} - ${d.message}`);
});
