// New-request alerts. On purpose, the email does NOT include the medical card
// number, address or order details: it only says someone sent a request and
// links to the password-protected dashboard. If SMTP isn't set up, requests are
// still saved and the Render log says so.
const nodemailer = require('nodemailer');

let transport = null;
function getTransport() {
  if (transport) return transport;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT || 465);
  transport = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  return transport;
}
const siteUrl = () => (process.env.SITE_URL || '').replace(/\/$/, '');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shortName = (n) => { const p = String(n).trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0]; };

async function sendRequestAlert(r) {
  const t = getTransport(), to = process.env.NOTIFY_EMAIL;
  if (!t || !to) { console.log(`request ${r.code} saved but NOT emailed: SMTP or NOTIFY_EMAIL not set`); return; }
  const from = process.env.MAIL_FROM || `"Fatty's Website" <${process.env.SMTP_USER}>`;
  const when = r.timing === 'asap' ? 'ASAP' : `${r.sched_date} ${r.sched_window}`;
  const dash = siteUrl() ? `${siteUrl()}/admin` : '';
  try {
    await t.sendMail({
      from, to,
      subject: `New delivery request ${r.code}: ${shortName(r.name)} (${r.town})`,
      text: `New delivery request ${r.code} from ${shortName(r.name)}, ${r.town}, ${when}.\n\nOpen the dashboard for the details${dash ? ': ' + dash : '.'}`,
      html: `<div style="font-family:Arial,sans-serif;color:#111;max-width:520px">
  <h2 style="margin:0 0 6px">New delivery request</h2>
  <p style="margin:0 0 14px;color:#555">${esc(r.code)} · ${esc(shortName(r.name))} · ${esc(r.town)} · ${esc(when)}</p>
  <p>Details (address, med card, order) are in your dashboard only.</p>
  ${dash ? `<p><a href="${esc(dash)}" style="background:#d9311f;color:#fff;padding:10px 18px;border-radius:99px;text-decoration:none;font-weight:bold">Open dashboard</a></p>` : ''}
</div>`
    });
    console.log(`request ${r.code} alert emailed`);
  } catch (e) { console.error(`request ${r.code} saved but NOT emailed: ${e.message}`); }
}

function emailStatus() {
  const keys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'NOTIFY_EMAIL'];
  return { ready: keys.every((k) => process.env[k]), to: process.env.NOTIFY_EMAIL || null, missing: keys.filter((k) => !process.env[k]) };
}
async function sendTestEmail() {
  const t = getTransport(), to = process.env.NOTIFY_EMAIL;
  if (!t || !to) throw new Error('Email is not set up yet.');
  const from = process.env.MAIL_FROM || `"Fatty's Website" <${process.env.SMTP_USER}>`;
  await t.sendMail({ from, to, subject: 'Test: your delivery request alerts are working',
    text: `This is a test from your Fatty's website. New delivery requests will show up in this inbox like this.${siteUrl() ? `\n\nDashboard: ${siteUrl()}/admin` : ''}` });
}

module.exports = { sendRequestAlert, emailStatus, sendTestEmail };
