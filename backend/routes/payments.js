const crypto = require('crypto');
const express = require('express');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const paymongo = require('../src/config/paymongo');

const router = express.Router();

const CLIENT_URL = (process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET || '';
const WEBHOOK_TIMESTAMP_WINDOW_SECONDS = Number(process.env.PAYMONGO_WEBHOOK_TIMESTAMP_WINDOW_SECONDS || 300);

const buildClientUrl = (pathname) => {
  return new URL(pathname, `${CLIENT_URL}/`).toString();
};

const toCentavos = (amountInPesos) => {
  const numericAmount = Number(amountInPesos);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return null;
  }

  const amountInCentavos = Math.round(numericAmount * 100);
  return Number.isInteger(amountInCentavos) ? amountInCentavos : null;
};

const parseWebhookSignature = (signatureHeader = '') => {
  return signatureHeader.split(',').reduce((result, part) => {
    const [rawKey, rawValue] = part.trim().split('=');
    if (rawKey && rawValue) {
      result[rawKey.trim()] = rawValue.trim();
    }
    return result;
  }, {});
};

const timingSafeMatch = (left = '', right = '') => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const verifyWebhookSignature = (rawBodyBuffer, signatureHeader, isLiveMode) => {
  if (!PAYMONGO_WEBHOOK_SECRET) {
    throw new Error('PAYMONGO_WEBHOOK_SECRET is required');
  }

  const signatureParts = parseWebhookSignature(signatureHeader);
  const timestamp = signatureParts.t;
  const expectedSignature = isLiveMode ? signatureParts.li : signatureParts.te;

  if (!timestamp || !expectedSignature) {
    return false;
  }

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowInSeconds - timestampNumber) > WEBHOOK_TIMESTAMP_WINDOW_SECONDS) {
    return false;
  }

  const payload = `${timestamp}.${rawBodyBuffer.toString('utf8')}`;
  const computedSignature = crypto
    .createHmac('sha256', PAYMONGO_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return timingSafeMatch(computedSignature, expectedSignature);
};

const grantPremiumToUser = async (userId) => {
  return User.findByIdAndUpdate(
    userId,
    {
      $set: {
        isPremium: true,
        premiumGrantedAt: new Date(),
        premiumGrantedBy: 'paymongo',
      },
    },
    { new: true, runValidators: true }
  );
};

const createPaymentCharge = async (paymentRecord) => {
  const { data } = await paymongo.post('/payments', {
    data: {
      attributes: {
        amount: paymentRecord.amount,
        currency: 'PHP',
        description: 'heAlthy Premium purchase',
        source: {
          id: paymentRecord.sourceId,
          type: 'source',
        },
        metadata: {
          payment_id: String(paymentRecord._id),
          user_id: String(paymentRecord.userId),
        },
      },
    },
  }, {
    headers: {
      'Idempotency-Key': `qrph-payment-${paymentRecord.sourceId}`,
    },
  });

  return data?.data;
};

const markPaymentPaid = async (paymentRecord, paymentResource) => {
  paymentRecord.paymentId = paymentResource?.id || paymentRecord.paymentId;
  paymentRecord.status = 'paid';
  paymentRecord.paidAt = new Date(paymentResource?.attributes?.paid_at ? paymentResource.attributes.paid_at * 1000 : Date.now());
  await paymentRecord.save();
  await grantPremiumToUser(paymentRecord.userId);
};

router.post('/create-qrph-source', auth, async (req, res) => {
  try {
    const { amount, userId } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (String(userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'User mismatch' });
    }

    const amountInCentavos = toCentavos(amount);
    if (!amountInCentavos) {
      return res.status(400).json({ error: 'amount must be a positive number in Philippine pesos' });
    }

    if (amountInCentavos < 2000) {
      return res.status(400).json({ error: 'amount must be at least PHP 20.00' });
    }

    const payload = {
      data: {
        attributes: {
          amount: amountInCentavos,
          currency: 'PHP',
          type: 'qrph',
          redirect: {
            success: buildClientUrl('/payment/success'),
            failed: buildClientUrl('/payment/failed'),
          },
          metadata: {
            user_id: String(req.user._id),
            purpose: 'premium_upgrade',
          },
        },
      },
    };

    const { data } = await paymongo.post('/sources', payload, {
      headers: {
        'Idempotency-Key': `qrph-source-${req.user._id}-${amountInCentavos}`,
      },
    });
    const source = data?.data;

    if (!source?.id) {
      throw new Error('PayMongo did not return a source object');
    }

    await Payment.findOneAndUpdate(
      { sourceId: source.id },
      {
        $setOnInsert: {
          userId: req.user._id,
          sourceId: source.id,
          amount: amountInCentavos,
          status: 'pending',
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(201).json(source);
  } catch (err) {
    const message = err.response?.data?.errors?.[0]?.detail || err.message || 'Unable to create QRPH source';
    return res.status(err.response?.status || 500).json({ error: message });
  }
});

router.get('/status/:sourceId', auth, async (req, res) => {
  try {
    const { sourceId } = req.params;

    if (!sourceId) {
      return res.status(400).json({ error: 'sourceId is required' });
    }

    const paymentRecord = await Payment.findOne({ sourceId }).select('userId status');

    if (!paymentRecord) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (String(paymentRecord.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Payment does not belong to the current user' });
    }

    return res.json({
      status: paymentRecord.status,
      isPremium: Boolean(req.user.isPremium),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unable to fetch payment status' });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signatureHeader = req.get('Paymongo-Signature');
    if (!signatureHeader) {
      return res.status(403).json({ error: 'Missing webhook signature' });
    }

    const rawBodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    const rawBodyText = rawBodyBuffer.toString('utf8');
    const eventPayload = JSON.parse(rawBodyText || '{}');
    const event = eventPayload?.data?.attributes || {};
    const eventType = event.type;
    const eventData = event.data || {};
    const isLiveMode = Boolean(event.livemode);

    if (!verifyWebhookSignature(rawBodyBuffer, signatureHeader, isLiveMode)) {
      return res.status(403).json({ error: 'Invalid webhook signature' });
    }

    if (eventType === 'source.chargeable') {
      const sourceId = eventData.id;
      const paymentRecord = await Payment.findOne({ sourceId });

      if (!paymentRecord) {
        return res.status(200).json({ message: 'SUCCESS' });
      }

      if (paymentRecord.status === 'paid') {
        return res.status(200).json({ message: 'SUCCESS' });
      }

      if (!paymentRecord.paymentId) {
        const paymentResource = await createPaymentCharge(paymentRecord);
        paymentRecord.paymentId = paymentResource?.id || paymentRecord.paymentId;
        paymentRecord.status = paymentResource?.attributes?.status || paymentRecord.status;

        if (paymentResource?.attributes?.status === 'paid') {
          await markPaymentPaid(paymentRecord, paymentResource);
        } else {
          await paymentRecord.save();
        }
      }

      return res.status(200).json({ message: 'SUCCESS' });
    }

    if (eventType === 'payment.paid') {
      const paymentId = eventData.id;
      const sourceId = eventData.attributes?.source?.id;
      const paymentRecord = await Payment.findOne({
        $or: [{ paymentId }, { sourceId }],
      });

      if (!paymentRecord) {
        return res.status(200).json({ message: 'SUCCESS' });
      }

      if (paymentRecord.status !== 'paid') {
        await markPaymentPaid(paymentRecord, eventData);
      }

      return res.status(200).json({ message: 'SUCCESS' });
    }

    return res.status(200).json({ message: 'SUCCESS' });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    if (err.message === 'PAYMONGO_WEBHOOK_SECRET is required') {
      return res.status(500).json({ error: err.message });
    }

    return res.status(500).json({ error: err.message || 'Webhook processing failed' });
  }
});

module.exports = router;