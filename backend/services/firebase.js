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

/**
 * Create an elder profile (family-created, elder may not have an account).
 * Creates users/{elderId} in Firestore and links to family via linkedElderIds / linkedFamilyIds.
 * @param {string} familyUserId - Node userId of the family member
 * @param {{ name: string, phone: string, age?: number, location?: string, primaryCondition?: string }} profile
 * @returns {Promise<{ elderId: string, elderName: string }>}
 */
async function createElderProfile(familyUserId, profile) {
  if (!firestore || !admin) throw new Error('Firestore not configured');
  const crypto = require('crypto');
  const name = (profile.name || '').trim();
  const phone = (profile.phone || '').trim();
  if (!name || !phone) throw new Error('Name and phone are required.');

  const elderId = crypto.randomUUID();
  const elderRef = firestore.collection('users').doc(elderId);
  const familyRef = firestore.collection('users').doc(familyUserId);

  const elderDoc = {
    id: elderId,
    fullName: name,
    name,
    phone,
    role: 'elderly',
    isProfileOnly: true,
    createdBy: familyUserId,
    linkedFamilyIds: [familyUserId],
    medicines: [],
    tasks: [],
    medicineIntakeLogs: [],
    sosAlerts: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  };
  if (profile.age != null && profile.age !== '') elderDoc.age = Number(profile.age);
  if (profile.gender != null && profile.gender !== '') elderDoc.gender = String(profile.gender).trim();
  if (profile.location != null && profile.location !== '') elderDoc.location = String(profile.location).trim();
  if (profile.primaryCondition != null && profile.primaryCondition !== '') elderDoc.primaryCondition = String(profile.primaryCondition).trim();

  const batch = firestore.batch();
  batch.set(elderRef, elderDoc);
  batch.update(familyRef, {
    linkedElderIds: admin.firestore.FieldValue.arrayUnion(elderId),
    linkedElderId: elderId
  });
  await batch.commit();
  return { elderId, elderName: name };
}

function isConfigured() {
  return !!firestore && !!auth;
}

const PROFILE_KEYS = [
  'age', 'gender', 'height', 'heightUnit', 'weight', 'weightUnit', 'bloodType',
  'location', 'primaryCondition',
  'emergencyContact1', 'emergencyContact2', 'primaryDoctor', 'preferredHospital',
  'allergies', 'dietaryRestrictions', 'mobilityAids',
  'cognitiveNotes',
  'stepsToday', 'heartRate', 'spO2', 'bloodPressure', 'sleepHours'
];

function isNonEmpty(val) {
  if (val == null) return false;
  if (typeof val === 'object') return Object.keys(val).some((k) => isNonEmpty(val[k]));
  return String(val).trim() !== '';
}

/**
 * Get elder profile fields and hasProfileAdded status.
 * @param {string} elderId
 * @returns {Promise<{ hasProfileAdded: boolean, profile: object }>}
 */
async function getElderProfile(elderId) {
  if (!firestore) return { hasProfileAdded: false, profile: {} };
  const ref = firestore.collection('users').doc(elderId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const profile = {};
  for (const k of PROFILE_KEYS) {
    if (data[k] !== undefined) profile[k] = data[k];
  }
  const hasProfileAdded = !!(
    isNonEmpty(data.age) || isNonEmpty(data.gender) || isNonEmpty(data.height) ||
    isNonEmpty(data.weight) || isNonEmpty(data.bloodType) ||
    isNonEmpty(data.emergencyContact1) || isNonEmpty(data.allergies) ||
    isNonEmpty(data.primaryDoctor)
  );
  return { hasProfileAdded, profile };
}

/**
 * Update elder profile fields (merge into existing doc).
 * @param {string} elderId
 * @param {object} data - Profile fields to update (all optional)
 */
async function updateElderProfile(elderId, data) {
  if (!firestore) throw new Error('Firestore not configured');
  const ref = firestore.collection('users').doc(elderId);
  const update = {};
  const validGenders = ['male', 'female', 'other'];
  const validBloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const validMobility = ['none', 'walker', 'wheelchair', 'cane', 'other'];
  for (const k of PROFILE_KEYS) {
    if (data[k] === undefined) continue;
    let v = data[k];
    if (k === 'age') { update[k] = (v === '' || v == null) ? null : Number(v); continue; }
    if (k === 'gender' && v) { update[k] = validGenders.includes(String(v).toLowerCase()) ? String(v).toLowerCase() : String(v).trim(); continue; }
    if (k === 'bloodType' && v) { update[k] = validBloodTypes.includes(String(v)) ? String(v) : String(v).trim(); continue; }
    if (k === 'mobilityAids' && v) { update[k] = validMobility.includes(String(v).toLowerCase()) ? String(v).toLowerCase() : String(v).trim(); continue; }
    if (k === 'height' || k === 'weight') { update[k] = v === '' || v == null ? null : (typeof v === 'number' ? v : Number(v)); continue; }
    if (['stepsToday', 'heartRate', 'spO2', 'sleepHours'].includes(k)) { update[k] = v === '' || v == null ? null : (typeof v === 'number' ? v : Number(v)); continue; }
    if (typeof v === 'string') v = v.trim();
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      const obj = {};
      for (const pk of ['name', 'relationship', 'phone']) {
        if (v[pk] !== undefined) obj[pk] = String(v[pk]).trim();
      }
      update[k] = obj;
    } else {
      update[k] = v;
    }
  }
  await ref.set(update, { merge: true });
}

/**
 * Get Fitbit tokens for an elder. Returns null if not connected.
 * @param {string} elderId
 * @returns {Promise<{ accessToken: string, refreshToken: string, fitbitUserId?: string, lastSyncAt?: string } | null>}
 */
async function getFitbitTokens(elderId) {
  if (!firestore) return null;
  const ref = firestore.collection('users').doc(elderId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  if (!data.fitbitAccessToken || !data.fitbitRefreshToken) return null;
  return {
    accessToken: data.fitbitAccessToken,
    refreshToken: data.fitbitRefreshToken,
    fitbitUserId: data.fitbitUserId || undefined,
    lastSyncAt: data.fitbitLastSyncAt || undefined
  };
}

/**
 * Store Fitbit tokens for an elder.
 * @param {string} elderId
 * @param {{ accessToken: string, refreshToken: string, fitbitUserId?: string }}
 */
async function setFitbitTokens(elderId, { accessToken, refreshToken, fitbitUserId }) {
  if (!firestore) throw new Error('Firestore not configured');
  const ref = firestore.collection('users').doc(elderId);
  const update = {
    fitbitAccessToken: accessToken,
    fitbitRefreshToken: refreshToken,
    fitbitConnectedAt: new Date().toISOString()
  };
  if (fitbitUserId) update.fitbitUserId = fitbitUserId;
  await ref.set(update, { merge: true });
}

/**
 * Clear Fitbit tokens for an elder.
 * @param {string} elderId
 */
async function clearFitbitTokens(elderId) {
  if (!firestore || !admin) throw new Error('Firestore not configured');
  const ref = firestore.collection('users').doc(elderId);
  await ref.update({
    fitbitAccessToken: admin.firestore.FieldValue.delete(),
    fitbitRefreshToken: admin.firestore.FieldValue.delete(),
    fitbitUserId: admin.firestore.FieldValue.delete(),
    fitbitConnectedAt: admin.firestore.FieldValue.delete(),
    fitbitLastSyncAt: admin.firestore.FieldValue.delete()
  });
}

/**
 * Set Fitbit last sync timestamp.
 * @param {string} elderId
 */
async function setFitbitLastSyncAt(elderId) {
  if (!firestore) return;
  const ref = firestore.collection('users').doc(elderId);
  await ref.set({ fitbitLastSyncAt: new Date().toISOString() }, { merge: true });
}

/**
 * Set last activity timestamp on an elder doc (for inactive tracker).
 * @param {string} elderId
 */
async function setLastActivityAt(elderId) {
  if (!firestore) return;
  const ref = firestore.collection('users').doc(elderId);
  await ref.set({ lastActivityAt: new Date().toISOString() }, { merge: true });
}

/**
 * Get last activity timestamp for an elder (for family dashboard).
 * @param {string} elderId
 * @returns {Promise<string|null>}
 */
async function getLastActivityAt(elderId) {
  if (!firestore) return null;
  const ref = firestore.collection('users').doc(elderId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : null;
  return data && data.lastActivityAt ? data.lastActivityAt : null;
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
 * Get linked elders for a family user (for mobile REST API). Same shape as dashboardData elders array.
 * @param {string} familyUserId
 * @returns {Promise<Array<{id,name,age,gender,location,primaryCondition,bloodType,emergencyContact1,emergencyContact2,primaryDoctor,preferredHospital,allergies,dietaryRestrictions,mobilityAids,hasProfileAdded,lastActivityAt,healthUpdates,updates,medicineIntakeLogs,tasks,sosAlerts}>>}
 */
async function getLinkedElders(familyUserId) {
  if (!firestore) return [];
  const elderIds = await getLinkedElderIds(familyUserId);
  const elders = [];
  for (const elderId of elderIds) {
    const ref = firestore.collection('users').doc(elderId);
    const snap = await ref.get();
    const elderData = snap.exists ? snap.data() : null;
    if (!elderData) continue;
    const ec1 = elderData.emergencyContact1;
    const pd = elderData.primaryDoctor;
    const hasProfileAdded = !!(
      (elderData.age != null && elderData.age !== '') ||
      (elderData.gender && String(elderData.gender).trim()) ||
      (elderData.bloodType && String(elderData.bloodType).trim()) ||
      (ec1 && ec1.name && String(ec1.name).trim()) ||
      (elderData.allergies && String(elderData.allergies).trim()) ||
      (pd && pd.name && String(pd.name).trim())
    );
    elders.push({
      id: elderId,
      name: elderData.fullName || elderData.name || '',
      age: elderData.age,
      gender: elderData.gender,
      location: elderData.location,
      primaryCondition: elderData.primaryCondition,
      bloodType: elderData.bloodType,
      emergencyContact1: elderData.emergencyContact1,
      emergencyContact2: elderData.emergencyContact2,
      primaryDoctor: elderData.primaryDoctor,
      preferredHospital: elderData.preferredHospital,
      allergies: elderData.allergies,
      dietaryRestrictions: elderData.dietaryRestrictions,
      mobilityAids: elderData.mobilityAids,
      hasProfileAdded,
      lastActivityAt: elderData.lastActivityAt || null,
      healthUpdates: Array.isArray(elderData.healthUpdates) ? elderData.healthUpdates : [],
      updates: Array.isArray(elderData.updates) ? elderData.updates : [],
      medicineIntakeLogs: Array.isArray(elderData.medicineIntakeLogs) ? elderData.medicineIntakeLogs : [],
      tasks: Array.isArray(elderData.tasks) ? elderData.tasks : [],
      sosAlerts: Array.isArray(elderData.sosAlerts) ? elderData.sosAlerts : []
    });
  }
  return elders;
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
    notes: m.notes || '',
    refillRequestedAt: m.refillRequestedAt || null,
    refillRequestedBy: m.refillRequestedBy || null,
    refillStatus: m.refillStatus || 'none',
    refillNotes: m.refillNotes || '',
    amountLeft: m.amountLeft != null ? m.amountLeft : null,
    refillReminderAt: m.refillReminderAt || null
  }));
}

/**
 * Set refill request on a medicine (family requested refill).
 * @param {string} elderId
 * @param {string} medicineId
 * @param {{ requestedBy: string, notes?: string, amountLeft?: number, refillReminderDays?: number }}
 */
async function setMedicineRefillRequest(elderId, medicineId, { requestedBy, notes, amountLeft, refillReminderDays }) {
  if (!firestore) throw new Error('Firestore not configured');
  const rawRef = firestore.collection('users').doc(elderId);
  const snap = await rawRef.get();
  const data = snap.exists ? snap.data() : {};
  const arr = Array.isArray(data.medicines) ? data.medicines : [];
  const idx = arr.findIndex((m) => m.id === medicineId);
  if (idx === -1) throw new Error('Medicine not found');
  const now = new Date().toISOString();
  let refillReminderAt = null;
  if (refillReminderDays != null && Number(refillReminderDays) > 0) {
    const d = new Date();
    d.setDate(d.getDate() + Number(refillReminderDays));
    refillReminderAt = d.toISOString().slice(0, 10);
  }
  arr[idx] = {
    ...arr[idx],
    refillRequestedAt: now,
    refillRequestedBy: requestedBy || '',
    refillStatus: 'pending',
    refillNotes: notes != null ? String(notes).trim() : (arr[idx].refillNotes || ''),
    amountLeft: amountLeft != null ? (typeof amountLeft === 'number' ? amountLeft : Number(amountLeft)) : arr[idx].amountLeft,
    refillReminderAt: refillReminderAt || arr[idx].refillReminderAt || null
  };
  await rawRef.set({ medicines: arr }, { merge: true });
}

/**
 * Update refill status and/or amount/reminder on a medicine.
 * @param {string} elderId
 * @param {string} medicineId
 * @param {{ status?: 'pending'|'ordered'|'received', notes?: string, amountLeft?: number, refillReminderAt?: string, refillReminderDays?: number }}
 */
async function updateMedicineRefillStatus(elderId, medicineId, { status, notes, amountLeft, refillReminderAt, refillReminderDays }) {
  if (!firestore) throw new Error('Firestore not configured');
  const rawRef = firestore.collection('users').doc(elderId);
  const snap = await rawRef.get();
  const data = snap.exists ? snap.data() : {};
  const arr = Array.isArray(data.medicines) ? data.medicines : [];
  const idx = arr.findIndex((m) => m.id === medicineId);
  if (idx === -1) throw new Error('Medicine not found');
  let nextRefillReminderAt = arr[idx].refillReminderAt || null;
  if (refillReminderAt != null && String(refillReminderAt).trim()) {
    nextRefillReminderAt = String(refillReminderAt).trim().slice(0, 10);
  } else if (refillReminderDays != null && Number(refillReminderDays) > 0) {
    const d = new Date();
    d.setDate(d.getDate() + Number(refillReminderDays));
    nextRefillReminderAt = d.toISOString().slice(0, 10);
  }
  arr[idx] = {
    ...arr[idx],
    refillStatus: status === 'pending' || status === 'ordered' || status === 'received' ? status : arr[idx].refillStatus,
    refillNotes: notes != null ? String(notes).trim() : (arr[idx].refillNotes || ''),
    amountLeft: amountLeft !== undefined ? (typeof amountLeft === 'number' ? amountLeft : amountLeft == null ? null : Number(amountLeft)) : arr[idx].amountLeft,
    refillReminderAt: nextRefillReminderAt
  };
  await rawRef.set({ medicines: arr }, { merge: true });
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
 * @returns {Promise<Array<{id,title,description,time,date,completed,completedAt}>>}
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
    date: t.date || '',
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
 * @returns {Promise<Array<{id,text,at,date,done,createdVia}>>}
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
    date: r.date || '',
    done: !!r.done,
    createdVia: r.createdVia || 'manual'
  }));
}

/**
 * Add a reminder to user doc.
 * @param {string} userId
 * @param {{ text: string, at: string, date?: string }} payload - at is ISO time or "HH:MM"; date is optional YYYY-MM-DD
 * @returns {Promise<{id,text,at,date,done,createdVia}>}
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
    date: payload.date || '',
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

/**
 * Add or overwrite wellbeing entry for a user for a given date (one per day).
 * Uses subcollection users/{userId}/wellbeingLog with document id = date (YYYY-MM-DD).
 * @param {string} userId
 * @param {{ date: string, value: 'good'|'okay'|'not_well' }} payload
 */
async function addWellbeingEntry(userId, payload) {
  if (!firestore) throw new Error('Firestore not configured');
  const date = (payload.date || '').slice(0, 10);
  const value = payload.value === 'good' || payload.value === 'okay' || payload.value === 'not_well' ? payload.value : 'okay';
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid date for wellbeing entry');
  const ref = firestore.collection('users').doc(userId).collection('wellbeingLog').doc(date);
  await ref.set({
    date,
    value,
    createdAt: admin?.firestore?.FieldValue?.serverTimestamp?.() || new Date().toISOString()
  });
}

/**
 * Get wellbeing entries for a user, e.g. last N days.
 * @param {string} userId
 * @param {{ days?: number }} options - default days 7
 * @returns {Promise<Array<{date,value,createdAt}>>}
 */
async function getWellbeingEntries(userId, options = {}) {
  if (!firestore) return [];
  const days = Math.min(Math.max(options.days || 7, 1), 365);
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const ref = firestore.collection('users').doc(userId).collection('wellbeingLog');
  const snap = await ref.where('date', '>=', startStr).where('date', '<=', endStr).get();
  return snap.docs.map((d) => {
    const data = d.data();
    return { date: data.date, value: data.value || 'okay', createdAt: data.createdAt };
  });
}

/**
 * Get routine summary (time-series) for an elder: medicine adherence, task completion, wellbeing per day.
 * @param {string} elderId
 * @param {string} fromDate - YYYY-MM-DD
 * @param {string} toDate - YYYY-MM-DD
 * @returns {Promise<Array<{date,medicineAdherence,taskCompletion,wellbeingDone,compositeScore}>>}
 */
async function getRoutineSummary(elderId, fromDate, toDate) {
  if (!firestore) return [];
  const ref = firestore.collection('users').doc(elderId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const medicines = Array.isArray(data.medicines) ? data.medicines : [];
  const medicineIntakeLogs = Array.isArray(data.medicineIntakeLogs) ? data.medicineIntakeLogs : [];
  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  const wellbeingRef = firestore.collection('users').doc(elderId).collection('wellbeingLog');
  const wellbeingSnap = await wellbeingRef.where('date', '>=', fromDate).where('date', '<=', toDate).get();
  const wellbeingDates = new Set(wellbeingSnap.docs.map((d) => d.data().date).filter(Boolean));
  const fromD = new Date(fromDate + 'T12:00:00');
  const toD = new Date(toDate + 'T12:00:00');
  const result = [];
  for (let d = new Date(fromD); d <= toD; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    let expectedDoses = 0;
    medicines.forEach((m) => {
      const times = Array.isArray(m.times) ? m.times : (m.time ? [m.time] : []);
      expectedDoses += times.length || 1;
    });
    const takenCount = medicineIntakeLogs.filter((log) => log.date === dateStr).length;
    const medicineAdherence = expectedDoses === 0 ? 100 : Math.min(100, Math.round((takenCount / expectedDoses) * 100));
    const dayTasks = tasks.filter((t) => (t.date || '').slice(0, 10) === dateStr);
    const totalTasks = dayTasks.length;
    const completedTasks = dayTasks.filter((t) => !!t.completed).length;
    const taskCompletion = totalTasks === 0 ? 100 : Math.min(100, Math.round((completedTasks / totalTasks) * 100));
    const wellbeingDone = wellbeingDates.has(dateStr) ? 1 : 0;
    const compositeScore = Math.round((medicineAdherence + taskCompletion) / 2);
    result.push({ date: dateStr, medicineAdherence, taskCompletion, wellbeingDone, compositeScore });
  }
  return result;
}

module.exports = {
  createUserProfile,
  createCustomToken,
  linkElderToFamily,
  createElderProfile,
  getElderProfile,
  updateElderProfile,
  getLinkedElderIds,
  getLinkedElders,
  getLinkedFamilyIds,
  getElderName,
  getElderMedicines,
  setElderMedicines,
  setMedicineRefillRequest,
  updateMedicineRefillStatus,
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
  addWellbeingEntry,
  getWellbeingEntries,
  setLastActivityAt,
  getLastActivityAt,
  getRoutineSummary,
  getFitbitTokens,
  setFitbitTokens,
  clearFitbitTokens,
  setFitbitLastSyncAt,
  isConfigured,
  get firestore() {
    return firestore;
  }
};
