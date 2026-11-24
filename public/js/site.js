// 18+ gate, mobile nav, and the owner's announcement banner.
(function () {
  var KEY = 'fattys_18_ok';
  var DAYS = 30;

  function store(get, val) {
    try {
      if (get) return localStorage.getItem(KEY);
      localStorage.setItem(KEY, val);
    } catch (e) {
      if (get) return (document.cookie.match(/(?:^|; )fattys_18_ok=([^;]*)/) || [])[1] || null;
      document.cookie = KEY + '=' + val + '; path=/; max-age=' + DAYS * 86400 + '; SameSite=Lax';
    }
  }
  function verified() {
    var v = Number(store(true));
    return v && Date.now() - v < DAYS * 86400000;
  }

  function showGate() {
    var g = document.createElement('div');
    g.className = 'agegate';
    g.setAttribute('role', 'dialog');
    g.setAttribute('aria-modal', 'true');
    g.setAttribute('aria-labelledby', 'gate-title');
    g.innerHTML =
      '<div class="rays" aria-hidden="true"></div>' +
      '<div class="agegate-box">' +
      '<img src="/img/logo-400.webp" alt="Fatty\'s Delivery" width="300" height="300">' +
      '<h1 id="gate-title">Are you 18 or older?</h1>' +
      '<p>Fatty\'s serves qualified medical cannabis patients only. You must be 18+ to enter this site.</p>' +
      '<div class="agegate-actions">' +
      '<button type="button" class="btn btn-sun" data-yes>Yes, I\'m 18 or older</button>' +
      '<button type="button" class="btn btn-ghost" data-no>No, I\'m under 18</button>' +
      '</div><small>You\'ll still need a valid medical card and photo ID at delivery.</small></div>';
    document.body.appendChild(g);
    document.body.style.overflow = 'hidden';
    g.querySelector('[data-yes]').focus();
    g.querySelector('[data-yes]').addEventListener('click', function () {
      store(false, String(Date.now()));
      document.documentElement.classList.remove('gated');
      document.body.style.overflow = '';
      g.remove();
    });
    g.querySelector('[data-no]').addEventListener('click', function () {
      window.location.href = 'https://www.google.com';
    });
  }

  function init() {
    if (!verified()) showGate();
    else document.documentElement.classList.remove('gated');

    var toggle = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') nav.classList.remove('open'); });
    }

    var bar = document.querySelector('.announce');
    if (bar) {
      fetch('/api/status').then(function (r) { return r.json(); }).then(function (s) {
        var msg = s.announcement || (!s.orders_open ? (s.closed_message || 'Online requests are paused right now. Call or text (207) 281-5302.') : '');
        if (msg) { bar.textContent = msg; bar.hidden = false; }
        document.dispatchEvent(new CustomEvent('fattys:status', { detail: s }));
      }).catch(function () {});
    }
    var y = document.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
