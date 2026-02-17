#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, 'package.json');
const tsConfigPath = path.join(rootDir, 'tsconfig.json');

const hasTsConfig = fs.existsSync(tsConfigPath);
const hasViteConfig = [
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mts',
  'vite.config.mjs',
  'vite.config.cjs',
].some((fileName) => fs.existsSync(path.join(rootDir, fileName)));

const packageJson = fs.existsSync(packageJsonPath)
  ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  : {};
const hasBuildScript = Boolean(packageJson.scripts && packageJson.scripts.build);

const results = {
  eslint: { status: 'SKIPPED', warnings: 0, errors: 0, details: '' },
  typecheck: { status: 'SKIPPED', errors: 0, details: '' },
  audit: {
    status: 'SKIPPED',
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    details: '',
    warning: '',
  },
  depcheck: {
    status: 'SKIPPED',
    unusedDependencies: [],
    unusedDevDependencies: [],
    details: '',
    warning: '',
  },
  madge: { status: 'SKIPPED', circularCount: 0, circularChains: [], details: '' },
  build: { status: 'SKIPPED', details: '' },
  bundle: { status: 'SKIPPED', sizeSummary: [], details: '' },
};

function printSection(title) {
  console.log(`\n--- ${title} ---`);
}

function runCommand(command, options = {}) {
  try {
    const stdout = execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options,
    });
    return { success: true, stdout, stderr: '' };
  } catch (error) {
    return {
      success: false,
      stdout: error.stdout ? String(error.stdout) : '',
      stderr: error.stderr ? String(error.stderr) : '',
      message: error.message,
    };
  }
}

function extractEslintCounts(rawText) {
  const warningMatch = rawText.match(/(\d+)\s+warnings?/i);
  const errorMatch = rawText.match(/(\d+)\s+errors?/i);
  return {
    warnings: warningMatch ? Number(warningMatch[1]) : 0,
    errors: errorMatch ? Number(errorMatch[1]) : 0,
  };
}

function collectDistSizes(dirPath, accum = []) {
  if (!fs.existsSync(dirPath)) return accum;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectDistSizes(fullPath, accum);
      continue;
    }

    const stat = fs.statSync(fullPath);
    const relative = path.relative(rootDir, fullPath);
    accum.push({
      file: relative,
      sizeBytes: stat.size,
      sizeKB: (stat.size / 1024).toFixed(2),
    });
  }

  return accum;
}

function formatRiskLevel() {
  if (results.audit.critical > 0) return 'Critical';
  if (results.audit.high > 0 || results.build.status === 'FAIL') return 'High';
  if (
    results.audit.moderate > 0 ||
    results.eslint.errors > 0 ||
    results.typecheck.errors > 0 ||
    results.madge.circularCount > 0
  ) {
    return 'Medium';
  }
  return 'Low';
}

function computeSecurityScore() {
  const totalWeighted =
    results.audit.critical * 40 +
    results.audit.high * 20 +
    results.audit.moderate * 10 +
    results.audit.low * 5;
  return Math.max(0, 100 - totalWeighted);
}

function computeCodeQualityScore() {
  let penalty = 0;
  penalty += results.eslint.errors * 5;
  penalty += results.eslint.warnings * 2;
  penalty += results.typecheck.errors * 5;
  penalty += results.madge.circularCount * 8;
  return Math.max(0, 100 - penalty);
}

function computeDependencyHealth() {
  const unusedCount =
    results.depcheck.unusedDependencies.length +
    results.depcheck.unusedDevDependencies.length;
  const penalty =
    unusedCount * 3 +
    results.audit.low * 1 +
    results.audit.moderate * 2 +
    results.audit.high * 4 +
    results.audit.critical * 8;
  return Math.max(0, 100 - penalty);
}

console.log('=== ENTERPRISE REPOSITORY AUDIT ===');

printSection('CHECK 1: ESLINT');
{
  const response = runCommand('npx eslint . --ext .ts');
  const mergedOutput = `${response.stdout}\n${response.stderr}`;
  const counts = extractEslintCounts(mergedOutput);

  results.eslint.warnings = counts.warnings;
  results.eslint.errors = counts.errors;
  results.eslint.details = mergedOutput.trim();
  results.eslint.status = response.success && counts.errors === 0 ? 'PASS' : 'FAIL';

  console.log(`Status: ${results.eslint.status}`);
  console.log(`Warnings: ${results.eslint.warnings}`);
  console.log(`Errors: ${results.eslint.errors}`);
}

printSection('CHECK 2: TYPESCRIPT STRICT CHECK');
if (!hasTsConfig) {
  console.log('Skipped: tsconfig.json not found.');
} else {
  const response = runCommand('npx tsc --noEmit');
  const mergedOutput = `${response.stdout}\n${response.stderr}`;
  const diagnostics = mergedOutput
    .split('\n')
    .filter((line) => line.includes('error TS'));

  results.typecheck.errors = diagnostics.length;
  results.typecheck.details = mergedOutput.trim();
  results.typecheck.status = response.success ? 'PASS' : 'FAIL';

  console.log(`Status: ${results.typecheck.status}`);
  console.log(`TypeScript errors: ${results.typecheck.errors}`);
}

printSection('CHECK 3: VULNERABILITY SCAN');
{
  const audit = spawnSync('npm', ['audit', '--omit=dev', '--json'], { encoding: 'utf-8' });
  const jsonPayload = audit.stdout || audit.stderr;

  try {
    const parsed = JSON.parse(jsonPayload || '{}');
    const vulnerabilities =
      parsed.metadata && parsed.metadata.vulnerabilities
        ? parsed.metadata.vulnerabilities
        : { critical: 0, high: 0, moderate: 0, low: 0 };

    results.audit.critical = vulnerabilities.critical || 0;
    results.audit.high = vulnerabilities.high || 0;
    results.audit.moderate = vulnerabilities.moderate || 0;
    results.audit.low = vulnerabilities.low || 0;

    const prodVulnCount =
      results.audit.critical + results.audit.high + results.audit.moderate + results.audit.low;
    results.audit.status = prodVulnCount > 0 ? 'FAIL' : 'PASS';
    results.audit.details = jsonPayload;

    const fullAudit = spawnSync('npm', ['audit', '--json'], { encoding: 'utf-8' });
    try {
      const fullParsed = JSON.parse(fullAudit.stdout || fullAudit.stderr || '{}');
      const fullVulnerabilities =
        fullParsed.metadata && fullParsed.metadata.vulnerabilities
          ? fullParsed.metadata.vulnerabilities
          : { critical: 0, high: 0, moderate: 0, low: 0 };
      const allVulnCount =
        (fullVulnerabilities.critical || 0) +
        (fullVulnerabilities.high || 0) +
        (fullVulnerabilities.moderate || 0) +
        (fullVulnerabilities.low || 0);

      if (prodVulnCount === 0 && allVulnCount > 0) {
        results.audit.warning = `Dev-only vulnerabilities detected (${allVulnCount}) and ignored for production scoring.`;
      }
    } catch {
      // Ignore parse failures of full audit since production audit is authoritative for scoring.
    }
  } catch {
    results.audit.status = 'FAIL';
    results.audit.details = jsonPayload || audit.error?.message || 'Unable to parse npm audit output.';
  }

  console.log(`Status: ${results.audit.status}`);
  console.log(`Critical: ${results.audit.critical}`);
  console.log(`High: ${results.audit.high}`);
  console.log(`Moderate: ${results.audit.moderate}`);
  console.log(`Low: ${results.audit.low}`);
  if (results.audit.warning) {
    console.log(`Warning: ${results.audit.warning}`);
  }
}

printSection('CHECK 4: UNUSED DEPENDENCIES');
{
  const response = runCommand('npx --yes depcheck --json');
  const output = response.stdout || response.stderr;

  try {
    const parsed = JSON.parse(output || '{}');
    results.depcheck.unusedDependencies = parsed.dependencies || [];
    results.depcheck.unusedDevDependencies = parsed.devDependencies || [];
    results.depcheck.status =
      results.depcheck.unusedDependencies.length || results.depcheck.unusedDevDependencies.length
        ? 'FAIL'
        : 'PASS';
    results.depcheck.details = output;
  } catch {
    results.depcheck.status = 'FAIL';
    results.depcheck.details = output || response.message || 'Unable to parse depcheck output.';
  }

  console.log(`Status: ${results.depcheck.status}`);
  console.log(
    `Unused dependencies: ${
      results.depcheck.unusedDependencies.length
        ? results.depcheck.unusedDependencies.join(', ')
        : 'None'
    }`
  );
  console.log(
    `Unused devDependencies: ${
      results.depcheck.unusedDevDependencies.length
        ? results.depcheck.unusedDevDependencies.join(', ')
        : 'None'
    }`
  );
}

printSection('CHECK 5: CIRCULAR DEPENDENCIES');
{
  const response = runCommand('npx --yes madge --circular --json .');
  const output = response.stdout || response.stderr;

  try {
    const parsed = JSON.parse(output || '{}');
    const circularChains = Object.entries(parsed)
      .filter(([, deps]) => Array.isArray(deps) && deps.length > 0)
      .map(([file, deps]) => [file, ...deps]);

    results.madge.circularChains = circularChains;
    results.madge.circularCount = circularChains.length;
    results.madge.status = circularChains.length ? 'FAIL' : 'PASS';
    results.madge.details = output;
  } catch {
    const chainLines = output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && line.includes('>'));
    results.madge.circularChains = chainLines;
    results.madge.circularCount = chainLines.length;
    results.madge.status = chainLines.length ? 'FAIL' : response.success ? 'PASS' : 'FAIL';
    results.madge.details = output || response.message || 'Unable to parse madge output.';
  }

  console.log(`Status: ${results.madge.status}`);
  if (results.madge.circularCount > 0) {
    console.log('Circular dependency chains found:');
    results.madge.circularChains.forEach((chain, index) => {
      if (Array.isArray(chain)) {
        console.log(`  ${index + 1}. ${chain.join(' -> ')}`);
      } else {
        console.log(`  ${index + 1}. ${chain}`);
      }
    });
  } else {
    console.log('No circular dependencies detected.');
  }
}

printSection('CHECK 6: BUILD VERIFICATION');
if (!hasBuildScript) {
  console.log('Skipped: no "build" script found in package.json.');
} else {
  const response = runCommand('npm run build');
  results.build.status = response.success ? 'PASS' : 'FAIL';
  results.build.details = `${response.stdout}\n${response.stderr}`.trim();

  console.log(`Status: ${results.build.status}`);
}

printSection('CHECK 7: BUNDLE SIZE (VITE)');
if (!hasViteConfig) {
  console.log('Skipped: Vite config not found.');
} else {
  const response = runCommand('npx vite build --mode production');
  const distPath = path.join(rootDir, 'dist');
  const files = collectDistSizes(distPath).sort((a, b) => b.sizeBytes - a.sizeBytes);

  results.bundle.status = response.success ? 'PASS' : 'FAIL';
  results.bundle.sizeSummary = files;
  results.bundle.details = `${response.stdout}\n${response.stderr}`.trim();

  console.log(`Status: ${results.bundle.status}`);
  if (files.length === 0) {
    console.log('No dist files found for size analysis.');
  } else {
    console.log('Top bundle files by size:');
    files.slice(0, 10).forEach((file) => {
      console.log(`  - ${file.file}: ${file.sizeKB} KB`);
    });
  }
}

printSection('FINAL SUMMARY');
const securityScore = computeSecurityScore();
const codeQualityScore = computeCodeQualityScore();
const dependencyHealth = computeDependencyHealth();
const buildStatus = results.build.status;
const riskLevel = formatRiskLevel();

console.log(`Security Score: ${securityScore}/100`);
console.log(`Code Quality Score: ${codeQualityScore}/100`);
console.log(`Dependency Health: ${dependencyHealth}/100`);
console.log(`Build Status: ${buildStatus}`);
console.log(`Overall Risk Level: ${riskLevel}`);

console.log('\nAudit completed.');
