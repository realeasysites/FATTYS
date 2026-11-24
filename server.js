// Fatty's Delivery website. Built by Real Easy Sites (getrealeasysites.com).
const path = require('path');
const express = require('express');
require('./db'); // creates the database on first run and starts the card-number cleanup

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Send anyone on the onrender.com address to the real domain (set CANONICAL_HOST on Render once the domain is pointed).
app.use((req, res, next) => {
  const canon = process.env.CANONICAL_HOST;
  if (canon && req.hostname && req.hostname !== canon && req.hostname.endsWith('.onrender.com') && req.method === 'GET' && req.path !== '/healthz') {
    return res.redirect(301, `https://${canon}${req.originalUrl}`);
  }
  next();
});

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Admin first, so /admin always asks for the password before anything else.
app.use(require('./routes/admin'));
app.use('/api', express.json({ limit: '30kb' }), require('./routes/public'));
app.use(require('./routes/pages'));

app.get('/healthz', (req, res) => res.send('ok'));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'], maxAge: '1h' }));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// Safety net: a failed request should never take the whole site down.
app.use((err, req, res, next) => {
  console.error('request failed', req.method, req.originalUrl, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong. Please call or text (207) 281-5302.' });
});
process.on('unhandledRejection', (e) => console.error('unhandled error', e));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Fatty's Delivery site on port ${PORT}`);
  if (!process.env.ADMIN_PASSWORD) console.log('ADMIN_PASSWORD not set: dashboard login is disabled');
  if (!process.env.WM_STORE_SNIPPET) console.log('WM_STORE_SNIPPET not set: /menu shows the "open on Weedmaps" fallback');
});
