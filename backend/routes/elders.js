const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const webPush = require('web-push');
const { requireAuth } = require('./auth');
const {
  getLinkedElderIds,
  getLinkedFamilyIds,
  getElderName,
  getElderMedicines,
  setElderMedicines,
  appendMedicineIntakeLog,
  getElderTasks,
  setElderTasks,
  completeElderTask,
  isConfigured
} = require('../services/firebase');
const { getSubscriptionsByUserId } = require('../data/pushSubscriptions');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails('mailto:support@elderlycare.example', vapidPublicKey, vapidPrivateKey);
}

/** Middleware: require caller to be family and elderId in linkedElderIds */
async function requireFamilyLinkedElder(req, res, next) {
  if (req.auth.role !== 'family') {
    return res.status(403).json({ message: 'Only family members can manage this elder.' });
  }
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Firestore not configured.' });
  }
  const elderId = req.params.elderId;
  const linkedIds = await getLinkedElderIds(req.auth.userId);
  if (!linkedIds.includes(elderId)) {
    return res.status(403).json({ message: 'You are not linked to this elder.' });
  }
  next();
}

/** Middleware: require caller to be elder and elderId === caller */
function requireElderSelf(req, res, next) {
  if (req.auth.role !== 'elderly') {
    return res.status(403).json({ message: 'Only the elder can perform this action.' });
  }
  if (req.auth.userId !== req.params.elderId) {
    return res.status(403).json({ message: 'You can only update your own data.' });
  }
  next();
}

/** GET /api/elders/:elderId/medicines — family (linked) or elder (self) */
router.get('/:elderId/medicines', requireAuth, async (req, res) => {
  const elderId = req.params.elderId;
  if (!elderId) {
    return res.status(400).json({ message: 'Elder ID is required.' });
  }
  if (req.auth.role === 'family') {
    if (!isConfigured()) {
      return res.status(503).json({ message: 'Firestore not configured.' });
    }
    const linkedIds = await getLinkedElderIds(req.auth.userId);
    if (!linkedIds.includes(elderId)) {
      return res.status(403).json({ message: 'You are not linked to this elder.' });
    }
  } else if (req.auth.role === 'elderly') {
    if (req.auth.userId !== elderId) {
      return res.status(403).json({ message: 'You can only view your own medicines.' });
    }
  } else {
    return res.status(403).json({ message: 'Access denied.' });
  }
  try {
    const medicines = await getElderMedicines(elderId);
    return res.json({ medicines });
  } catch (err) {
    console.warn('GET medicines failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to load medicines.' });
  }
});

/** POST /api/elders/:elderId/medicines — family only */
router.post('/:elderId/medicines', requireAuth, requireFamilyLinkedElder, async (req, res) => {
  const elderId = req.params.elderId;
  const { name, dosage, time, notes } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Medicine name is required.' });
  }
  const medicineId = crypto.randomUUID();
  const medicine = {
    id: medicineId,
    name: String(name).trim(),
    dosage: dosage != null ? String(dosage).trim() : '',
    time: time != null ? String(time).trim() : '',
    notes: notes != null ? String(notes).trim() : ''
  };
  try {
    const current = await getElderMedicines(elderId);
    current.push(medicine);
    await setElderMedicines(elderId, current);
    return res.status(201).json(medicine);
  } catch (err) {
    console.warn('POST medicine failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to add medicine.' });
  }
});

/** PUT /api/elders/:elderId/medicines/:medicineId — family only */
router.put('/:elderId/medicines/:medicineId', requireAuth, requireFamilyLinkedElder, async (req, res) => {
  const elderId = req.params.elderId;
  const medicineId = req.params.medicineId;
  const { name, dosage, time, notes } = req.body || {};
  try {
    const current = await getElderMedicines(elderId);
    const idx = current.findIndex((m) => m.id === medicineId);
    if (idx === -1) {
      return res.status(404).json({ message: 'Medicine not found.' });
    }
    if (name != null) current[idx].name = String(name).trim();
    if (dosage != null) current[idx].dosage = String(dosage).trim();
    if (time != null) current[idx].time = String(time).trim();
    if (notes != null) current[idx].notes = String(notes).trim();
    await setElderMedicines(elderId, current);
    return res.json(current[idx]);
  } catch (err) {
    console.warn('PUT medicine failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to update medicine.' });
  }
});

/** DELETE /api/elders/:elderId/medicines/:medicineId — family only */
router.delete('/:elderId/medicines/:medicineId', requireAuth, requireFamilyLinkedElder, async (req, res) => {
  const elderId = req.params.elderId;
  const medicineId = req.params.medicineId;
  try {
    const current = await getElderMedicines(elderId);
    const filtered = current.filter((m) => m.id !== medicineId);
    if (filtered.length === current.length) {
      return res.status(404).json({ message: 'Medicine not found.' });
    }
    await setElderMedicines(elderId, filtered);
    return res.status(204).send();
  } catch (err) {
    console.warn('DELETE medicine failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to delete medicine.' });
  }
});

/** POST /api/elders/:elderId/medicines/:medicineId/taken — elder only (self) */
router.post('/:elderId/medicines/:medicineId/taken', requireAuth, requireElderSelf, async (req, res) => {
  const elderId = req.params.elderId;
  const medicineId = req.params.medicineId;
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Firestore not configured.' });
  }
  try {
    const medicines = await getElderMedicines(elderId);
    const med = medicines.find((m) => m.id === medicineId);
    const medicineName = med ? med.name : '';
    await appendMedicineIntakeLog(elderId, {
      medicineId,
      medicineName,
      time: req.body?.time || undefined
    });
    if (vapidPublicKey && vapidPrivateKey && medicineName) {
      const elderName = await getElderName(elderId);
      const familyIds = await getLinkedFamilyIds(elderId);
      const title = 'Medicine taken';
      const body = `${elderName} took ${medicineName}.`;
      const payload = JSON.stringify({
        type: 'medicine',
        title,
        body,
        url: '/',
        data: { url: '/', type: 'medicine', elderId, medicineId, medicineName }
      });
      for (const familyUserId of familyIds) {
        const subs = getSubscriptionsByUserId(familyUserId);
        for (const { subscription } of subs) {
          webPush.sendNotification(subscription, payload).catch((pushErr) => {
            console.warn('Medicine-taken push failed for', familyUserId, pushErr.message);
          });
        }
      }
    }
    return res.json({ message: 'Marked as taken.' });
  } catch (err) {
    console.warn('POST medicine taken failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to record intake.' });
  }
});

// ——— Tasks ———

/** GET /api/elders/:elderId/tasks — family (linked) or elder (self) */
router.get('/:elderId/tasks', requireAuth, async (req, res) => {
  const elderId = req.params.elderId;
  if (!elderId) return res.status(400).json({ message: 'Elder ID is required.' });
  if (req.auth.role === 'family') {
    if (!isConfigured()) return res.status(503).json({ message: 'Firestore not configured.' });
    const linkedIds = await getLinkedElderIds(req.auth.userId);
    if (!linkedIds.includes(elderId)) return res.status(403).json({ message: 'You are not linked to this elder.' });
  } else if (req.auth.role === 'elderly') {
    if (req.auth.userId !== elderId) return res.status(403).json({ message: 'You can only view your own tasks.' });
  } else {
    return res.status(403).json({ message: 'Access denied.' });
  }
  try {
    const tasks = await getElderTasks(elderId);
    return res.json({ tasks });
  } catch (err) {
    console.warn('GET tasks failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to load tasks.' });
  }
});

/** POST /api/elders/:elderId/tasks — family only */
router.post('/:elderId/tasks', requireAuth, requireFamilyLinkedElder, async (req, res) => {
  const elderId = req.params.elderId;
  const { title, description, time } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ message: 'Task title is required.' });
  }
  const taskId = crypto.randomUUID();
  const task = {
    id: taskId,
    title: String(title).trim(),
    description: description != null ? String(description).trim() : '',
    time: time != null ? String(time).trim() : '',
    completed: false,
    completedAt: null
  };
  try {
    const current = await getElderTasks(elderId);
    current.push(task);
    await setElderTasks(elderId, current);
    return res.status(201).json(task);
  } catch (err) {
    console.warn('POST task failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to add task.' });
  }
});

/** PUT /api/elders/:elderId/tasks/:taskId — family only */
router.put('/:elderId/tasks/:taskId', requireAuth, requireFamilyLinkedElder, async (req, res) => {
  const elderId = req.params.elderId;
  const taskId = req.params.taskId;
  const { title, description, time } = req.body || {};
  try {
    const current = await getElderTasks(elderId);
    const idx = current.findIndex((t) => t.id === taskId);
    if (idx === -1) return res.status(404).json({ message: 'Task not found.' });
    if (title != null) current[idx].title = String(title).trim();
    if (description != null) current[idx].description = String(description).trim();
    if (time != null) current[idx].time = String(time).trim();
    await setElderTasks(elderId, current);
    return res.json(current[idx]);
  } catch (err) {
    console.warn('PUT task failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to update task.' });
  }
});

/** DELETE /api/elders/:elderId/tasks/:taskId — family only */
router.delete('/:elderId/tasks/:taskId', requireAuth, requireFamilyLinkedElder, async (req, res) => {
  const elderId = req.params.elderId;
  const taskId = req.params.taskId;
  try {
    const current = await getElderTasks(elderId);
    const filtered = current.filter((t) => t.id !== taskId);
    if (filtered.length === current.length) return res.status(404).json({ message: 'Task not found.' });
    await setElderTasks(elderId, filtered);
    return res.status(204).send();
  } catch (err) {
    console.warn('DELETE task failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to delete task.' });
  }
});

/** POST /api/elders/:elderId/tasks/:taskId/complete — elder only (self) */
router.post('/:elderId/tasks/:taskId/complete', requireAuth, requireElderSelf, async (req, res) => {
  const elderId = req.params.elderId;
  const taskId = req.params.taskId;
  if (!isConfigured()) return res.status(503).json({ message: 'Firestore not configured.' });
  try {
    await completeElderTask(elderId, taskId);
    return res.json({ message: 'Task marked complete.' });
  } catch (err) {
    console.warn('POST task complete failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to complete task.' });
  }
});

module.exports = router;
