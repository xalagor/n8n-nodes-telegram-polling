const { stripTypeScriptTypes } = require('node:module');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

function processFile(filePath) {
  const relPath = path.relative(ROOT_DIR, filePath);
  const outPath = path.join(DIST_DIR, relPath).replace(/\.ts$/, '.js');
  const dtsPath = path.join(DIST_DIR, relPath).replace(/\.ts$/, '.d.ts');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const tsCode = fs.readFileSync(filePath, 'utf8');
  let stripped = stripTypeScriptTypes(tsCode);

  // Collect exported identifiers
  const exports = [];

  // Remove type-only imports and n8n-workflow type imports
  stripped = stripped.replace(/import\s+type\s+[^;]+;/g, '');
  stripped = stripped.replace(/import\s*\{\s*[^}]*\}\s*from\s*['"]n8n-workflow['"];?/g, '');

  // Convert value imports
  stripped = stripped.replace(/import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"];?/g, (m, imports, impPath) => {
    return `const { ${imports} } = require("${impPath.replace(/\.ts$/, '.js')}");`;
  });

  // Convert export class
  stripped = stripped.replace(/export\s+class\s+(\w+)/g, (m, className) => {
    exports.push(className);
    return `class ${className}`;
  });

  // Convert export function
  stripped = stripped.replace(/export\s+function\s+(\w+)/g, (m, fnName) => {
    exports.push(fnName);
    return `function ${fnName}`;
  });

  // Convert export const
  stripped = stripped.replace(/export\s+const\s+(\w+)/g, (m, constName) => {
    exports.push(constName);
    return `const ${constName}`;
  });

  // Append export assignments at end of file
  for (const exp of exports) {
    stripped += `\nexports.${exp} = ${exp};`;
  }

  fs.writeFileSync(outPath, stripped, 'utf8');

  // Generate basic .d.ts stub
  fs.writeFileSync(dtsPath, 'export {};\n', 'utf8');
  console.log(`Built ${relPath} -> ${path.relative(ROOT_DIR, outPath)}`);
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== 'tests') {
        walkDir(fullPath);
      }
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      processFile(fullPath);
    }
  }
}

console.log('Building project...');
walkDir(path.join(ROOT_DIR, 'src'));
walkDir(path.join(ROOT_DIR, 'nodes'));
walkDir(path.join(ROOT_DIR, 'credentials'));
console.log('Build completed successfully!');
