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

module.exports = router;
