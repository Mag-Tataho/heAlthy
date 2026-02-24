const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No authentication token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Populate friends so friend routes work correctly
    const user = await User.findById(decoded.id).populate('friends', 'name email isPremium');

    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const premiumAuth = async (req, res, next) => {
  await auth(req, res, async () => {
    if (!req.user.isPremium) {
      return res.status(403).json({
        error: 'This feature requires a Premium subscription',
        requiresPremium: true,
      });
    }
    next();
  });
};

module.exports = { auth, premiumAuth };
