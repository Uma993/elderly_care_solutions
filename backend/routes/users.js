const express = require('express');
const router = express.Router();
const { requireAuth } = require('./auth');
const { linkElderToFamily, isConfigured } = require('../services/firebase');

// POST /api/users/link-elder — family user links to an elder (sets linkedElderId on son, linkedFamilyIds on elder)
router.post('/link-elder', requireAuth, async (req, res) => {
  if (req.auth.role !== 'family') {
    return res.status(403).json({ message: 'Only family members can link to an elder.' });
  }
  const elderUserId = req.body?.elderUserId;
  if (!elderUserId || typeof elderUserId !== 'string') {
    return res.status(400).json({ message: 'elderUserId (string) is required.' });
  }
  const sonUserId = req.auth.userId;
  if (sonUserId === elderUserId) {
    return res.status(400).json({ message: 'Cannot link to yourself.' });
  }
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Firestore not configured.' });
  }
  try {
    await linkElderToFamily(sonUserId, elderUserId.trim());
    return res.json({ message: 'Linked to elder successfully.', elderUserId: elderUserId.trim() });
  } catch (err) {
    console.warn('link-elder failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to link to elder.' });
  }
});

module.exports = router;
