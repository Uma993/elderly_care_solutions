/**
 * Firebase Admin SDK: Firestore writes and custom token issuance.
 * Node is the only authority; this service creates users/{userId} on register
 * and issues custom tokens so the frontend can use Firestore with auth.uid.
 * If credentials are not configured, operations no-op (graceful fallback).
 */

let admin = null;
let firestore = null;
let auth = null;

try {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (credentialsPath || serviceAccountJson) {
    admin = require('firebase-admin');
    if (admin.apps.length === 0) {
      if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      } else {
        admin.initializeApp();
      }
    }
    firestore = admin.firestore();
    auth = admin.auth();
  }
} catch (err) {
  console.warn('Firebase Admin not configured:', err.message);
}

/**
 * Create or overwrite users/{userId} in Firestore with profile data.
 * Called by auth route after Node creates the user.
 * @param {string} userId - Same id as in Node userStore
 * @param {object} profile - Sanitized profile (id, fullName, email, role, phone, relation)
 * @returns {Promise<void>}
 */
async function createUserProfile(userId, profile) {
  if (!firestore || !admin) return;
  const ref = firestore.collection('users').doc(userId);
  await ref.set({
    ...profile,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Create a Firebase custom token so the frontend can signInWithCustomToken
 * and Firestore rules can use request.auth.uid === userId.
 * @param {string} userId - Same id as in Node userStore
 * @returns {Promise<string|null>} Custom token or null if Auth not configured
 */
async function createCustomToken(userId) {
  if (!auth) return null;
  return auth.createCustomToken(userId);
}

/**
 * Link a family user (son) to an elder. Appends elder to son's linkedElderIds and adds son to elder's linkedFamilyIds.
 * @param {string} sonUserId - Node userId of the family member (caller)
 * @param {string} elderUserId - Node userId (document id) of the elder in users collection
 * @returns {Promise<void>}
 */
async function linkElderToFamily(sonUserId, elderUserId) {
  if (!firestore || !admin) throw new Error('Firestore not configured');
  const batch = firestore.batch();
  const sonRef = firestore.collection('users').doc(sonUserId);
  const elderRef = firestore.collection('users').doc(elderUserId);
  batch.update(sonRef, {
    linkedElderIds: admin.firestore.FieldValue.arrayUnion(elderUserId),
    linkedElderId: elderUserId
  });
  batch.update(elderRef, {
    linkedFamilyIds: admin.firestore.FieldValue.arrayUnion(sonUserId)
  });
  await batch.commit();
}

function isConfigured() {
  return !!firestore && !!auth;
}

/**
 * Get linked elder ids for a family user (from Firestore). Supports linkedElderIds array or legacy linkedElderId.
 * @param {string} familyUserId
 * @returns {Promise<string[]>}
 */
async function getLinkedElderIds(familyUserId) {
  if (!firestore) return [];
  const ref = firestore.collection('users').doc(familyUserId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;
  if (!data) return [];
  if (Array.isArray(data.linkedElderIds) && data.linkedElderIds.length > 0) {
    return data.linkedElderIds.filter((id) => typeof id === 'string' && id.trim());
  }
  if (data.linkedElderId && typeof data.linkedElderId === 'string' && data.linkedElderId.trim()) {
    return [data.linkedElderId.trim()];
  }
  return [];
}

/**
 * Get linked family user ids for an elder (from Firestore elder doc linkedFamilyIds).
 * @param {string} elderId
 * @returns {Promise<string[]>}
 */
async function getLinkedFamilyIds(elderId) {
  if (!firestore) return [];
  const ref = firestore.collection('users').doc(elderId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const ids = Array.isArray(data.linkedFamilyIds) ? data.linkedFamilyIds : [];
  return ids.filter((id) => typeof id === 'string' && id.trim());
}

/**
 * Get elder display name from Firestore user doc.
 * @param {string} elderId
 * @returns {Promise<string>}
 */
async function getElderName(elderId) {
  if (!firestore) return 'Elder';
  const ref = firestore.collection('users').doc(elderId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  return data.fullName || data.name || 'Elder';
}

/**
 * Get medicines array from elder doc. Returns [] if missing.
 * @param {string} elderId
 * @returns {Promise<Array<{id,name,dosage,time,notes}>>}
 */
async function getElderMedicines(elderId) {
  if (!firestore) return [];
  const ref = firestore.collection('users').doc(elderId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;
  const arr = data && Array.isArray(data.medicines) ? data.medicines : [];
  return arr.map((m) => ({
    id: m.id,
    name: m.name || '',
    dosage: m.dosage || '',
    time: m.time || '',
    notes: m.notes || ''
  }));
}

/**
 * Update elder doc with new medicines array (replace entire array).
 * @param {string} elderId
 * @param {Array<{id,name,dosage,time,notes}>} medicines
 */
async function setElderMedicines(elderId, medicines) {
  if (!firestore) throw new Error('Firestore not configured');
  const ref = firestore.collection('users').doc(elderId);
  await ref.set({ medicines }, { merge: true });
}

/**
 * Append one entry to elder's medicineIntakeLogs. Creates array if missing.
 * @param {string} elderId
 * @param {{ medicineId: string, medicineName?: string, time?: string }} entry - time ISO string; defaults to now
 */
async function appendMedicineIntakeLog(elderId, entry) {
  if (!firestore) throw new Error('Firestore not configured');
  const ref = firestore.collection('users').doc(elderId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const logs = Array.isArray(data.medicineIntakeLogs) ? data.medicineIntakeLogs : [];
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  logs.push({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    medicineId: entry.medicineId,
    medicineName: entry.medicineName || '',
    time: entry.time || now.toISOString(),
    date
  });
  await ref.set({ medicineIntakeLogs: logs }, { merge: true });
}

/**
 * Get tasks array from elder doc. Returns [] if missing.
 * @param {string} elderId
 * @returns {Promise<Array<{id,title,description,time,completed,completedAt}>>}
 */
async function getElderTasks(elderId) {
  if (!firestore) return [];
  const ref = firestore.collection('users').doc(elderId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;
  const arr = data && Array.isArray(data.tasks) ? data.tasks : [];
  return arr.map((t) => ({
    id: t.id,
    title: t.title || '',
    description: t.description || '',
    time: t.time || '',
    completed: !!t.completed,
    completedAt: t.completedAt || null
  }));
}

/**
 * Replace elder doc tasks array.
 * @param {string} elderId
 * @param {Array<{id,title,description,time,completed,completedAt}>} tasks
 */
async function setElderTasks(elderId, tasks) {
  if (!firestore) throw new Error('Firestore not configured');
  const ref = firestore.collection('users').doc(elderId);
  await ref.set({ tasks }, { merge: true });
}

/**
 * Mark one task complete (set completed true, completedAt now).
 * @param {string} elderId
 * @param {string} taskId
 */
async function completeElderTask(elderId, taskId) {
  if (!firestore) throw new Error('Firestore not configured');
  const ref = firestore.collection('users').doc(elderId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) throw new Error('Task not found');
  const now = new Date().toISOString();
  tasks[idx] = { ...tasks[idx], completed: true, completedAt: now };
  await ref.set({ tasks }, { merge: true });
}

/**
 * Append an SOS alert to elder's doc. Reads elder name from doc, appends { id, time, elderName, location? } to sosAlerts.
 * @param {string} elderId
 * @param {{ lat?: number, lng?: number }} [options] - optional location
 * @returns {Promise<{ elderName: string, alert: object }>}
 */
async function appendSosAlert(elderId, options = {}) {
  if (!firestore) throw new Error('Firestore not configured');
  const ref = firestore.collection('users').doc(elderId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const elderName = data.fullName || data.name || 'Elder';
  const alerts = Array.isArray(data.sosAlerts) ? data.sosAlerts : [];
  const entry = {
    id: `sos-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    time: new Date().toISOString(),
    elderName
  };
  if (options.lat != null && options.lng != null) {
    entry.location = { lat: options.lat, lng: options.lng };
  }
  alerts.push(entry);
  await ref.set({ sosAlerts: alerts }, { merge: true });
  return { elderName, alert: entry };
}

/**
 * Get reminders array from user doc. Returns [] if missing.
 * @param {string} userId
 * @returns {Promise<Array<{id,text,at,done,createdVia}>>}
 */
async function getReminders(userId) {
  if (!firestore) return [];
  const ref = firestore.collection('users').doc(userId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;
  const arr = data && Array.isArray(data.reminders) ? data.reminders : [];
  return arr.map((r) => ({
    id: r.id,
    text: r.text || '',
    at: r.at || '',
    done: !!r.done,
    createdVia: r.createdVia || 'manual'
  }));
}

/**
 * Add a reminder to user doc.
 * @param {string} userId
 * @param {{ text: string, at: string }} payload - at is ISO time or "HH:MM"
 * @returns {Promise<{id,text,at,done,createdVia}>}
 */
async function addReminder(userId, payload) {
  if (!firestore) throw new Error('Firestore not configured');
  const ref = firestore.collection('users').doc(userId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const reminders = Array.isArray(data.reminders) ? data.reminders : [];
  const id = `rem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const entry = {
    id,
    text: payload.text || '',
    at: payload.at || '',
    done: false,
    createdVia: payload.createdVia || 'manual'
  };
  reminders.push(entry);
  await ref.set({ reminders }, { merge: true });
  return entry;
}

/**
 * Update a reminder (e.g. set done).
 * @param {string} userId
 * @param {string} reminderId
 * @param {object} updates - e.g. { done: true }
 */
async function updateReminder(userId, reminderId, updates) {
  if (!firestore) throw new Error('Firestore not configured');
  const ref = firestore.collection('users').doc(userId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const reminders = Array.isArray(data.reminders) ? data.reminders : [];
  const idx = reminders.findIndex((r) => r.id === reminderId);
  if (idx === -1) return;
  reminders[idx] = { ...reminders[idx], ...updates };
  await ref.set({ reminders }, { merge: true });
}

/**
 * Get checklist array from user doc. Returns [] if missing.
 * @param {string} userId
 * @returns {Promise<Array<{id,text,done,createdAt}>>}
 */
async function getChecklist(userId) {
  if (!firestore) return [];
  const ref = firestore.collection('users').doc(userId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;
  const arr = data && Array.isArray(data.checklist) ? data.checklist : [];
  return arr.map((c) => ({
    id: c.id,
    text: c.text || '',
    done: !!c.done,
    createdAt: c.createdAt || ''
  }));
}

/**
 * Add a checklist item to user doc.
 * @param {string} userId
 * @param {{ text: string }} payload
 * @returns {Promise<{id,text,done,createdAt}>}
 */
async function addChecklistItem(userId, payload) {
  if (!firestore) throw new Error('Firestore not configured');
  const ref = firestore.collection('users').doc(userId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const checklist = Array.isArray(data.checklist) ? data.checklist : [];
  const id = `todo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const entry = { id, text: payload.text || '', done: false, createdAt: now };
  checklist.push(entry);
  await ref.set({ checklist }, { merge: true });
  return entry;
}

/**
 * Toggle checklist item done.
 * @param {string} userId
 * @param {string} itemId
 */
async function toggleChecklistItem(userId, itemId) {
  if (!firestore) throw new Error('Firestore not configured');
  const ref = firestore.collection('users').doc(userId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const checklist = Array.isArray(data.checklist) ? data.checklist : [];
  const idx = checklist.findIndex((c) => c.id === itemId);
  if (idx === -1) return;
  checklist[idx] = { ...checklist[idx], done: !checklist[idx].done };
  await ref.set({ checklist }, { merge: true });
}

/**
 * Delete a checklist item.
 * @param {string} userId
 * @param {string} itemId
 */
async function deleteChecklistItem(userId, itemId) {
  if (!firestore) throw new Error('Firestore not configured');
  const ref = firestore.collection('users').doc(userId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const checklist = Array.isArray(data.checklist) ? data.checklist : [];
  const filtered = checklist.filter((c) => c.id !== itemId);
  if (filtered.length === checklist.length) return;
  await ref.set({ checklist: filtered }, { merge: true });
}

module.exports = {
  createUserProfile,
  createCustomToken,
  linkElderToFamily,
  getLinkedElderIds,
  getLinkedFamilyIds,
  getElderName,
  getElderMedicines,
  setElderMedicines,
  appendMedicineIntakeLog,
  getElderTasks,
  setElderTasks,
  completeElderTask,
  appendSosAlert,
  getReminders,
  addReminder,
  updateReminder,
  getChecklist,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  isConfigured,
  get firestore() {
    return firestore;
  }
};
