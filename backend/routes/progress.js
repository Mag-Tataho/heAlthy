const express = require('express');
const { auth } = require('../middleware/auth');
const { createProgressEntry, listProgressEntries, deleteProgressEntry } = require('../src/db/progress');
const { getUserById } = require('../src/db/users');

const router = express.Router();

// POST /api/progress
router.post('/', auth, async (req, res) => {
  try {
    const progress = await createProgressEntry({ userId: req.user._id, ...req.body });
    res.status(201).json({ progress });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to log progress' });
  }
});

// GET /api/progress
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const entries = await listProgressEntries(req.user._id, { limit });
    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

// DELETE /api/progress/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const entry = await deleteProgressEntry(req.user._id, req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});


// GET /api/progress/friend/:userId — view a friend's progress (if they allow it)
router.get('/friend/:userId', auth, async (req, res) => {
  try {
    const friend = await getUserById(req.params.userId);
    if (!friend) return res.status(404).json({ error: 'User not found' });

    // Check they are friends
    const isFriend = friend.friends.some(id => id.toString() === req.user._id.toString());
    if (!isFriend) return res.status(403).json({ error: 'Not friends with this user' });

    // Check privacy setting
    if (friend.privacy && friend.privacy.showProgress === false) {
      return res.status(403).json({ error: 'This user has set their progress to private' });
    }

    const { limit = 30 } = req.query;
    const entries = await listProgressEntries(req.params.userId, { limit });

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
