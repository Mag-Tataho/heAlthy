const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();
const PASSWORD_RESET_EXPIRES_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 30);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
};

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

const createPasswordResetCode = () => {
  const plainCode = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
  const hashedCode = hashResetToken(plainCode);
  return { plainCode, hashedCode };
};

const hashResetToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const findUserByResetCode = async (email, code) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const hashedCode = hashResetToken(String(code));

  return User.findOne({
    email: normalizedEmail,
    passwordResetToken: hashedCode,
    passwordResetExpires: { $gt: new Date() },
  });
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
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

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    const genericResponse = {
      message: 'If an account with that email exists, a 6-digit reset code has been sent.',
    };

    if (!user) {
      return res.json(genericResponse);
    }

    const { plainCode, hashedCode } = createPasswordResetCode();
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

// PUT /api/auth/upgrade (mock payment — toggles isPremium)
router.put('/upgrade', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isPremium: true },
      { new: true }
    );
    res.json({ user, message: 'Upgraded to Premium successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Upgrade failed. Please try again.' });
  }
});

module.exports = router;
