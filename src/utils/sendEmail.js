const nodemailer = require('nodemailer');
const config = require('../config/env');

const sendEmail = async (options) => {
  if (!config.email.smtp.host || config.email.smtp.host.includes('mock_') || config.email.smtp.auth.user.includes('mock_')) {
    console.log(`[MOCK EMAIL] To: ${options.email}, Subject: ${options.subject}, Body: ${options.message}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    auth: {
      user: config.email.smtp.auth.user,
      pass: config.email.smtp.auth.pass,
    },
  });

  const message = {
    from: `Mobile Maintenance <no-reply@mobilemaintenance.com>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  const info = await transporter.sendMail(message);
  console.log(`Email sent: ${info.messageId}`);
};

module.exports = sendEmail;
