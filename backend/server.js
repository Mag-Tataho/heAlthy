
// Auto-create demo accounts if they don't exist
const autoSeed = async () => {
  try {
    const User = require('./models/User');
    const exists = await User.findOne({ email: 'free@test.com' });
    if (!exists) {
      await User.create({ name: 'Free User', email: 'free@test.com', password: 'password123', isPremium: false,
        profile: { age: 25, gender: 'male', height: 170, weight: 70, activityLevel: 'moderate', goal: 'maintain', currency: 'PHP' }
      });
      await User.create({ name: 'Premium User', email: 'premium@test.com', password: 'password123', isPremium: true,
        profile: { age: 25, gender: 'female', height: 165, weight: 60, activityLevel: 'active', goal: 'lose_weight', currency: 'PHP' }
      });
      console.log('✅ Demo accounts created (free@test.com / premium@test.com — password: password123)');
    }
  } catch (err) {
    // Silent fail — demo accounts optional
  }
};
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Global rate limit
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Routes
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/profile',      require('./routes/profile'));
app.use('/api/progress',     require('./routes/progress'));
app.use('/api/food',         require('./routes/food'));
app.use('/api/ai',           require('./routes/ai'));
app.use('/api/custom-meals', require('./routes/customMeals'));
app.use('/api/friends',      require('./routes/friends'));
app.use('/api/social',       require('./routes/social'));
app.use('/api/messages',     require('./routes/messages'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'heAlthy' }));

// MongoDB + listen
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await autoSeed();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => { console.error('❌ MongoDB connection failed:', err); process.exit(1); });
