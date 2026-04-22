const express = require('express');
const { adminSecret } = require('../middleware/adminSecret');
const { updateUserById } = require('../src/db/users');

const router = express.Router();

router.post('/upgrade-user', adminSecret, async (req, res) => {
  try {
    const { userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = await updateUserById(userId, {
      isPremium: true,
      premiumGrantedAt: new Date().toISOString(),
      premiumGrantedBy: 'admin',
    });

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