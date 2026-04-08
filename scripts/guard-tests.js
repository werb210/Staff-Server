#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const ignoredDirs = new Set(['node_modules', '.git', 'dist', 'coverage']);

function walk(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      walk(fullPath, results);
      continue;
    }

    if (exts.has(path.extname(entry.name))) {
      results.push(fullPath);
    }
  }
  return results;
}

const targetDirs = ['src', 'test', 'tests', 'scripts']
  .map((dir) => path.join(root, dir))
  .filter((dir) => fs.existsSync(dir));

const files = targetDirs.flatMap((dir) => walk(dir));
const pattern = /\b(?:it|test|describe)\s*\.\s*(?:only|skip)\s*\(/g;
const violations = [];
for (const file of files) {
  const rel = path.relative(root, file);
  const src = fs.readFileSync(file, 'utf8');
  const matches = src.match(pattern);
  if (matches && matches.length > 0) {
    violations.push({ file: rel, matches });
  }
}

if (violations.length > 0) {
  console.error('Found forbidden .only/.skip usage in files:');
  for (const violation of violations) {
    const uniqueMatches = [...new Set(violation.matches)];
    console.error(` - ${violation.file}: ${uniqueMatches.join(', ')}`);
  }
  process.exit(1);
}

console.log('No test .only/.skip detected.');
