require('dotenv').config();
const app = require('../app');

module.exports = async (req, res) => {
  try {
    return app(req, res);
  } catch (err) {
    console.error('❌ Vercel handler failed:', err);
    return res.status(500).json({ error: 'Server failed to initialize' });
  }
};