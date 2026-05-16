const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Check if SMTP credentials exist, else just log to console
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log('===================================================');
    console.log('NO SMTP CONFIGURATION FOUND - LOGGING EMAIL INSTEAD');
    console.log('To:', options.email);
    console.log('Subject:', options.subject);
    console.log('Message:', options.message);
    console.log('===================================================');
    return;
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const message = {
    from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    text: options.message
  };

  const info = await transporter.sendMail(message);

  console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
