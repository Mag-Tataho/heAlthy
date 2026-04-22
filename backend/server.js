const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const jsonParser = express.json({ limit: '10mb' });
const origin = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({ origin, credentials: true }));
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/payments/webhook')) {
    return next();
  }

  return jsonParser(req, res, next);
});

// Global rate limit
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Routes
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/payments',     require('./routes/payments'));
app.use('/api/reports',      require('./routes/reports'));
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
  .then(() => {
    console.log('✅ MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => { console.error('❌ MongoDB connection failed:', err); process.exit(1); });
