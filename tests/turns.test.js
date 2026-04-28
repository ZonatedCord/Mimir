const assert = require('assert');
const { estimateTaskTurns, projectAtTurn } = require('../scripts/lib/turns');

// category detection
assert.strictEqual(estimateTaskTurns('refactor auth module').category, 'large');
assert.strictEqual(estimateTaskTurns('fix the bug in login').category,  'fix');
assert.strictEqual(estimateTaskTurns('implement dark mode').category,   'feature');
assert.strictEqual(estimateTaskTurns('explain this function').category, 'quick');
assert.strictEqual(estimateTaskTurns('update config').category,         'default');
assert.strictEqual(estimateTaskTurns('').category,                      'default');
assert.strictEqual(estimateTaskTurns(null).category,                    'default');

// turn counts
assert.strictEqual(estimateTaskTurns('refactor entire codebase').turns, 10);
assert.strictEqual(estimateTaskTurns('build new feature').turns,         7);
assert.strictEqual(estimateTaskTurns('debug crash').turns,               4);
assert.strictEqual(estimateTaskTurns('what does this do').turns,         2);
assert.strictEqual(estimateTaskTurns('update readme').turns,             5);

// projectAtTurn
assert.strictEqual(projectAtTurn(1000, 500, 1),  1000);   // turn 1 = no growth
assert.strictEqual(projectAtTurn(1000, 500, 2),  1500);
assert.strictEqual(projectAtTurn(1000, 500, 5),  3000);
assert.strictEqual(projectAtTurn(1000, 500, 0),  1000);   // n=0 clamps to 0 growth

console.log('✅ turns.test.js passed');
