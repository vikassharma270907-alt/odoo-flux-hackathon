'use strict';
const { Pool, types } = require('pg');

types.setTypeParser(1082, (v) => v);                 // DATE    -> 'YYYY-MM-DD' (no timezone shifting)
types.setTypeParser(1700, (v) => parseFloat(v));     // NUMERIC -> number
types.setTypeParser(20, (v) => parseInt(v, 10));     // BIGINT (count(*)) -> number

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/subscriptions',
});

module.exports = { pool };
