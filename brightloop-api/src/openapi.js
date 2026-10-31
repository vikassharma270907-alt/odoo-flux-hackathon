'use strict';
// [method, path, who, summary]. Served at /api/openapi.json and rendered at /api/docs.
const R = [
  ['post', '/auth/signup', 'public', 'Create a customer account (password rules enforced)'],
  ['post', '/auth/login', 'public', 'Sign in, returns a JWT'],
  ['post', '/auth/forgot-password', 'public', 'E-mail a reset link to a registered address'],
  ['post', '/auth/reset-password', 'public', 'Choose a new password with the reset token'],
  ['get', '/auth/me', 'any', 'Current user'],
  ['post', '/users/staff', 'admin', 'Add a staff member (admin only)'],
  ['get', '/users', 'admin', 'List users'],
  ['patch', '/users/{id}/active', 'admin', 'Activate or deactivate a user'],
  ['get', '/taxes', 'staff', 'List taxes'], ['post', '/taxes', 'admin', 'Create a tax rule'],
  ['get', '/products', 'any', 'List products with variants'], ['post', '/products', 'admin', 'Create a product with variants'],
  ['get', '/plans', 'any', 'List plans'], ['post', '/plans', 'admin', 'Create a plan'], ['patch', '/plans/{id}', 'admin', 'Change plan behaviour flags'],
  ['get', '/discounts', 'staff', 'List discount rules'], ['post', '/discounts', 'admin', 'Create a discount rule'],
  ['patch', '/discounts/{id}/active', 'admin', 'Enable or disable a discount'],
  ['get', '/templates', 'staff', 'List quotation templates'], ['post', '/templates', 'admin', 'Create a quotation template'],
  ['get', '/customers', 'staff', 'Search customers (name, company)'], ['post', '/customers', 'staff', 'Create a customer'],
  ['get', '/subscriptions', 'any', 'List subscriptions (customers see only their own); filters + pagination'],
  ['post', '/subscriptions', 'staff', 'Create a subscription from a template or explicit lines'],
  ['get', '/subscriptions/{id}', 'any', 'Subscription with lines'],
  ['post', '/subscriptions/{id}/transition', 'any', 'Move through Draft > Quotation > Confirmed > Active > Closed (customers: pause/resume/close own)'],
  ['post', '/subscriptions/{id}/renew', 'any', 'Renew an active subscription'],
  ['get', '/invoices', 'any', 'List invoices; filters: status, overdue, customer, dates, search'],
  ['get', '/invoices/{id}', 'any', 'Invoice with lines, payments and discounts'],
  ['get', '/invoices/{id}/print', 'any', 'Printable invoice page'],
  ['post', '/invoices/run-billing', 'staff', 'Billing day: create every due invoice (idempotent)'],
  ['post', '/invoices/{id}/confirm', 'staff', 'Draft to Confirmed'], ['post', '/invoices/{id}/cancel', 'staff', 'Cancel an unpaid invoice'],
  ['post', '/invoices/{id}/send', 'staff', 'Mark a confirmed invoice as sent'],
  ['post', '/payments', 'staff', 'Record a payment against an invoice'], ['get', '/payments', 'staff', 'List payments'],
  ['get', '/reports/summary', 'staff', 'Active subscriptions, revenue, outstanding, overdue, MRR'],
  ['get', '/reports/status-breakdown', 'staff', 'Counts by status'], ['get', '/reports/revenue', 'staff', 'Revenue by day or month'],
  ['get', '/reports/overdue', 'staff', 'Overdue invoices, oldest first'], ['get', '/reports/export.csv', 'staff', 'CSV export of invoices or payments'],
];

function spec() {
  const paths = {};
  for (const [m, p, who, summary] of R) {
    const params = [...p.matchAll(/\{(\w+)\}/g)].map((x) => ({ name: x[1], in: 'path', required: true, schema: { type: 'integer' } }));
    (paths[p] = paths[p] || {})[m] = {
      summary, description: `Access: ${who}`, parameters: params, security: who === 'public' ? [] : [{ bearer: [] }],
      responses: { 200: { description: 'OK' }, 400: { description: 'Validation error' }, 401: { description: 'Not signed in' }, 403: { description: 'Not allowed' }, 409: { description: 'Conflict with current state' } },
    };
  }
  return { openapi: '3.0.3', info: { title: 'Brightloop Subscription Management API', version: '1.0.0' }, servers: [{ url: '/api' }],
    components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } }, paths };
}
const docsHtml = `<!doctype html><meta charset="utf-8"><title>API docs</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css">
<div id="ui"></div><script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.min.js"></script>
<script>SwaggerUIBundle({url:'/api/openapi.json',dom_id:'#ui'})</script>`;
module.exports = { spec, docsHtml, ROUTES: R };
