'use strict';
const path = require('path');
const fs = require('fs');
const express = require('express');
const config = require('./config');
const { authenticate } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errors');
const { spec, docsHtml } = require('./openapi');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// Minimal CORS (no extra dependency). Set CORS_ORIGIN to your frontend URL in production.
app.use((req, res, next) => {
  res.set({ 'Access-Control-Allow-Origin': config.corsOrigin, 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'X-Content-Type-Options': 'nosniff' });
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

const api = express.Router();
api.get('/health', (req, res) => res.json({ ok: true }));
api.get('/openapi.json', (req, res) => res.json(spec()));
api.get('/docs', (req, res) => res.type('html').send(docsHtml));
api.use('/auth', require('./routes/auth'));
api.use('/users', authenticate, require('./routes/users'));
api.use('/subscriptions', authenticate, require('./routes/subscriptions'));
api.use('/invoices', authenticate, require('./routes/invoices'));
api.use('/customers', authenticate, require('./routes/customers'));
api.use('/payments', authenticate, require('./routes/payments'));
api.use('/reports', authenticate, require('./routes/reports'));
api.use('/', authenticate, require('./routes/catalog'));   // /taxes /products /plans /discounts /templates
app.use('/api', api);

// Serve the built frontend (frontend/dist) from the same origin when present.
const dist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);
module.exports = app;
