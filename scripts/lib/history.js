const fs   = require('fs');
const os   = require('os');
const path = require('path');

const HISTORY_FILE = path.join(os.homedir(), '.mimir-history.json');
const MAX_ENTRIES  = 100;

function appendHistory(entry) {
  let history = [];
  try {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    if (!Array.isArray(history)) history = [];
  } catch {}

  history.push({ ...entry, timestamp: new Date().toISOString() });
  if (history.length > MAX_ENTRIES) history = history.slice(-MAX_ENTRIES);

  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch {} // ignore write errors (read-only fs, etc.)
}

function loadHistory() {
  try {
    const raw = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

module.exports = { appendHistory, loadHistory, HISTORY_FILE };
