const express = require('express');
const router = express.Router();
const { requireAuth } = require('./auth');
const { appendSosAlert, isConfigured } = require('../services/firebase');

/** POST /api/sos — elder only; records SOS alert for linked family to see */
router.post('/', requireAuth, async (req, res) => {
  if (req.auth.role !== 'elderly') {
    return res.status(403).json({ message: 'Only elders can send an SOS alert.' });
  }
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Firestore not configured.' });
  }
  const elderId = req.auth.userId;
  try {
    await appendSosAlert(elderId);
    return res.json({ message: 'SOS alert sent. Your family will be notified.' });
  } catch (err) {
    console.warn('POST sos failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to send SOS.' });
  }
});

module.exports = router;
