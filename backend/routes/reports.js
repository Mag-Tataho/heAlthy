const express = require('express');
const { auth, requirePremium } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/advanced
router.get('/advanced', auth, requirePremium, (req, res) => {
  return res.json({
    report: 'advanced',
    status: 'ready',
    userId: String(req.user._id),
    generatedAt: new Date().toISOString(),
  });
});

module.exports = router;