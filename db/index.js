// SQLite setup for delivery requests and a few owner settings.
// Medical card numbers are sensitive: they are wiped automatically 30 days after
// a request is marked Done or Cancelled, and requests are deleted after 180 days.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'fattys.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  contact_pref TEXT NOT NULL DEFAULT 'text',   -- text | call
  town TEXT NOT NULL,
  address TEXT,                                -- empty when meeting at the Park & Ride
  card_number TEXT,                            -- wiped 30 days after done/cancelled
  card_state TEXT,
  card_exp TEXT,                               -- YYYY-MM
  items TEXT NOT NULL,
  timing TEXT NOT NULL,                        -- asap | scheduled
  sched_date TEXT,
  sched_window TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new'           -- new | confirmed | out | done | cancelled
);
CREATE INDEX IF NOT EXISTS idx_requests_created ON requests(created_at);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
`);

const DEFAULTS = { orders_open: '1', closed_message: '', announcement: '' };
function getSettings() {
  const out = { ...DEFAULTS };
  for (const r of db.prepare('SELECT key, value FROM settings').all()) out[r.key] = r.value;
  return out;
}
function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
}

function cleanup() {
  const wiped = db.prepare(`UPDATE requests SET card_number = NULL, card_exp = NULL
    WHERE card_number IS NOT NULL AND status IN ('done','cancelled') AND updated_at < datetime('now','-30 days')`).run().changes;
  const gone = db.prepare(`DELETE FROM requests WHERE created_at < datetime('now','-180 days')`).run().changes;
  if (wiped || gone) console.log(`cleanup: wiped ${wiped} card numbers, deleted ${gone} old requests`);
}
cleanup();
setInterval(cleanup, 60 * 60 * 1000).unref();

module.exports = { db, getSettings, setSetting };
