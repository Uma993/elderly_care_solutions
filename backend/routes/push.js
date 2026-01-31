const express = require('express');
const router = express.Router();
const { requireAuth } = require('./auth');
const { saveSubscription } = require('../data/pushSubscriptions');

/** GET /api/push-vapid-public — returns VAPID public key for frontend subscribe */
router.get('/push-vapid-public', (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(503).json({ message: 'Web Push not configured (VAPID_PUBLIC_KEY missing).' });
  }
  return res.json({ publicKey });
});

/** POST /api/push-subscribe — authenticated, family or elderly; saves push subscription for req.auth.userId */
router.post('/push-subscribe', requireAuth, (req, res) => {
  if (req.auth.role !== 'family' && req.auth.role !== 'elderly') {
    return res.status(403).json({ message: 'Only family or elder users can subscribe to notifications.' });
  }
  const subscription = req.body?.subscription;
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ message: 'Invalid subscription (endpoint and keys required).' });
  }
  try {
    saveSubscription(req.auth.userId, subscription);
    return res.json({ message: 'Notifications enabled.' });
  } catch (err) {
    console.warn('push-subscribe failed:', err.message);
    return res.status(500).json({ message: 'Failed to save subscription.' });
  }
});

module.exports = router;
