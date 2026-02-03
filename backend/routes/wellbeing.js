const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const { requireAuth } = require('./auth');
const { addWellbeingEntry, setLastActivityAt, isConfigured } = require('../services/firebase');
const { checkAndNotifyCaregiverIfNeeded } = require('../services/wellbeing');

const VALID_VALUES = ['good', 'okay', 'not_well'];
const EMOTION_SERVICE_URL = process.env.EMOTION_SERVICE_URL || 'http://localhost:5001';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

/** POST /api/wellbeing/analyze-face — requires auth; upload image, proxy to emotion service */
router.post('/analyze-face', requireAuth, upload.single('image'), async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ success: false, message: 'No image file provided.' });
  }
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', req.file.buffer, {
    filename: req.file.originalname || 'image.jpg',
    contentType: req.file.mimetype || 'image/jpeg'
  });
  const headers = form.getHeaders();
  const body = await new Promise((resolve, reject) => {
    const chunks = [];
    form.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8')));
    form.on('end', () => resolve(Buffer.concat(chunks)));
    form.on('error', reject);
    form.resume();
  });
  try {
    const response = await fetch(`${EMOTION_SERVICE_URL}/analyze`, {
      method: 'POST',
      body,
      headers
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    return res.json(data);
  } catch (err) {
    console.warn('[Wellbeing] Emotion service error:', err.message);
    return res.status(503).json({ success: false, faceDetected: false, message: 'Emotion service temporarily unavailable.' });
  }
});

module.exports = router;
