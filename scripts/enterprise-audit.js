#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function section(title) {
  console.log(`\n--- ${title} ---`);
}

function runCommand(command, options = {}) {
  try {
    const output = execSync(command, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf-8',
      maxBuffer: 20 * 1024 * 1024,
      ...options,
    });
    return { ok: true, output };
  } catch (error) {
    return {
      ok: false,
      output: error.stdout ? String(error.stdout) : '',
      error: error.stderr ? String(error.stderr) : error.message,
    };
  }
}

function fileExists(...parts) {
  return fs.existsSync(path.join(process.cwd(), ...parts));
}

function getRiskLevel(score) {
  if (score >= 85) return 'Low';
  if (score >= 70) return 'Medium';
  if (score >= 50) return 'High';
  return 'Critical';
}

console.log('=== ENTERPRISE REPOSITORY AUDIT ===');

const summary = {
  eslint: { status: 'SKIPPED', warnings: 0, errors: 0 },
  typescript: { status: 'SKIPPED', errors: 0 },
  security: { critical: 0, high: 0, moderate: 0, low: 0 },
  depcheck: { status: 'SKIPPED', unusedDependencies: [], unusedDevDependencies: [] },
  circular: { status: 'SKIPPED', chains: [] },
  build: { status: 'SKIPPED' },
  bundle: { status: 'SKIPPED', sizeInfo: 'N/A' },
};

section('CHECK 1: ESLINT');
const eslintResult = runCommand('npx eslint . --ext .ts,.tsx,.js,.jsx -f json');
if (eslintResult.output) {
  try {
    const report = JSON.parse(eslintResult.output);
    let warnings = 0;
    let errors = 0;
    for (const fileReport of report) {
      warnings += fileReport.warningCount || 0;
      errors += fileReport.errorCount || 0;
    }
    summary.eslint = {
      status: eslintResult.ok ? 'PASS' : 'FAIL',
      warnings,
      errors,
    };
    console.log(`Status: ${summary.eslint.status}`);
    console.log(`Warnings: ${warnings}`);
    console.log(`Errors: ${errors}`);
  } catch {
    summary.eslint = { status: eslintResult.ok ? 'PASS' : 'FAIL', warnings: 0, errors: 0 };
    console.log('Unable to parse ESLint JSON output.');
    if (eslintResult.error) console.log(eslintResult.error.trim());
  }
} else {
  summary.eslint = { status: eslintResult.ok ? 'PASS' : 'FAIL', warnings: 0, errors: 0 };
  console.log('No ESLint output received.');
  if (eslintResult.error) console.log(eslintResult.error.trim());
}

section('CHECK 2: TYPESCRIPT STRICT CHECK');
if (fileExists('tsconfig.json')) {
  const tscResult = runCommand('npx tsc --noEmit');
  const errorLines = (tscResult.output + '\n' + (tscResult.error || ''))
    .split('\n')
    .filter((line) => /error TS\d+/.test(line));
  summary.typescript = {
    status: tscResult.ok ? 'PASS' : 'FAIL',
    errors: errorLines.length,
  };
  console.log(`Status: ${summary.typescript.status}`);
  console.log(`Errors: ${summary.typescript.errors}`);
  if (!tscResult.ok && tscResult.error) {
    console.log(tscResult.error.trim());
  }
} else {
  console.log('tsconfig.json not found. Skipping TypeScript strict check.');
}

section('CHECK 3: VULNERABILITY SCAN');
const auditResult = runCommand('npm audit --json');
const combinedAuditOutput = auditResult.output || auditResult.error;
if (combinedAuditOutput) {
  try {
    const auditReport = JSON.parse(combinedAuditOutput);
    const vulnerabilities = (auditReport.metadata && auditReport.metadata.vulnerabilities) || {};
    summary.security = {
      critical: vulnerabilities.critical || 0,
      high: vulnerabilities.high || 0,
      moderate: vulnerabilities.moderate || 0,
      low: vulnerabilities.low || 0,
    };
  } catch {
    console.log('Unable to parse npm audit JSON output.');
  }
}
console.log(`Critical: ${summary.security.critical}`);
console.log(`High: ${summary.security.high}`);
console.log(`Moderate: ${summary.security.moderate}`);
console.log(`Low: ${summary.security.low}`);

section('CHECK 4: UNUSED DEPENDENCIES');
const depcheckResult = runCommand('npx depcheck --json');
if (depcheckResult.output) {
  try {
    const depcheckReport = JSON.parse(depcheckResult.output);
    summary.depcheck = {
      status: depcheckResult.ok ? 'PASS' : 'FAIL',
      unusedDependencies: depcheckReport.dependencies || [],
      unusedDevDependencies: depcheckReport.devDependencies || [],
    };
  } catch {
    summary.depcheck.status = depcheckResult.ok ? 'PASS' : 'FAIL';
  }
} else {
  summary.depcheck.status = depcheckResult.ok ? 'PASS' : 'FAIL';
}
console.log(`Status: ${summary.depcheck.status}`);
console.log(`Unused dependencies: ${summary.depcheck.unusedDependencies.join(', ') || 'None'}`);
console.log(`Unused devDependencies: ${summary.depcheck.unusedDevDependencies.join(', ') || 'None'}`);
if (!depcheckResult.ok && depcheckResult.error) {
  console.log(depcheckResult.error.trim());
}

section('CHECK 5: CIRCULAR DEPENDENCIES');
const madgeResult = runCommand('npx madge --circular --json .');
if (madgeResult.output) {
  try {
    const madgeReport = JSON.parse(madgeResult.output);
    const chains = Array.isArray(madgeReport) ? madgeReport : [];
    summary.circular = {
      status: madgeResult.ok ? 'PASS' : 'FAIL',
      chains,
    };
  } catch {
    summary.circular.status = madgeResult.ok ? 'PASS' : 'FAIL';
  }
} else {
  summary.circular.status = madgeResult.ok ? 'PASS' : 'FAIL';
}
if (summary.circular.chains.length > 0) {
  console.log('Circular dependencies found:');
  for (const chain of summary.circular.chains) {
    if (Array.isArray(chain)) {
      console.log(`- ${chain.join(' -> ')}`);
    } else {
      console.log(`- ${String(chain)}`);
    }
  }
} else {
  console.log('No circular dependencies detected.');
}

section('CHECK 6: BUILD VERIFICATION');
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
if (packageJson.scripts && packageJson.scripts.build) {
  const buildResult = runCommand('npm run build');
  summary.build.status = buildResult.ok ? 'PASS' : 'FAIL';
  console.log(`Status: ${summary.build.status}`);
  if (!buildResult.ok && buildResult.error) {
    console.log(buildResult.error.trim());
  }
} else {
  console.log('No build script found. Skipping build verification.');
}

section('CHECK 7: BUNDLE SIZE (if Vite detected)');
if (fileExists('vite.config.ts') || fileExists('vite.config.js') || fileExists('vite.config.mjs') || fileExists('vite.config.cjs')) {
  const viteBuildResult = runCommand('npx vite build --mode production');
  summary.bundle.status = viteBuildResult.ok ? 'PASS' : 'FAIL';
  if (viteBuildResult.output) {
    const sizeLines = viteBuildResult.output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /dist\/.*\s+\d+(\.\d+)?\s*(B|kB|MB)/.test(line));
    summary.bundle.sizeInfo = sizeLines.join('\n') || 'Bundle size details unavailable from output.';
  }
  console.log(`Status: ${summary.bundle.status}`);
  console.log(`Bundle size:\n${summary.bundle.sizeInfo}`);
  if (!viteBuildResult.ok && viteBuildResult.error) {
    console.log(viteBuildResult.error.trim());
  }
} else {
  console.log('Vite config not found. Skipping bundle size inspection.');
}

const securityPenalty =
  summary.security.critical * 30 +
  summary.security.high * 15 +
  summary.security.moderate * 5 +
  summary.security.low * 2;
const securityScore = Math.max(0, 100 - securityPenalty);

const qualityPenalty =
  summary.eslint.errors * 5 +
  summary.eslint.warnings * 2 +
  summary.typescript.errors * 5 +
  summary.circular.chains.length * 10;
const codeQualityScore = Math.max(0, 100 - qualityPenalty);

const dependencyPenalty =
  summary.depcheck.unusedDependencies.length * 5 +
  summary.depcheck.unusedDevDependencies.length * 2;
const dependencyHealthScore = Math.max(0, 100 - dependencyPenalty);

const buildStatus =
  summary.build.status === 'FAIL' || summary.bundle.status === 'FAIL' ? 'FAIL' : 'PASS';

const overallScore = Math.round(
  (securityScore + codeQualityScore + dependencyHealthScore + (buildStatus === 'PASS' ? 100 : 30)) / 4,
);
const overallRisk = getRiskLevel(overallScore);

section('FINAL SUMMARY');
console.log(`Security Score: ${securityScore}/100`);
console.log(`Code Quality Score: ${codeQualityScore}/100`);
console.log(`Dependency Health: ${dependencyHealthScore}/100`);
console.log(`Build Status: ${buildStatus}`);
console.log(`Overall Risk Level: ${overallRisk}`);
