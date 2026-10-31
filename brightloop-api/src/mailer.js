'use strict';
// Sends via SMTP when SMTP_URL is set; otherwise prints the message so the reset flow is demo-able offline.
async function sendMail({ to, subject, text }) {
  if (process.env.SMTP_URL) {
    try {
      const nodemailer = require('nodemailer');
      await nodemailer.createTransport(process.env.SMTP_URL)
        .sendMail({ from: process.env.MAIL_FROM || 'billing@brightloop.test', to, subject, text });
      return;
    } catch (e) { console.error('Mail delivery failed:', e.message); }
  }
  console.log(`[mail:dev] to=${to}\nsubject=${subject}\n${text}\n`);
}
module.exports = { sendMail };
