const { execSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');

const tests = [
  'tests/risk.test.js',
  'tests/tokenizer.test.js',
  'tests/estimate.test.js',
  'tests/split.test.js',
];

for (const test of tests) {
  execSync(`node ${path.join(root, test)}`, { stdio: 'inherit' });
}
console.log('\n✅ All tests passed');
