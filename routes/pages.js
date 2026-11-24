// Page routes: the menu page (with the Weedmaps WM Store embed) and redirects
// from the old GoDaddy page addresses so existing links keep working.
const path = require('path');
const fs = require('fs');
const express = require('express');

const router = express.Router();
const MENU = path.join(__dirname, '..', 'public', 'menu.html');

// Old site paths -> new ones.
router.get(['/order', '/order/', '/order-1', '/order-1/'], (req, res) => res.redirect(301, '/#order'));
router.get(['/about', '/about/'], (req, res) => res.redirect(301, '/#deal'));

// WM Store: paste the snippet from Weedmaps (Manage my business > WM Store > Install,
// website type "HTML") into the WM_STORE_SNIPPET environment variable on Render.
// Without it, the menu page shows a big "open today's menu on Weedmaps" panel instead.
let cache = null;
router.get(['/menu', '/menu.html'], (req, res) => {
  if (!cache || process.env.NODE_ENV !== 'production') cache = fs.readFileSync(MENU, 'utf8');
  const snippet = (process.env.WM_STORE_SNIPPET || '').trim();
  const html = snippet
    ? cache.replace('<!--WM_STORE-->', `<div class="wm-embed">${snippet}</div>`).replace('data-embed="off"', 'data-embed="on"')
    : cache;
  res.set('Cache-Control', 'no-cache');
  res.type('html').send(html);
});

module.exports = router;
