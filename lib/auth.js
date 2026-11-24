// Password-only admin login. No username. Signed, HttpOnly session cookie.
// Login stays disabled until ADMIN_PASSWORD is set in the environment.
const crypto = require('crypto');

const COOKIE = 'fattys_admin';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function secret() {
  return process.env.SESSION_SECRET || crypto.createHash('sha256').update('fattys:' + (process.env.ADMIN_PASSWORD || '')).digest('hex');
}
function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
function passwordOk(pw) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  return safeEqual(pw || '', real);
}
function readCookie(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return decodeURIComponent(v.join('='));
  }
  return null;
}
function isAuthed(req) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const c = readCookie(req);
  if (!c) return false;
  const [exp, sig] = c.split('.');
  if (!exp || !sig || Date.now() > Number(exp)) return false;
  return safeEqual(sig, sign(exp));
}
function setSession(res, req) {
  const exp = String(Date.now() + MAX_AGE_MS);
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader('Set-Cookie', `${COOKIE}=${exp}.${sign(exp)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_MS / 1000}${secure ? '; Secure' : ''}`);
}
function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}
function requireAdmin(req, res, next) {
  if (isAuthed(req)) return next();
  if (req.path.startsWith('/api/') || req.originalUrl.startsWith('/api/')) return res.status(401).json({ error: 'Not signed in' });
  return res.redirect('/admin/login');
}

module.exports = { passwordOk, isAuthed, setSession, clearSession, requireAdmin };
