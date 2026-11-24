// Checks and tidies a delivery request from the website form.
const crypto = require('crypto');

const TOWNS = ['Biddeford', 'Saco', 'Old Orchard Beach', 'Other nearby town', 'Biddeford Park & Ride meetup'];
const WINDOWS = ['Morning (9–12)', 'Afternoon (12–4)', 'Evening (4–7)'];

function clean(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}
function newCode() {
  // Short, easy to read out loud: F-7K3Q
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (const b of crypto.randomBytes(4)) s += abc[b % abc.length];
  return 'F-' + s;
}

// Returns { ok, data } or { ok: false, error }.
function validate(b) {
  const d = {
    name: clean(b.name, 80),
    phone: clean(b.phone, 30),
    email: clean(b.email, 120),
    contact_pref: b.contact_pref === 'call' ? 'call' : 'text',
    town: clean(b.town, 60),
    address: clean(b.address, 200),
    card_number: clean(b.card_number, 40),
    card_state: clean(b.card_state, 30) || 'Maine',
    card_exp: clean(b.card_exp, 7),
    items: clean(b.items, 1500),
    timing: b.timing === 'scheduled' ? 'scheduled' : 'asap',
    sched_date: clean(b.sched_date, 10),
    sched_window: clean(b.sched_window, 40),
    notes: clean(b.notes, 600)
  };
  const digits = d.phone.replace(/\D/g, '');
  if (!d.name) return { ok: false, error: 'Please add your name.' };
  if (digits.length < 10 || digits.length > 11) return { ok: false, error: 'Please add a phone number we can text.' };
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return { ok: false, error: 'That email doesn\'t look right (or leave it blank).' };
  if (!TOWNS.includes(d.town)) return { ok: false, error: 'Please pick your town.' };
  const meetup = d.town === 'Biddeford Park & Ride meetup';
  if (!meetup && d.address.length < 5) return { ok: false, error: 'Please add your delivery address.' };
  if (meetup) d.address = '';
  if (d.card_number.length < 4) return { ok: false, error: 'Please add your medical card / certification number.' };
  if (!/^\d{4}-\d{2}$/.test(d.card_exp)) return { ok: false, error: 'Please add your card\'s expiration month.' };
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (d.card_exp < thisMonth) return { ok: false, error: 'That medical card looks expired. Text us if that\'s wrong.' };
  if (d.items.length < 3) return { ok: false, error: 'Tell us what you\'d like from the menu.' };
  if (d.timing === 'scheduled') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.sched_date)) return { ok: false, error: 'Pick a day for your delivery.' };
    if (!WINDOWS.includes(d.sched_window)) return { ok: false, error: 'Pick a time window.' };
  } else { d.sched_date = ''; d.sched_window = ''; }
  if (!b.attest) return { ok: false, error: 'Please confirm you\'re an 18+ qualified medical patient.' };
  return { ok: true, data: d };
}

module.exports = { validate, newCode, clean, TOWNS, WINDOWS };
