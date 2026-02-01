const express = require('express');
const router = express.Router();
const { requireAuth } = require('./auth');
const { setLastActivityAt, isConfigured } = require('../services/firebase');

/** POST /api/activity/heartbeat — elder only; updates lastActivityAt for inactive tracker */
router.post('/heartbeat', requireAuth, async (req, res) => {
  if (req.auth.role !== 'elderly') {
    return res.status(403).json({ message: 'Only elders can send heartbeat.' });
  }
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Firestore not configured.' });
  }
  try {
    await setLastActivityAt(req.auth.userId);
    return res.json({ ok: true });
  } catch (err) {
    console.warn('POST heartbeat failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to update activity.' });
  }
});

module.exports = router;
