const express = require('express');
const Progress = require('../models/Progress');
const { auth } = require('../middleware/auth');

const router = express.Router();

// POST /api/progress
router.post('/', auth, async (req, res) => {
  try {
    const data = { ...req.body, user: req.user._id };
    const progress = await Progress.create(data);
    res.status(201).json({ progress });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to log progress' });
  }
});

// GET /api/progress
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const entries = await Progress.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(parseInt(limit));
    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

// DELETE /api/progress/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const entry = await Progress.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});


// GET /api/progress/friend/:userId — view a friend's progress (if they allow it)
router.get('/friend/:userId', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const friend = await User.findById(req.params.userId);
    if (!friend) return res.status(404).json({ error: 'User not found' });

    // Check they are friends
    const isFriend = friend.friends.some(id => id.toString() === req.user._id.toString());
    if (!isFriend) return res.status(403).json({ error: 'Not friends with this user' });

    // Check privacy setting
    if (friend.privacy && friend.privacy.showProgress === false) {
      return res.status(403).json({ error: 'This user has set their progress to private' });
    }

    const { limit = 30 } = req.query;
    const entries = await Progress.find({ user: req.params.userId })
      .sort({ date: -1 })
      .limit(parseInt(limit));

    res.json({
      entries,
      user: {
        name: friend.name,
        isPremium: friend.isPremium,
        showGoal: friend.privacy?.showGoal !== false,
        goal: friend.privacy?.showGoal !== false ? friend.profile?.goal : null,
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch friend progress' });
  }
});

module.exports = router;
