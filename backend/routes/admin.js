const express = require('express');
const User = require('../models/User');
const { adminSecret } = require('../middleware/adminSecret');

const router = express.Router();

router.post('/upgrade-user', adminSecret, async (req, res) => {
  try {
    const { userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const premiumGrantedAt = new Date();
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          isPremium: true,
          premiumGrantedAt,
          premiumGrantedBy: 'admin',
        },
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid userId' });
    }

    return res.status(500).json({ error: 'Unable to upgrade user' });
  }
});

module.exports = router;