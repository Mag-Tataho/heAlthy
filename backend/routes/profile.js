const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// GET /api/profile
router.get('/', auth, async (req, res) => {
  res.json({ profile: req.user.profile, reminders: req.user.reminders });
});

// PUT /api/profile
router.put('/', auth, async (req, res) => {
  try {
    const { profile } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { profile } },
      { new: true, runValidators: true }
    );
    res.json({ user, message: 'Profile updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update profile' });
  }
});

// PUT /api/profile/reminders
router.put('/reminders', auth, async (req, res) => {
  try {
    const { reminders } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { reminders } },
      { new: true }
    );
    res.json({ user, message: 'Reminders updated' });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update reminders' });
  }
});

module.exports = router;
