const fs   = require('fs');
const path = require('path');

const DEFAULTS = {
  defaultModel:  null,
  thresholds:    { LOW: 20_000, MEDIUM: 60_000, HIGH: 120_000 },
  contextWindow: 200_000,
};

function loadConfig(cwd) {
  const dir = cwd || process.cwd();
  try {
    const raw  = fs.readFileSync(path.join(dir, '.mimir.json'), 'utf8');
    const user = JSON.parse(raw);
    return {
      defaultModel:  user.defaultModel  ?? DEFAULTS.defaultModel,
      thresholds:    { ...DEFAULTS.thresholds,  ...(user.thresholds  || {}) },
      contextWindow: user.contextWindow ?? DEFAULTS.contextWindow,
    };
  } catch {
    return { ...DEFAULTS, thresholds: { ...DEFAULTS.thresholds } };
  }
}

module.exports = { loadConfig, DEFAULTS };
