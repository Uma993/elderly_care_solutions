const express = require('express');
const router = express.Router();
const { requireAuth } = require('./auth');
const { linkElderToFamily, createElderProfile, getLinkedElders, isConfigured } = require('../services/firebase');
const { findByPhone } = require('../data/userStore');

// GET /api/users/me/elders — family only; returns linked elders (for mobile REST client)
router.get('/me/elders', requireAuth, async (req, res) => {
  if (req.auth.role !== 'family') {
    return res.status(403).json({ message: 'Only family members can list linked elders.' });
  }
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Firestore not configured.' });
  }
  try {
    const elders = await getLinkedElders(req.auth.userId);
    return res.json({ elders });
  } catch (err) {
    console.warn('get me/elders failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to load elders.' });
  }
});

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

// POST /api/users/add-elder-profile — family creates an elder profile (elder may not have an account)
router.post('/add-elder-profile', requireAuth, async (req, res) => {
  if (req.auth.role !== 'family') {
    return res.status(403).json({ message: 'Only family members can add elder profiles.' });
  }
  const { name, phone, age, gender, location, primaryCondition } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Name is required.' });
  }
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ message: 'Phone is required.' });
  }
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Firestore not configured.' });
  }
  try {
    const { elderId, elderName } = await createElderProfile(req.auth.userId, {
      name: name.trim(),
      phone: phone.trim(),
      age,
      gender,
      location,
      primaryCondition
    });
    return res.json({
      elderId,
      elderName,
      message: 'Elder profile added successfully.'
    });
  } catch (err) {
    console.warn('add-elder-profile failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to add elder profile.' });
  }
});

module.exports = router;
