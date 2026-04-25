const fs   = require('fs');
const path = require('path');

const DEFAULTS = {
  defaultModel:   null,
  thresholds:     { LOW: 20_000, MEDIUM: 60_000, HIGH: 120_000 },
  contextWindow:  200_000,
  systemOverhead: 2_000,
};

const KNOWN_KEYS       = new Set(['defaultModel', 'thresholds', 'contextWindow', 'systemOverhead']);
const KNOWN_THRESHOLDS = new Set(['LOW', 'MEDIUM', 'HIGH']);

function validateConfig(user) {
  const warnings = [];

  for (const key of Object.keys(user)) {
    if (!KNOWN_KEYS.has(key)) warnings.push(`unknown key "${key}"`);
  }

  if (user.thresholds && typeof user.thresholds === 'object') {
    for (const [k, v] of Object.entries(user.thresholds)) {
      if (!KNOWN_THRESHOLDS.has(k)) warnings.push(`unknown threshold "${k}"`);
      else if (typeof v !== 'number') warnings.push(`threshold "${k}" must be a number`);
    }
  }

  if (user.contextWindow !== undefined && typeof user.contextWindow !== 'number') {
    warnings.push('"contextWindow" must be a number');
  }

  if (user.systemOverhead !== undefined && typeof user.systemOverhead !== 'number') {
    warnings.push('"systemOverhead" must be a number');
  }

  return warnings;
}

function loadConfig(cwd) {
  const dir = cwd || process.cwd();
  try {
    const raw  = fs.readFileSync(path.join(dir, '.mimir.json'), 'utf8');
    const user = JSON.parse(raw);

    const warnings = validateConfig(user);
    if (warnings.length > 0) {
      process.stderr.write(`Mimir: .mimir.json warnings: ${warnings.join(', ')}\n`);
    }

    return {
      defaultModel:   user.defaultModel   ?? DEFAULTS.defaultModel,
      thresholds:     { ...DEFAULTS.thresholds, ...(user.thresholds || {}) },
      contextWindow:  user.contextWindow  ?? DEFAULTS.contextWindow,
      systemOverhead: user.systemOverhead ?? DEFAULTS.systemOverhead,
    };
  } catch {
    return { ...DEFAULTS, thresholds: { ...DEFAULTS.thresholds }, systemOverhead: DEFAULTS.systemOverhead };
  }
}

module.exports = { loadConfig, DEFAULTS, validateConfig };
