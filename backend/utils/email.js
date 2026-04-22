const nodemailer = require('nodemailer');

let transporter;

const parseBool = (value) => String(value).toLowerCase() === 'true';

const getMailCredentials = () => {
  const user = process.env.EMAIL_ID || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
  return { user, pass };
};

function isMailConfigured() {
  const { user, pass } = getMailCredentials();
  return Boolean(user && pass);
}

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const { user, pass } = getMailCredentials();

  if (!isMailConfigured()) {
    const missing = [
      !user && 'EMAIL_ID (or SMTP_USER)',
      !pass && 'EMAIL_PASSWORD (or SMTP_PASS)',
    ].filter(Boolean).join(', ');
    throw new Error(`Mail configuration is incomplete. Missing: ${missing}`);
  }

  if (host) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: parseBool(process.env.SMTP_SECURE) || port === 465,
      auth: { user, pass },
    });
  } else {
    // Default to Gmail-style transport when only EMAIL_ID and EMAIL_PASSWORD are provided.
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  return transporter;
}

async function sendPasswordResetEmail({ to, name, resetCode, expiresMinutes }) {
  const { user } = getMailCredentials();
  const from = process.env.MAIL_FROM || user;
  const subject = 'Your heAlthy password reset code';
  const safeName = name || 'there';

  const text = [
    `Hi ${safeName},`,
    '',
    'Use this 6-digit code to reset your heAlthy account password:',
    `${resetCode}`,
    '',
    `This code expires in ${expiresMinutes} minutes.`,
    'Enter it in the Reset Password page of the app.',
    'If you did not request this, you can safely ignore this email.',
  ].join('\n');

  const html = `
    <div style="margin:0; padding:24px; background:#f4f7f4; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color:#1f2937;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
        <tr>
          <td style="padding:20px 24px; background:linear-gradient(135deg, #3f7d4e, #2f6a3f); color:#ffffff;">
            <h1 style="margin:0; font-size:20px; font-weight:700;">Reset your heAlthy password</h1>
            <p style="margin:8px 0 0; font-size:13px; opacity:0.9;">Secure one-time verification code</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 12px; font-size:14px;">Hi ${safeName},</p>
            <p style="margin:0 0 16px; font-size:14px; line-height:1.6;">We received a request to reset your password. Enter this code in the app to continue:</p>
            <div style="margin:0 0 16px; text-align:center;">
              <span style="display:inline-block; padding:12px 18px; border:1px dashed #3f7d4e; border-radius:10px; font-size:28px; font-weight:700; letter-spacing:8px; color:#1f2937; background:#f8fbf8;">
                ${resetCode}
              </span>
            </div>
            <p style="margin:0 0 8px; font-size:13px; color:#4b5563;">This code expires in ${expiresMinutes} minutes.</p>
            <p style="margin:0; font-size:13px; color:#4b5563;">If you did not request this, you can safely ignore this email.</p>
          </td>
        </tr>
      </table>
    </div>
  `;

  const mailer = getTransporter();
  await mailer.sendMail({ from, to, subject, text, html });
}

async function sendSignupVerificationEmail({ to, name, signupCode, expiresMinutes }) {
  const { user } = getMailCredentials();
  const from = process.env.MAIL_FROM || user;
  const subject = 'Verify your heAlthy email address';
  const safeName = name || 'there';

  const text = [
    `Hi ${safeName},`,
    '',
    'Use this 6-digit code to verify your email and create your heAlthy account:',
    `${signupCode}`,
    '',
    `This code expires in ${expiresMinutes} minutes.`,
    'If you did not attempt to sign up, you can ignore this email.',
  ].join('\n');

  const html = `
    <div style="margin:0; padding:24px; background:#f4f7f4; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color:#1f2937;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
        <tr>
          <td style="padding:20px 24px; background:linear-gradient(135deg, #3f7d4e, #2f6a3f); color:#ffffff;">
            <h1 style="margin:0; font-size:20px; font-weight:700;">Verify your heAlthy sign-up</h1>
            <p style="margin:8px 0 0; font-size:13px; opacity:0.9;">Secure one-time verification code</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 12px; font-size:14px;">Hi ${safeName},</p>
            <p style="margin:0 0 16px; font-size:14px; line-height:1.6;">Enter this code in the app to verify your email before account creation:</p>
            <div style="margin:0 0 16px; text-align:center;">
              <span style="display:inline-block; padding:12px 18px; border:1px dashed #3f7d4e; border-radius:10px; font-size:28px; font-weight:700; letter-spacing:8px; color:#1f2937; background:#f8fbf8;">
                ${signupCode}
              </span>
            </div>
            <p style="margin:0 0 8px; font-size:13px; color:#4b5563;">This code expires in ${expiresMinutes} minutes.</p>
            <p style="margin:0; font-size:13px; color:#4b5563;">If this was not you, you can safely ignore this email.</p>
          </td>
        </tr>
      </table>
    </div>
  `;

  const mailer = getTransporter();
  await mailer.sendMail({ from, to, subject, text, html });
}

module.exports = {
  isMailConfigured,
  sendPasswordResetEmail,
  sendSignupVerificationEmail,
};
