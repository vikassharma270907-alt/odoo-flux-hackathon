'use strict';
// Parsed (and coerced) input lands in req.valid.<where>, which works the same on Express 4 and 5.
const validate = (schema, where = 'body') => (req, res, next) => {
  try { req.valid = req.valid || {}; req.valid[where] = schema.parse(req[where]); next(); } catch (e) { next(e); }
};
module.exports = { validate };
