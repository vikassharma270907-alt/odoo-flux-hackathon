'use strict';
const app = require('./app');
const config = require('./config');
const { pool } = require('./db');

const server = app.listen(config.port, () => console.log(`Brightloop API on :${config.port}  (docs: /api/docs)`));
const stop = () => server.close(() => pool.end().then(() => process.exit(0)));
process.on('SIGTERM', stop); process.on('SIGINT', stop);
