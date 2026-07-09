const nodemailer = require('nodemailer');
const logger = require('../logger/winston');

const sendEmail = async ({ to, subject, html, text }) => {
  logger.info(`Sending email to ${to} with subject "${subject}"...`);
  
  if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_USER) {
    logger.info('--- MOCK EMAIL ---');
    logger.info(`To: ${to}`);
    logger.info(`Subject: ${subject}`);
    logger.info(`Body (text): ${text}`);
    logger.info('-------------------');
    return { messageId: 'mock-id-' + Date.now() };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT, 10) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"Research Connect" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw error;
  }
};

module.exports = {
  sendEmail
};
