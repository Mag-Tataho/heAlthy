const express = require('express');
const User = require('../models/User');
const Progress = require('../models/Progress');
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


// PUT /api/profile/privacy
router.put('/privacy', auth, async (req, res) => {
  try {
    const { privacy } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { privacy } },
      { new: true }
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

// GET /api/profile/friend/:id — view a friend's public profile + progress
router.get('/friend/:id', auth, async (req, res) => {
  try {
    const viewer = req.user;
    const friend = await User.findById(req.params.id).select('-password');
    if (!friend) return res.status(404).json({ error: 'User not found' });

    // Check if they are actually friends
    // friends may be populated objects or raw ObjectIds — handle both
    const isFriend = viewer.friends.some(f => {
      const id = f._id ? f._id.toString() : f.toString();
      return id === friend._id.toString();
    });
    if (!isFriend) return res.status(403).json({ error: 'You are not friends with this user' });

    const privacy = friend.privacy || {};

    // Build response based on privacy settings
    const result = {
      _id:       friend._id,
      name:      friend.name,
      isPremium: friend.isPremium,
      friendCount: friend.friendCount,
      profile:   privacy.showProfile !== false ? friend.profile : null,
      goal:      privacy.showGoal !== false ? friend.profile?.goal : null,
      privacy,
    };

    // Add progress if allowed
    let progress = [];
    if (privacy.showProgress !== false) {
      progress = await Progress.find({ user: friend._id })
        .sort({ date: -1 })
        .limit(30)
        .lean();
    }

    res.json({ friend: result, progress });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load friend profile' });
  }
});

module.exports = router;
