// Delivery ticket: open/closed state, town notes, scheduling, remember-me, submit.
(function () {
  var form = document.getElementById('orderForm');
  if (!form) return;
  var f = form.elements;
  var msg = document.getElementById('formMsg');
  var btn = document.getElementById('submitBtn');
  var REMEMBER = 'fattys_patient';
  var MEET = 'Biddeford Park & Ride meetup';

  var now = new Date();
  var pad = function (n) { return String(n).padStart(2, '0'); };
  document.getElementById('tkDate').textContent = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  // Card expiration: this month through 3 years out.
  var exp = document.getElementById('cardExp');
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  for (var i = 0; i < 37; i++) {
    var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    var o = document.createElement('option');
    o.value = d.getFullYear() + '-' + pad(d.getMonth() + 1);
    o.textContent = months[d.getMonth()] + ' ' + d.getFullYear();
    exp.appendChild(o);
  }
  f.sched_date.min = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());

  function radio(name) { var r = form.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : ''; }
  function setTown(v) {
    Array.prototype.forEach.call(form.querySelectorAll('input[name=town]'), function (r) { r.checked = r.value === v; });
    syncTown();
  }
  function syncTown() {
    var t = radio('town');
    document.getElementById('noteOther').hidden = t !== 'Other nearby town';
    document.getElementById('noteMeet').hidden = t !== MEET;
    document.getElementById('addrWrap').hidden = t === MEET;
  }
  function syncTiming() { document.getElementById('sched').hidden = radio('timing') !== 'scheduled'; }
  form.addEventListener('change', function (e) {
    if (e.target.name === 'town') syncTown();
    if (e.target.name === 'timing') syncTiming();
  });

  // "Where we roll" town links preselect the town.
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-town]');
    if (a) setTown(a.getAttribute('data-town'));
  });

  // Saved details from a past request on this device.
  try {
    var saved = JSON.parse(localStorage.getItem(REMEMBER) || 'null');
    if (saved) {
      ['name', 'phone', 'email', 'address'].forEach(function (k) { if (saved[k]) f[k].value = saved[k]; });
      if (saved.town) setTown(saved.town);
      f.remember.checked = true;
    }
  } catch (e) {}
  syncTown(); syncTiming();

  document.addEventListener('fattys:status', function (e) {
    if (e.detail && !e.detail.orders_open) {
      document.getElementById('formBody').hidden = true;
      document.getElementById('closedBox').hidden = false;
      if (e.detail.closed_message) document.getElementById('closedMsg').textContent = e.detail.closed_message;
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    msg.textContent = '';
    var body = {
      name: f.name.value, phone: f.phone.value, email: f.email.value,
      contact_pref: radio('contact_pref'), town: radio('town'), address: f.address.value,
      card_number: f.card_number.value, card_state: f.card_state.value, card_exp: f.card_exp.value,
      items: f.items.value, timing: radio('timing'), sched_date: f.sched_date.value, sched_window: f.sched_window.value,
      notes: f.notes.value, attest: f.attest.checked, website: f.website.value
    };
    btn.disabled = true; btn.textContent = 'Sending...';
    fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error || 'Something went wrong.');
        try {
          if (f.remember.checked) localStorage.setItem(REMEMBER, JSON.stringify({ name: body.name, phone: body.phone, email: body.email, town: body.town, address: body.address }));
          else localStorage.removeItem(REMEMBER);
        } catch (x) {}
        document.getElementById('formBody').hidden = true;
        document.getElementById('doneCode').textContent = res.j.code;
        document.getElementById('doneHow').textContent = body.contact_pref === 'call' ? 'call' : 'text';
        var done = document.getElementById('doneBox');
        done.hidden = false;
        document.getElementById('order').scrollIntoView({ behavior: 'smooth', block: 'start' });
        done.focus({ preventScroll: true });
      })
      .catch(function (x) {
        msg.textContent = x.message === 'Failed to fetch' ? 'Couldn\'t send. Check your connection or text (207) 281-5302.' : x.message;
      })
      .then(function () { btn.disabled = false; btn.textContent = 'Send my request'; });
  });
})();
