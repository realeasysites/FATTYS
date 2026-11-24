// Delivery request form: open/closed state, town notes, scheduling, remember-me, submit.
(function () {
  var form = document.getElementById('order-form');
  if (!form) return;
  var err = document.getElementById('form-error');
  var btn = document.getElementById('submit');
  var REMEMBER = 'fattys_patient';
  var KEEP = ['name', 'phone', 'email', 'town', 'address'];

  // Card expiration: this month through 3 years out.
  var exp = document.getElementById('card-exp');
  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var now = new Date();
  for (var i = 0; i < 37; i++) {
    var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    var o = document.createElement('option');
    o.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    o.textContent = months[d.getMonth()] + ' ' + d.getFullYear();
    exp.appendChild(o);
  }

  // Earliest schedulable day = today.
  var dateIn = form.elements.sched_date;
  var pad = function (n) { return String(n).padStart(2, '0'); };
  dateIn.min = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());

  function syncTown() {
    var t = form.elements.town.value;
    var meet = t === 'Biddeford Park & Ride meetup';
    document.getElementById('note-other').hidden = t !== 'Other nearby town';
    document.getElementById('note-meet').hidden = !meet;
    document.getElementById('addr-wrap').hidden = meet;
  }
  function syncTiming() {
    document.getElementById('sched').hidden = form.elements.timing.value !== 'scheduled';
  }
  form.elements.town.addEventListener('change', syncTown);
  Array.prototype.forEach.call(form.elements.timing, function (r) { r.addEventListener('change', syncTiming); });

  // Fill in saved details from a past order on this device.
  try {
    var saved = JSON.parse(localStorage.getItem(REMEMBER) || 'null');
    if (saved) {
      KEEP.forEach(function (k) { if (saved[k]) form.elements[k].value = saved[k]; });
      form.elements.remember.checked = true;
    }
  } catch (e) {}
  syncTown(); syncTiming();

  // Paused by the owner?
  document.addEventListener('fattys:status', function (e) {
    if (e.detail && !e.detail.orders_open) {
      form.hidden = true;
      document.getElementById('closed').hidden = false;
      if (e.detail.closed_message) document.getElementById('closed-msg').textContent = e.detail.closed_message;
    }
  });

  function showError(msg) {
    err.textContent = msg; err.hidden = false;
    err.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.hidden = true;
    var f = form.elements;
    var body = {
      name: f.name.value, phone: f.phone.value, email: f.email.value,
      contact_pref: f.contact_pref.value, town: f.town.value, address: f.address.value,
      card_number: f.card_number.value, card_state: f.card_state.value, card_exp: f.card_exp.value,
      items: f.items.value, timing: f.timing.value, sched_date: f.sched_date.value, sched_window: f.sched_window.value,
      notes: f.notes.value, attest: f.attest.checked, website: f.website.value
    };
    btn.disabled = true; btn.textContent = 'Sending...';
    fetch('/api/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error || 'Something went wrong.');
        try {
          if (f.remember.checked) {
            var keep = {}; KEEP.forEach(function (k) { keep[k] = f[k].value; });
            localStorage.setItem(REMEMBER, JSON.stringify(keep));
          } else localStorage.removeItem(REMEMBER);
        } catch (x) {}
        form.hidden = true;
        document.getElementById('done-code').textContent = res.j.code;
        document.getElementById('done-how').textContent = body.contact_pref === 'call' ? 'call' : 'text';
        var done = document.getElementById('done');
        done.hidden = false; done.focus();
        document.getElementById('ticket').scrollIntoView({ behavior: 'smooth', block: 'start' });
      })
      .catch(function (x) {
        showError(x.message === 'Failed to fetch' ? 'Couldn\'t send. Check your connection or text (207) 281-5302.' : x.message);
      })
      .then(function () { btn.disabled = false; btn.textContent = 'Send my request'; });
  });
})();
