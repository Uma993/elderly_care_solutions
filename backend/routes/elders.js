const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const webPush = require('web-push');
const { requireAuth } = require('./auth');
const {
  getLinkedElderIds,
  getLinkedFamilyIds,
  getElderName,
  getElderProfile,
  updateElderProfile,
  getElderMedicines,
  setElderMedicines,
  setMedicineRefillRequest,
  updateMedicineRefillStatus,
  appendMedicineIntakeLog,
  getElderTasks,
  setElderTasks,
  completeElderTask,
  getReminders,
  getChecklist,
  setLastActivityAt,
  getRoutineSummary,
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

/** Helper: elder (self) or family (linked) can access */
async function requireElderOrFamilyLinked(req, res, next) {
  const elderId = req.params.elderId;
  if (!elderId) return res.status(400).json({ message: 'Elder ID is required.' });
  if (req.auth.role === 'elderly') {
    if (req.auth.userId !== elderId) return res.status(403).json({ message: 'You can only access your own profile.' });
  } else if (req.auth.role === 'family') {
    if (!isConfigured()) return res.status(503).json({ message: 'Firestore not configured.' });
    const linkedIds = await getLinkedElderIds(req.auth.userId);
    if (!linkedIds.includes(elderId)) return res.status(403).json({ message: 'You are not linked to this elder.' });
  } else {
    return res.status(403).json({ message: 'Access denied.' });
  }
  next();
}

/** GET /api/elders/:elderId/profile — elder (self) or family (linked) */
router.get('/:elderId/profile', requireAuth, requireElderOrFamilyLinked, async (req, res) => {
  try {
    const { hasProfileAdded, profile } = await getElderProfile(req.params.elderId);
    return res.json({ hasProfileAdded, profile });
  } catch (err) {
    console.warn('GET profile failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to load profile.' });
  }
});

/** PATCH /api/elders/:elderId/profile — elder (self) or family (linked) */
router.patch('/:elderId/profile', requireAuth, requireElderOrFamilyLinked, async (req, res) => {
  try {
    await updateElderProfile(req.params.elderId, req.body || {});
    const { hasProfileAdded, profile } = await getElderProfile(req.params.elderId);
    return res.json({ message: 'Profile updated.', hasProfileAdded, profile });
  } catch (err) {
    console.warn('PATCH profile failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to update profile.' });
  }
});

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

/** POST /api/elders/:elderId/medicines/:medicineId/refill — family only (request refill) */
router.post('/:elderId/medicines/:medicineId/refill', requireAuth, requireFamilyLinkedElder, async (req, res) => {
  const elderId = req.params.elderId;
  const medicineId = req.params.medicineId;
  const notes = req.body?.notes != null ? String(req.body.notes).trim() : '';
  const amountLeft = req.body?.amountLeft != null ? Number(req.body.amountLeft) : undefined;
  const refillReminderDays = req.body?.refillReminderDays != null ? Number(req.body.refillReminderDays) : undefined;
  try {
    await setMedicineRefillRequest(elderId, medicineId, {
      requestedBy: req.auth.userId,
      notes,
      amountLeft,
      refillReminderDays
    });
    const medicines = await getElderMedicines(elderId);
    const med = medicines.find((m) => m.id === medicineId);
    // Push to elder: refill requested
    if (vapidPublicKey && vapidPrivateKey && med) {
      const elderSubs = getSubscriptionsByUserId(elderId);
      const medicineName = med.name || 'Medicine';
      const payload = JSON.stringify({
        type: 'refill_requested',
        title: 'Refill requested',
        body: `Your family requested a refill for ${medicineName}.`,
        url: '/medicines',
        data: { url: '/medicines', type: 'refill_requested', elderId, medicineId }
      });
      elderSubs.forEach(({ subscription }) => {
        webPush.sendNotification(subscription, payload).catch((pushErr) => {
          console.warn('Refill-requested push failed for elder', elderId, pushErr.message);
        });
      });
    }
    return res.status(201).json(med || { message: 'Refill requested.' });
  } catch (err) {
    if (err.message === 'Medicine not found') return res.status(404).json({ message: 'Medicine not found.' });
    console.warn('POST refill failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to request refill.' });
  }
});

/** PATCH /api/elders/:elderId/medicines/:medicineId/refill — family only (update refill status and/or amount/reminder) */
router.patch('/:elderId/medicines/:medicineId/refill', requireAuth, requireFamilyLinkedElder, async (req, res) => {
  const elderId = req.params.elderId;
  const medicineId = req.params.medicineId;
  const { status, notes, amountLeft, refillReminderAt, refillReminderDays } = req.body || {};
  const hasStatus = status === 'pending' || status === 'ordered' || status === 'received';
  const hasAmountOrReminder = amountLeft !== undefined || refillReminderAt !== undefined || refillReminderDays !== undefined;
  if (!hasStatus && !hasAmountOrReminder) {
    return res.status(400).json({ message: 'Provide status (pending/ordered/received) and/or amountLeft, refillReminderAt, refillReminderDays.' });
  }
  if (status !== undefined && !hasStatus) {
    return res.status(400).json({ message: 'Invalid status. Use pending, ordered, or received.' });
  }
  try {
    await updateMedicineRefillStatus(elderId, medicineId, {
      status: hasStatus ? status : undefined,
      notes,
      amountLeft: amountLeft !== undefined ? Number(amountLeft) : undefined,
      refillReminderAt,
      refillReminderDays: refillReminderDays != null ? Number(refillReminderDays) : undefined
    });
    const medicines = await getElderMedicines(elderId);
    const med = medicines.find((m) => m.id === medicineId);
    return res.json(med || { message: 'Refill updated.' });
  } catch (err) {
    if (err.message === 'Medicine not found') return res.status(404).json({ message: 'Medicine not found.' });
    console.warn('PATCH refill failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to update refill status.' });
  }
});

/** GET /api/elders/:elderId/routine — family (linked) or elder (self); query from, to (YYYY-MM-DD); default last 30 days */
router.get('/:elderId/routine', requireAuth, async (req, res) => {
  const elderId = req.params.elderId;
  if (!elderId) return res.status(400).json({ message: 'Elder ID is required.' });
  if (req.auth.role === 'family') {
    if (!isConfigured()) return res.status(503).json({ message: 'Firestore not configured.' });
    const linkedIds = await getLinkedElderIds(req.auth.userId);
    if (!linkedIds.includes(elderId)) return res.status(403).json({ message: 'You are not linked to this elder.' });
  } else if (req.auth.role === 'elderly') {
    if (req.auth.userId !== elderId) return res.status(403).json({ message: 'You can only view your own routine.' });
  } else {
    return res.status(403).json({ message: 'Access denied.' });
  }
  const toDate = req.query.to || new Date().toISOString().slice(0, 10);
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const to = new Date(toDate + 'T12:00:00');
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  const fromDate = from.toISOString().slice(0, 10);
  try {
    const summary = await getRoutineSummary(elderId, fromDate, toDate);
    return res.json(summary);
  } catch (err) {
    console.warn('GET routine failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to load routine.' });
  }
});

// ——— Tasks ———

/** GET /api/elders/:elderId/reminders — family (linked) or elder (self) */
router.get('/:elderId/reminders', requireAuth, async (req, res) => {
  const elderId = req.params.elderId;
  if (!elderId) return res.status(400).json({ message: 'Elder ID is required.' });
  if (req.auth.role === 'family') {
    if (!isConfigured()) return res.status(503).json({ message: 'Firestore not configured.' });
    const linkedIds = await getLinkedElderIds(req.auth.userId);
    if (!linkedIds.includes(elderId)) return res.status(403).json({ message: 'You are not linked to this elder.' });
  } else if (req.auth.role === 'elderly') {
    if (req.auth.userId !== elderId) return res.status(403).json({ message: 'You can only view your own reminders.' });
  } else {
    return res.status(403).json({ message: 'Access denied.' });
  }
  try {
    const reminders = await getReminders(elderId);
    return res.json({ reminders });
  } catch (err) {
    console.warn('GET reminders failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to load reminders.' });
  }
});

/** GET /api/elders/:elderId/checklist — family (linked) or elder (self) */
router.get('/:elderId/checklist', requireAuth, async (req, res) => {
  const elderId = req.params.elderId;
  if (!elderId) return res.status(400).json({ message: 'Elder ID is required.' });
  if (req.auth.role === 'family') {
    if (!isConfigured()) return res.status(503).json({ message: 'Firestore not configured.' });
    const linkedIds = await getLinkedElderIds(req.auth.userId);
    if (!linkedIds.includes(elderId)) return res.status(403).json({ message: 'You are not linked to this elder.' });
  } else if (req.auth.role === 'elderly') {
    if (req.auth.userId !== elderId) return res.status(403).json({ message: 'You can only view your own checklist.' });
  } else {
    return res.status(403).json({ message: 'Access denied.' });
  }
  try {
    const checklist = await getChecklist(elderId);
    return res.json({ checklist });
  } catch (err) {
    console.warn('GET checklist failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to load checklist.' });
  }
});

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
  const { title, description, time, date } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ message: 'Task title is required.' });
  }
  const taskId = crypto.randomUUID();
  const task = {
    id: taskId,
    title: String(title).trim(),
    description: description != null ? String(description).trim() : '',
    time: time != null ? String(time).trim() : '',
    date: date != null ? String(date).trim() : '',
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
  const { title, description, time, date } = req.body || {};
  try {
    const current = await getElderTasks(elderId);
    const idx = current.findIndex((t) => t.id === taskId);
    if (idx === -1) return res.status(404).json({ message: 'Task not found.' });
    if (title != null) current[idx].title = String(title).trim();
    if (description != null) current[idx].description = String(description).trim();
    if (time != null) current[idx].time = String(time).trim();
    if (date != null) current[idx].date = String(date).trim();
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
    const tasks = await getElderTasks(elderId);
    const task = tasks.find((t) => t.id === taskId);
    const taskTitle = task ? (task.title || 'Task') : 'Task';
    await completeElderTask(elderId, taskId);
    await setLastActivityAt(elderId);
    // Push to family: task completed
    if (vapidPublicKey && vapidPrivateKey) {
      const elderName = await getElderName(elderId).then((n) => n || 'Elder');
      const familyIds = await getLinkedFamilyIds(elderId);
      const payload = JSON.stringify({
        type: 'task_completed',
        title: 'Task completed',
        body: `${elderName} completed ${taskTitle}.`,
        url: '/overview',
        data: { url: '/overview', type: 'task_completed', elderId, taskId }
      });
      familyIds.forEach((familyUserId) => {
        const subs = getSubscriptionsByUserId(familyUserId);
        subs.forEach(({ subscription }) => {
          webPush.sendNotification(subscription, payload).catch((pushErr) => {
            console.warn('Task-completed push failed for', familyUserId, pushErr.message);
          });
        });
      });
    }
    return res.json({ message: 'Task marked complete.' });
  } catch (err) {
    console.warn('POST task complete failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to complete task.' });
  }
});

module.exports = router;
