// Public API: site status (open/closed banner) and new delivery requests.
const express = require('express');
const { db, getSettings } = require('../db');
const { validate, newCode } = require('../lib/requests');
const mailer = require('../lib/mailer');

const router = express.Router();

router.get('/status', (req, res) => {
  const s = getSettings();
  res.set('Cache-Control', 'no-store');
  res.json({ orders_open: s.orders_open === '1', closed_message: s.closed_message, announcement: s.announcement });
});

// Light spam guard: 6 requests per phone/IP per hour, plus a hidden honeypot field.
const hits = new Map();
function tooMany(key) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < 60 * 60 * 1000);
  list.push(now); hits.set(key, list);
  return list.length > 6;
}

router.post('/requests', (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true, code: 'F-THANKS' }); // bots fill the hidden field
  if (getSettings().orders_open !== '1') return res.status(409).json({ error: 'We\'re not taking online requests right now. Call or text (207) 281-5302.' });
  if (tooMany('ip:' + req.ip)) return res.status(429).json({ error: 'Too many requests. Please call or text (207) 281-5302.' });
  const v = validate(b);
  if (!v.ok) return res.status(400).json({ error: v.error });
  const d = v.data;
  let code;
  for (let i = 0; i < 5; i++) {
    code = newCode();
    try {
      db.prepare(`INSERT INTO requests (code, name, phone, email, contact_pref, town, address, card_number, card_state, card_exp, items, timing, sched_date, sched_window, notes)
        VALUES (@code, @name, @phone, @email, @contact_pref, @town, @address, @card_number, @card_state, @card_exp, @items, @timing, @sched_date, @sched_window, @notes)`).run({ ...d, code });
      break;
    } catch (e) { if (!String(e.message).includes('UNIQUE') || i === 4) throw e; }
  }
  mailer.sendRequestAlert({ ...d, code }); // fire and forget: never block the patient
  res.json({ ok: true, code });
});

module.exports = router;
