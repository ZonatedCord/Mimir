const { execSync } = require('child_process');

const tests = [
  'tests/risk.test.js',
  'tests/tokenizer.test.js',
  'tests/estimate.test.js',
  'tests/split.test.js',
];

for (const test of tests) {
  execSync(`node ${test}`, { stdio: 'inherit' });
}
console.log('\n✅ All tests passed');
