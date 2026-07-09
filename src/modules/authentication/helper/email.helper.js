const nodemailer = require('nodemailer');
const env = require('../../../config/environment');
const logger = require('../../../common/logger/winston');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.email.user,
    pass: env.email.pass
  }
});

// Update these to match your real branding / support details
const BRAND = {
  name: 'Research Connect',
  logoUrl: 'https://yourdomain.com/assets/logo-email.png', // TODO: replace with hosted logo URL
  primaryColor: '#2563EB',
  secondaryColor: '#4F46E5',
  supportEmail: 'support@researchconnect.com',
  websiteUrl: 'https://researchconnect.com',
  privacyUrl: 'https://researchconnect.com/privacy',
  termsUrl: 'https://researchconnect.com/terms',
  address: '' // e.g. company registered address, optional but good practice
};

/**
 * Escapes HTML special characters to prevent HTML/markup injection
 * whenever user-supplied strings (name, device, browser, etc.) are
 * interpolated into email HTML.
 */
const escapeHtml = (value = '') => {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Strips HTML tags for a basic plain-text fallback.
 * Good enough for transactional emails; not a full HTML-to-text parser.
 */
const htmlToPlainText = (html = '') => {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|li)>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Common Email Frame Wrapper — responsive, dark-mode aware, branded
const wrapEmailTemplate = (title, contentHTML, options = {}) => {
  const { preheader = '' } = options;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <title>${escapeHtml(title)}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #F8FAFC;
          color: #0F172A;
        }
        .preheader {
          display: none;
          visibility: hidden;
          opacity: 0;
          color: transparent;
          height: 0;
          width: 0;
          overflow: hidden;
          mso-hide: all;
        }
        .wrapper {
          width: 100%;
          background-color: #F8FAFC;
          padding: 24px 12px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #FFFFFF;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #E2E8F0;
        }
        .header {
          background: linear-gradient(135deg, ${BRAND.primaryColor} 0%, ${BRAND.secondaryColor} 100%);
          padding: 28px 20px;
          text-align: center;
        }
        .header img.logo {
          height: 32px;
          margin-bottom: 8px;
        }
        .header h1 {
          color: #FFFFFF;
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.025em;
        }
        .content {
          padding: 36px 30px;
          line-height: 1.65;
          font-size: 15px;
        }
        .content h2 {
          font-size: 20px;
          margin: 0 0 16px;
        }
        .greeting {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 12px;
        }
        .footer {
          background-color: #F1F5F9;
          padding: 24px 30px;
          text-align: center;
          font-size: 12px;
          color: #64748B;
          border-top: 1px solid #E2E8F0;
        }
        .footer a {
          color: #64748B;
          text-decoration: underline;
        }
        .otp-box {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 6px;
          text-align: center;
          padding: 16px 20px;
          background-color: #EFF6FF;
          border: 2px dashed ${BRAND.primaryColor};
          border-radius: 8px;
          color: ${BRAND.primaryColor};
          margin: 24px auto;
          max-width: 250px;
        }
        .expiry-note {
          text-align: center;
          font-size: 13px;
          color: #64748B;
          margin-top: -12px;
          margin-bottom: 24px;
        }
        .button {
          display: inline-block;
          padding: 13px 28px;
          background-color: ${BRAND.primaryColor};
          color: #FFFFFF !important;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          text-align: center;
          margin: 12px 0;
        }
        .button-wrapper {
          text-align: center;
          margin: 24px 0;
        }
        .alert-box {
          padding: 16px;
          background-color: #FEF2F2;
          border-left: 4px solid #EF4444;
          border-radius: 6px;
          color: #991B1B;
          font-size: 14px;
          margin: 20px 0;
        }
        .info-box {
          padding: 16px;
          background-color: #F8FAFC;
          border-left: 4px solid #CBD5E1;
          border-radius: 6px;
          color: #475569;
          font-size: 14px;
          margin: 20px 0;
        }
        .security-tips {
          margin: 24px 0 0;
          padding: 16px 18px;
          background-color: #FFFBEB;
          border-left: 4px solid #F59E0B;
          border-radius: 6px;
          font-size: 13px;
          color: #92400E;
        }
        .security-tips strong {
          display: block;
          margin-bottom: 6px;
        }
        .security-tips ul {
          margin: 6px 0 0;
          padding-left: 18px;
        }

        /* Dark mode support for clients that respect prefers-color-scheme */
        @media (prefers-color-scheme: dark) {
          body, .wrapper { background-color: #0F172A !important; }
          .container { background-color: #1E293B !important; border-color: #334155 !important; }
          .content { color: #E2E8F0 !important; }
          .footer { background-color: #0F172A !important; color: #94A3B8 !important; border-top-color: #334155 !important; }
          .footer a { color: #94A3B8 !important; }
          .otp-box { background-color: #1E293B !important; }
          .info-box { background-color: #1E293B !important; color: #CBD5E1 !important; }
        }

        @media only screen and (max-width: 480px) {
          .content { padding: 28px 20px; }
          .footer { padding: 20px; }
          .otp-box { font-size: 26px; letter-spacing: 4px; }
        }
      </style>
    </head>
    <body>
      <span class="preheader">${escapeHtml(preheader)}</span>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <img class="logo" src="${BRAND.logoUrl}" alt="${escapeHtml(BRAND.name)}" />
            <h1>${escapeHtml(BRAND.name)}</h1>
          </div>
          <div class="content">
            ${contentHTML}
          </div>
          <div class="footer">
            <p>This is an automated message from ${escapeHtml(BRAND.name)}. Please do not reply directly to this email.</p>
            <p>Need help? Contact us at <a href="mailto:${BRAND.supportEmail}">${BRAND.supportEmail}</a></p>
            <p>
              <a href="${BRAND.websiteUrl}">Website</a> ·
              <a href="${BRAND.privacyUrl}">Privacy Policy</a> ·
              <a href="${BRAND.termsUrl}">Terms of Service</a>
            </p>
            ${BRAND.address ? `<p>${escapeHtml(BRAND.address)}</p>` : ''}
            <p>&copy; ${new Date().getFullYear()} ${escapeHtml(BRAND.name)}. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const securityTipsBlock = () => `
  <div class="security-tips">
    <strong>🔒 Security tip</strong>
    <ul>
      <li>${escapeHtml(BRAND.name)} will never ask you for this code over phone, chat, or email.</li>
      <li>Do not share this code with anyone, including people claiming to be support staff.</li>
      <li>If you didn't request this, you can safely ignore this email.</li>
    </ul>
  </div>
`;

const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"${BRAND.name}" <${env.email.user}>`,
      to,
      subject,
      html,
      text: htmlToPlainText(html)
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`, error);
    return false;
  }
};

const sendRegistrationOtp = async (to, otp, firstName = '') => {
  const safeName = escapeHtml(firstName);
  const content = `
    ${safeName ? `<p class="greeting">Hi ${safeName},</p>` : ''}
    <h2>Verify Your Email Address</h2>
    <p>Thanks for starting your registration on <strong>${escapeHtml(BRAND.name)}</strong>. Use the code below to verify your email address.</p>
    <div class="otp-box">${escapeHtml(otp)}</div>
    <p class="expiry-note">Valid for 10 minutes</p>
    ${securityTipsBlock()}
  `;
  return await sendEmail(
    to,
    `Verify Your Email - ${BRAND.name} OTP`,
    wrapEmailTemplate('Email Verification', content, { preheader: `Your verification code is ${otp}` })
  );
};

const sendLoginOtp = async (to, otp, metadata = {}, firstName = '') => {
  const { ip = 'Unknown', device = 'Unknown', browser = 'Unknown' } = metadata;
  const safeName = escapeHtml(firstName);
  const content = `
    ${safeName ? `<p class="greeting">Hi ${safeName},</p>` : ''}
    <h2>Security Verification Code</h2>
    <p>A login attempt was made to your <strong>${escapeHtml(BRAND.name)}</strong> account. Use this code to verify it's you.</p>
    <div class="otp-box">${escapeHtml(otp)}</div>
    <p class="expiry-note">Valid for 10 minutes</p>
    <div class="info-box">
      <strong>Login attempt details:</strong><br>
      IP Address: ${escapeHtml(ip)}<br>
      Device: ${escapeHtml(device)}<br>
      Browser: ${escapeHtml(browser)}
    </div>
    <p>If this wasn't you, log in immediately and change your password, or contact support.</p>
    ${securityTipsBlock()}
  `;
  return await sendEmail(
    to,
    `Security Login Code - ${BRAND.name} OTP`,
    wrapEmailTemplate('Login Verification', content, { preheader: `Your login code is ${otp}` })
  );
};

const sendForgotPasswordOtp = async (to, otp, firstName = '') => {
  const safeName = escapeHtml(firstName);
  const content = `
    ${safeName ? `<p class="greeting">Hi ${safeName},</p>` : ''}
    <h2>Reset Password Request</h2>
    <p>We received a request to reset your password on <strong>${escapeHtml(BRAND.name)}</strong>. Use this code to proceed.</p>
    <div class="otp-box">${escapeHtml(otp)}</div>
    <p class="expiry-note">Valid for 10 minutes</p>
    <p>If you didn't request a password reset, please contact us immediately to secure your account.</p>
    ${securityTipsBlock()}
  `;
  return await sendEmail(
    to,
    `Reset Password - ${BRAND.name} OTP`,
    wrapEmailTemplate('Reset Password Request', content, { preheader: `Your password reset code is ${otp}` })
  );
};

const sendWelcomeEmail = async (to, firstName, ctaUrl = BRAND.websiteUrl) => {
  const safeName = escapeHtml(firstName);
  const content = `
    <p class="greeting">Hi ${safeName || 'there'},</p>
    <h2>Welcome to ${escapeHtml(BRAND.name)}! 🎉</h2>
    <p>We're thrilled to have you join <strong>${escapeHtml(BRAND.name)}</strong> — the AI-powered research discovery and collaboration platform.</p>
    <p>Our mission is to help you discover relevant literature, connect with collaborators around the globe, and showcase your academic portfolio seamlessly.</p>
    <p><strong>Quick steps to get started:</strong></p>
    <ul>
      <li>Complete your profile affiliation and fields of interest.</li>
      <li>Search for your publications and add them to your portfolio.</li>
      <li>Connect with colleagues and invite co-authors.</li>
    </ul>
    <div class="button-wrapper">
      <a class="button" href="${ctaUrl}">Complete Your Profile</a>
    </div>
    <p>Questions or feedback? Our support team is always happy to help.</p>
  `;
  return await sendEmail(
    to,
    `Welcome to ${BRAND.name}!`,
    wrapEmailTemplate('Welcome!', content, { preheader: `Welcome to ${BRAND.name}, ${firstName}!` })
  );
};

const sendPasswordChangedEmail = async (to, firstName = '') => {
  const safeName = escapeHtml(firstName);
  const content = `
    ${safeName ? `<p class="greeting">Hi ${safeName},</p>` : ''}
    <h2>Password Changed Successfully</h2>
    <p>Your password for <strong>${escapeHtml(BRAND.name)}</strong> has been successfully updated.</p>
    <div class="alert-box">
      <strong>Security alert:</strong> If you did not perform this change, please contact support immediately to secure your account.
    </div>
  `;
  return await sendEmail(
    to,
    `Security Alert: Password Changed - ${BRAND.name}`,
    wrapEmailTemplate('Password Updated', content, { preheader: 'Your password was just changed' })
  );
};

const sendSecurityAlertEmail = async (to, eventDescription, metadata = {}) => {
  const { ip = 'Unknown', device = 'Unknown', browser = 'Unknown' } = metadata;
  const content = `
    <h2>Security Alert</h2>
    <p>We detected an important security event on your account: <strong>${escapeHtml(eventDescription)}</strong></p>
    <div class="alert-box">
      <strong>Incident details:</strong><br>
      IP Address: ${escapeHtml(ip)}<br>
      Device: ${escapeHtml(device)}<br>
      Browser: ${escapeHtml(browser)}<br>
      Time: ${new Date().toUTCString()}
    </div>
    <p>If this wasn't you, secure your account immediately by resetting your password.</p>
  `;
  return await sendEmail(
    to,
    `Security Alert - ${BRAND.name}`,
    wrapEmailTemplate('Security Alert', content, { preheader: eventDescription })
  );
};

module.exports = {
  sendRegistrationOtp,
  sendLoginOtp,
  sendForgotPasswordOtp,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendSecurityAlertEmail
};