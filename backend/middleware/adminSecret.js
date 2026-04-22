const crypto = require('crypto');

const adminSecret = (req, res, next) => {
  const expectedSecret = process.env.ADMIN_SECRET;
  const providedSecret = req.get('ADMIN_SECRET');

  if (!expectedSecret) {
    return res.status(500).json({ error: 'ADMIN_SECRET is not configured' });
  }

  if (!providedSecret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const expectedBuffer = Buffer.from(expectedSecret);
  const providedBuffer = Buffer.from(providedSecret);

  const isValidSecret =
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer);

  if (!isValidSecret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
};

module.exports = { adminSecret };