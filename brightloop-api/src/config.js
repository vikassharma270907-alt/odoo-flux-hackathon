'use strict';
const isProd = process.env.NODE_ENV === 'production';
if (isProd && !process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in production');
module.exports = {
  isProd,
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
