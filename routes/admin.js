// Owner dashboard: password-only login, delivery requests, open/closed switch.
const path = require('path');
const express = require('express');
const mailer = require('../lib/mailer');
const { db, getSettings, setSetting } = require('../db');
const { clean } = require('../lib/requests');
const { passwordOk, setSession, clearSession, requireAdmin, isAuthed } = require('../lib/auth');

const router = express.Router();
const VIEWS = path.join(__dirname, '..', 'views');
const noStore = (req, res, next) => { res.set('Cache-Control', 'no-store'); res.set('X-Robots-Tag', 'noindex'); next(); };

// ---- login (password only) ----
const attempts = new Map();
router.get('/admin/login', noStore, (req, res) => {
  if (isAuthed(req)) return res.redirect('/admin');
  res.sendFile(path.join(VIEWS, 'login.html'));
});
router.post('/admin/login', noStore, express.urlencoded({ extended: false }), (req, res) => {
  const now = Date.now();
  const list = (attempts.get(req.ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  if (list.length >= 10) return res.redirect('/admin/login?e=wait');
  if (!process.env.ADMIN_PASSWORD) return res.redirect('/admin/login?e=off');
  if (!passwordOk(req.body && req.body.password)) {
    list.push(now); attempts.set(req.ip, list);
    return res.redirect('/admin/login?e=bad');
  }
  attempts.delete(req.ip);
  setSession(res, req);
  res.redirect('/admin');
});
router.post('/admin/logout', (req, res) => { clearSession(res); res.redirect('/admin/login'); });

// ---- everything below needs the password ----
router.get(['/admin', '/admin/'], noStore, requireAdmin, (req, res) => res.sendFile(path.join(VIEWS, 'admin.html')));
router.use('/api/admin', noStore, requireAdmin, express.json({ limit: '20kb' }));

router.get('/api/admin/requests', (req, res) => {
  const status = String(req.query.status || 'active');
  let sql = 'SELECT * FROM requests';
  const args = [];
  if (status === 'active') sql += " WHERE status IN ('new','confirmed','out')";
  else if (status !== 'all') { sql += ' WHERE status = ?'; args.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT 500';
  const counts = {};
  for (const r of db.prepare('SELECT status, COUNT(*) n FROM requests GROUP BY status').all()) counts[r.status] = r.n;
  res.json({ requests: db.prepare(sql).all(...args), counts });
});

const STATUSES = ['new', 'confirmed', 'out', 'done', 'cancelled'];
router.patch('/api/admin/requests/:id', (req, res) => {
  const status = req.body && req.body.status;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Bad status' });
  db.prepare("UPDATE requests SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, Number(req.params.id));
  res.json({ ok: true });
});
router.delete('/api/admin/requests/:id', (req, res) => {
  db.prepare('DELETE FROM requests WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

router.get('/api/admin/settings', (req, res) => res.json({ settings: getSettings(), email: mailer.emailStatus(), menu_embed: !!process.env.WM_STORE_SNIPPET }));
router.put('/api/admin/settings', (req, res) => {
  const b = req.body || {};
  if (b.orders_open !== undefined) setSetting('orders_open', b.orders_open ? '1' : '0');
  if (b.closed_message !== undefined) setSetting('closed_message', clean(b.closed_message, 200));
  if (b.announcement !== undefined) setSetting('announcement', clean(b.announcement, 160));
  res.json({ ok: true, settings: getSettings() });
});
router.post('/api/admin/email/test', async (req, res) => {
  try { await mailer.sendTestEmail(); res.json({ ok: true, to: process.env.NOTIFY_EMAIL }); }
  catch (e) { res.status(400).json({ error: 'Email failed: ' + e.message }); }
});

module.exports = router;
