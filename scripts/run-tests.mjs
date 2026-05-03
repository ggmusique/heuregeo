#!/usr/bin/env node
/**
 * Cross-platform test runner — works on Windows PowerShell, CMD, and Linux/macOS.
 * Usage: node scripts/run-tests.mjs [pattern]
 * Patterns: unit | integration | e2e | all (default: all)
 */
import { spawnSync } from 'child_process';
import { globSync } from 'tinyglobby';
import { resolve } from 'path';

const arg = process.argv[2] ?? 'all';

const patterns = {
  unit: 'src/tests/unit/**/*.test.mjs',
  integration: 'src/tests/integration/**/*.test.mjs',
  e2e: 'src/tests/e2e/**/*.test.mjs',
  all: 'src/tests/**/*.test.mjs',
};

const pattern = patterns[arg];
if (!pattern) {
  console.error(`Unknown pattern: ${arg}. Use: unit | integration | e2e | all`);
  process.exit(1);
}

const files = globSync(pattern);
if (files.length === 0) {
  console.warn(`No test files found for pattern: ${pattern}`);
  process.exit(0);
}

console.log(`Running ${files.length} test file(s) [${arg}]...\n`);

const result = spawnSync(
  process.execPath,
  ['--import', 'tsx/esm', '--test', ...files],
  { stdio: 'inherit', shell: false }
);

process.exit(result.status ?? 1);
