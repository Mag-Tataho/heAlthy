const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const SignupOtp = require('../models/SignupOtp');
const { auth } = require('../middleware/auth');
const { sendPasswordResetEmail, sendSignupVerificationEmail } = require('../utils/email');

const router = express.Router();
const PASSWORD_RESET_EXPIRES_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 30);
const SIGNUP_OTP_EXPIRES_MINUTES = Number(process.env.SIGNUP_OTP_EXPIRES_MINUTES || 10);
const MAX_AVATAR_DATA_URL_LENGTH = Number(process.env.MAX_AVATAR_DATA_URL_LENGTH || 2500000);
const PAYMONGO_API_BASE_URL = 'https://api.paymongo.com';
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || '';
const PAYMONGO_PREMIUM_PRICE_PHP = Number(process.env.PAYMONGO_PREMIUM_PRICE_PHP || 199);
const PAYMONGO_PREMIUM_AMOUNT = Math.round(PAYMONGO_PREMIUM_PRICE_PHP * 100);
const FRONTEND_URL = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const PAYMONGO_CHECKOUT_DESCRIPTION = 'heAlthy Premium membership';
const PAYMONGO_CHECKOUT_PRODUCT_NAME = 'heAlthy Premium';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign in attempts. Please try again later.' },
});

const signupOtpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup code requests. Please try again later.' },
});

const signupOtpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup verification attempts. Please try again later.' },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again later.' },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts. Please try again later.' },
});

const hashOtpToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const createOtpCode = () => {
  const plainCode = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const hashedCode = hashOtpToken(plainCode);
  return { plainCode, hashedCode };
};

const normalizeAvatarDataUrl = (avatarUrl) => {
  if (avatarUrl === undefined) return undefined;
  if (avatarUrl === null || avatarUrl === '') return '';

  if (typeof avatarUrl !== 'string') {
    throw new Error('Profile image must be an image data URL');
  }

  const trimmed = avatarUrl.trim();
  if (!trimmed) return '';

  const isSupportedDataUrl = /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(trimmed);
  if (!isSupportedDataUrl) {
    throw new Error('Profile image format is not supported. Use PNG, JPG, WEBP, or GIF.');
  }

  if (trimmed.length > MAX_AVATAR_DATA_URL_LENGTH) {
    throw new Error('Profile image is too large. Please upload a smaller image.');
  }

  return trimmed;
};

const findUserByResetCode = async (email, code) => {
  const normalizedEmail = normalizeEmail(email);
  const hashedCode = hashOtpToken(String(code));

  return User.findOne({
    email: normalizedEmail,
    passwordResetToken: hashedCode,
    passwordResetExpires: { $gt: new Date() },
  });
};

const normalizeProfileInput = (profile) => {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return undefined;
  }
  return profile;
};

const buildFrontendUrl = (pathname, query = {}) => {
  const url = new URL(pathname, `${FRONTEND_URL}/`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

const getPaymongoAuthHeader = () => {
  return `Basic ${Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString('base64')}`;
};

const parsePaymongoResponse = async (response) => {
  const rawBody = await response.text();
  let parsedBody = {};

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = { raw: rawBody };
    }
  }

  if (!response.ok) {
    const errorMessage =
      parsedBody?.errors?.[0]?.detail ||
      parsedBody?.errors?.[0]?.message ||
      parsedBody?.error ||
      parsedBody?.message ||
      `PayMongo request failed with status ${response.status}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.payload = parsedBody;
    throw error;
  }

  return parsedBody;
};

const paymongoRequest = async (path, { method = 'GET', body } = {}) => {
  if (!PAYMONGO_SECRET_KEY) {
    throw new Error('PayMongo is not configured. Set PAYMONGO_SECRET_KEY.');
  }

  const response = await fetch(`${PAYMONGO_API_BASE_URL}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: getPaymongoAuthHeader(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return parsePaymongoResponse(response);
};

const createPremiumCheckoutPayload = (user) => {
  const checkoutSessionReference = `healthy-premium-${user._id}-${Date.now()}`;

  return {
    data: {
      attributes: {
        line_items: [
          {
            currency: 'PHP',
            amount: PAYMONGO_PREMIUM_AMOUNT,
            description: 'One-month Premium access for heAlthy',
            name: PAYMONGO_CHECKOUT_PRODUCT_NAME,
            quantity: 1,
          },
        ],
        success_url: buildFrontendUrl('/payment/success'),
        cancel_url: buildFrontendUrl('/payment/failed', {
          reason: 'cancelled',
        }),
        description: PAYMONGO_CHECKOUT_DESCRIPTION,
        send_email_receipt: true,
        show_description: true,
        show_line_items: true,
        reference_number: checkoutSessionReference,
        metadata: {
          user_id: String(user._id),
          user_email: String(user.email || ''),
          purpose: 'premium_upgrade',
        },
      },
    },
  };
};

const summarizeCheckoutSession = (checkoutSession) => {
  const attributes = checkoutSession?.attributes || {};
  const paymentIntent = attributes.payment_intent || {};
  const paymentIntentAttributes = paymentIntent.attributes || {};

  return {
    id: checkoutSession?.id || null,
    status: attributes.status || null,
    checkoutUrl: attributes.checkout_url || null,
    cancelUrl: attributes.cancel_url || null,
    successUrl: attributes.success_url || null,
    referenceNumber: attributes.reference_number || null,
    paymentIntentId: paymentIntent.id || null,
    paymentIntentStatus: paymentIntentAttributes.status || null,
    paymentMethodTypes: attributes.payment_method_types || [],
    metadata: attributes.metadata || {},
  };
};

// POST /api/auth/request-signup-otp
router.post('/request-signup-otp', signupOtpRequestLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const { plainCode, hashedCode } = createOtpCode();
    const expiresAt = new Date(Date.now() + SIGNUP_OTP_EXPIRES_MINUTES * 60 * 1000);

    await SignupOtp.findOneAndUpdate(
      { email: normalizedEmail },
      {
        $set: {
          email: normalizedEmail,
          codeHash: hashedCode,
          expiresAt,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    try {
      await sendSignupVerificationEmail({
        to: normalizedEmail,
        name: String(name).trim(),
        signupCode: plainCode,
        expiresMinutes: SIGNUP_OTP_EXPIRES_MINUTES,
      });
      return res.json({
        message: 'A 6-digit verification code has been sent to your email.',
        email: normalizedEmail,
        expiresMinutes: SIGNUP_OTP_EXPIRES_MINUTES,
      });
    } catch (emailErr) {
      console.error('Signup verification email failed:', emailErr.message);
      await SignupOtp.deleteOne({ email: normalizedEmail });
      return res.status(500).json({ error: 'Unable to send verification email. Please try again.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Unable to start signup verification. Please try again.' });
  }
});

// POST /api/auth/register
router.post('/register', signupOtpVerifyLimiter, async (req, res) => {
  try {
    const { name, email, password, avatarUrl, code, profile } = req.body || {};

    if (!name || !email || !password || !code) {
      return res.status(400).json({ error: 'Name, email, password, and verification code are required' });
    }
    if (!/^\d{6}$/.test(String(code))) {
      return res.status(400).json({ error: 'A valid 6-digit verification code is required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = normalizeEmail(email);
    const safeAvatarUrl = normalizeAvatarDataUrl(avatarUrl);
    const safeProfile = normalizeProfileInput(profile);

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const pendingSignup = await SignupOtp.findOne({
      email: normalizedEmail,
      codeHash: hashOtpToken(String(code)),
      expiresAt: { $gt: new Date() },
    });

    if (!pendingSignup) {
      return res.status(400).json({ error: 'Invalid verification code or code expired' });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password,
      avatarUrl: safeAvatarUrl || undefined,
      profile: safeProfile,
    });

    await SignupOtp.deleteOne({ _id: pendingSignup._id });

    const token = generateToken(user._id);

    res.status(201).json({ token, user });
  } catch (err) {
    if (err.message?.toLowerCase().includes('profile image')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });
    const genericResponse = {
      message: 'If an account with that email exists, a 6-digit reset code has been sent.',
    };

    if (!user) {
      return res.json(genericResponse);
    }

    const { plainCode, hashedCode } = createOtpCode();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);

    user.passwordResetToken = hashedCode;
    user.passwordResetExpires = expiresAt;
    await user.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetCode: plainCode,
        expiresMinutes: PASSWORD_RESET_EXPIRES_MINUTES,
      });

      return res.json(genericResponse);
    } catch (emailErr) {
      console.error('Password reset email failed:', emailErr.message);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ error: 'Unable to send reset email. Please try again.' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Unable to start password reset. Please try again.' });
  }
});

// POST /api/auth/reset-password
router.post('/verify-reset-code', resetPasswordLimiter, async (req, res) => {
  try {
    const { email, code } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!code || !/^\d{6}$/.test(String(code))) {
      return res.status(400).json({ error: 'A valid 6-digit reset code is required' });
    }

    const user = await findUserByResetCode(email, code);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or reset code, or the code has expired' });
    }

    return res.json({ message: 'Reset code verified.' });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to verify reset code. Please try again.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { email, code, password } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!code || !/^\d{6}$/.test(String(code))) {
      return res.status(400).json({ error: 'A valid 6-digit reset code is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await findUserByResetCode(email, code);

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or reset code, or the code has expired' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.json({ message: 'Password reset successful. You can now sign in.' });
  } catch (err) {
    return res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/premium/checkout
router.post('/premium/checkout', auth, async (req, res) => {
  try {
    if (req.user.isPremium) {
      return res.json({
        alreadyPremium: true,
        user: req.user,
        message: 'User already has Premium access.',
      });
    }

    const checkoutResponse = await paymongoRequest('/v1/checkout_sessions', {
      method: 'POST',
      body: createPremiumCheckoutPayload(req.user),
    });

    const checkoutSession = checkoutResponse?.data;
    const summary = summarizeCheckoutSession(checkoutSession);

    if (!summary.checkoutUrl) {
      throw new Error('PayMongo did not return a checkout URL.');
    }

    return res.status(201).json({
      message: 'Premium checkout session created.',
      checkoutSessionId: summary.id,
      checkoutUrl: summary.checkoutUrl,
      checkoutSession: summary,
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Unable to create premium checkout. Please try again.';
    return res.status(status).json({ error: message });
  }
});

// POST /api/auth/premium/checkout/:checkoutSessionId/confirm
router.post('/premium/checkout/:checkoutSessionId/confirm', auth, async (req, res) => {
  try {
    const { checkoutSessionId } = req.params;

    if (!checkoutSessionId) {
      return res.status(400).json({ error: 'Checkout session ID is required' });
    }

    if (req.user.isPremium) {
      return res.json({
        verified: true,
        alreadyPremium: true,
        user: req.user,
        message: 'User already has Premium access.',
      });
    }

    const checkoutResponse = await paymongoRequest(`/v1/checkout_sessions/${encodeURIComponent(checkoutSessionId)}`, {
      method: 'GET',
    });

    const checkoutSession = checkoutResponse?.data;
    const summary = summarizeCheckoutSession(checkoutSession);
    const ownerId = summary.metadata?.user_id ? String(summary.metadata.user_id) : '';

    if (ownerId !== String(req.user._id)) {
      return res.status(403).json({
        error: 'This checkout session does not belong to the current user.',
      });
    }

    if (summary.paymentIntentStatus === 'failed' || summary.status === 'expired') {
      return res.status(400).json({
        verified: false,
        status: 'failed',
        error: 'Payment was not completed. Please start a new QRPH checkout.',
        checkoutSession: summary,
      });
    }

    if (summary.paymentIntentStatus !== 'succeeded') {
      return res.json({
        verified: false,
        status: summary.paymentIntentStatus || summary.status || 'pending',
        message: 'Payment is still processing. Please try again in a moment.',
        checkoutSession: summary,
        user: req.user,
      });
    }

    req.user.isPremium = true;
    await req.user.save();

    return res.json({
      verified: true,
      message: 'Premium activated after verified QRPH payment.',
      checkoutSession: summary,
      user: req.user,
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || 'Unable to verify premium payment. Please try again.';
    return res.status(status).json({ error: message });
  }
});

module.exports = router;
