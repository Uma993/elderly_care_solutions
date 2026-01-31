const express = require('express');
const router = express.Router();
const { requireAuth } = require('./auth');
const { linkElderToFamily, isConfigured } = require('../services/firebase');
const { findByPhone } = require('../data/userStore');

// POST /api/users/link-elder — family links to elder by phone (no IDs shown to user)
router.post('/link-elder', requireAuth, async (req, res) => {
  if (req.auth.role !== 'family') {
    return res.status(403).json({ message: 'Only family members can link to an elder.' });
  }
  const elderPhone = req.body?.elderPhone;
  if (elderPhone == null || typeof elderPhone !== 'string') {
    return res.status(400).json({ message: 'Elder\'s phone number is required.' });
  }
  const elder = findByPhone(elderPhone.trim());
  if (!elder) {
    return res.status(404).json({ message: 'No elder found with this phone number.' });
  }
  if (elder.role !== 'elderly') {
    return res.status(400).json({ message: 'No elder found with this phone number.' });
  }
  const sonUserId = req.auth.userId;
  if (sonUserId === elder.id) {
    return res.status(400).json({ message: 'Cannot link to yourself.' });
  }
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Firestore not configured.' });
  }
  try {
    await linkElderToFamily(sonUserId, elder.id);
    return res.json({
      message: 'Linked to elder successfully.',
      elderName: elder.fullName || elder.full_name || 'Elder'
    });
  } catch (err) {
    console.warn('link-elder failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to link to elder.' });
  }
});

module.exports = router;
