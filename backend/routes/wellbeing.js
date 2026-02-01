const express = require('express');
const router = express.Router();
const { requireAuth } = require('./auth');
const { addWellbeingEntry, setLastActivityAt, isConfigured } = require('../services/firebase');
const { checkAndNotifyCaregiverIfNeeded } = require('../services/wellbeing');

const VALID_VALUES = ['good', 'okay', 'not_well'];

/** POST /api/wellbeing/check — elder only; record daily wellbeing and notify caregiver if "not_well" repeatedly */
router.post('/check', requireAuth, async (req, res) => {
  if (req.auth.role !== 'elderly') {
    return res.status(403).json({ message: 'Only elders can submit a wellbeing check.' });
  }
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Firestore not configured.' });
  }
  const value = (req.body?.value || '').toLowerCase().trim();
  if (!VALID_VALUES.includes(value)) {
    return res.status(400).json({ message: 'Invalid value. Use good, okay, or not_well.' });
  }
  const userId = req.auth.userId;
  const date = new Date().toISOString().slice(0, 10);
  try {
    await addWellbeingEntry(userId, { date, value });
    await setLastActivityAt(userId);
    await checkAndNotifyCaregiverIfNeeded(userId);
    return res.json({ ok: true, date, value });
  } catch (err) {
    console.warn('POST wellbeing/check failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to save wellbeing check.' });
  }
});

module.exports = router;
