const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const app = express();
const jsonParser = express.json({ limit: '10mb' });

const parseOrigins = (value = '') => {
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const allowedOrigins = [
  ...parseOrigins(process.env.CORS_ORIGINS),
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
}));

app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/payments/webhook')) {
    return next();
  }

  return jsonParser(req, res, next);
});

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/food', require('./routes/food'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/custom-meals', require('./routes/customMeals'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/social', require('./routes/social'));
app.use('/api/messages', require('./routes/messages'));

app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok', app: 'heAlthy' });
});

module.exports = app;