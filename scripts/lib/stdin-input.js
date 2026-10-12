const fs = require('fs');

function tokenizeStdin(text) {
  return text.split(/\s+/).filter(Boolean);
}

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

function resolveArgv(argv, read = readStdin) {
  if (!argv.includes('--stdin')) return argv;
  return [...argv.filter((a) => a !== '--stdin'), ...tokenizeStdin(read())];
}

module.exports = { resolveArgv, tokenizeStdin };
