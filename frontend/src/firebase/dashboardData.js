import { doc, getDoc } from 'firebase/firestore';
import { db } from './config.js';
import { ensureSignedIn } from './authFirebase.js';

/**
 * Load elder dashboard data from users/{userId}.
 * Node is the only authority; userId comes from Node (currentUser.id).
 * Optionally signs in with custom token so Firestore rules allow read.
 */
export async function getElderDashboardData(userId, token) {
  if (!db || !userId) {
    throw new Error('Firebase or userId not configured');
  }
  if (token) {
    try {
      await ensureSignedIn(token);
    } catch (err) {
      throw err;
    }
  }
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const data = userSnap.exists() ? userSnap.data() : null;
  const elder = data ? { id: userSnap.id, ...data } : null;
  const medicines = (data && Array.isArray(data.medicines) ? data.medicines : []).map((m) =>
    typeof m === 'object' && m !== null ? { id: m.id || m.name, ...m } : { id: m, name: String(m) }
  );
  const updates = data && Array.isArray(data.updates) ? data.updates : [];
  const medicineIntakeLogs = data && Array.isArray(data.medicineIntakeLogs) ? data.medicineIntakeLogs : [];
  const tasks = (data && Array.isArray(data.tasks) ? data.tasks : []).map((t) => ({
    id: t.id,
    title: t.title || '',
    description: t.description || '',
    time: t.time || '',
    completed: !!t.completed,
    completedAt: t.completedAt || null
  }));

  return {
    elder,
    medicines,
    updates,
    medicineIntakeLogs,
    tasks
  };
}

/**
 * Load family dashboard data. If the current user (family) has linkedElderIds (or linkedElderId) in their doc,
 * loads each linked elder's doc for overview, healthUpdates, medicineIntakeLogs.
 * Returns an array of elders so the UI can list/select one.
 */
export async function getFamilyDashboardData(userId, token) {
  if (!db || !userId) {
    throw new Error('Firebase or userId not configured');
  }
  if (token) {
    try {
      await ensureSignedIn(token);
    } catch (err) {
      throw err;
    }
  }
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const myData = userSnap.exists() ? userSnap.data() : null;

  let elderIds = [];
  if (myData && Array.isArray(myData.linkedElderIds) && myData.linkedElderIds.length > 0) {
    elderIds = myData.linkedElderIds.filter((id) => typeof id === 'string' && id.trim());
  } else if (myData && myData.linkedElderId != null) {
    const single = typeof myData.linkedElderId === 'string'
      ? myData.linkedElderId.trim()
      : (myData.linkedElderId && typeof myData.linkedElderId === 'object' && 'id' in myData.linkedElderId ? myData.linkedElderId.id : null);
    if (single) elderIds = [single];
  }

  const elders = [];
  for (const elderId of elderIds) {
    const elderRef = doc(db, 'users', elderId);
    const elderSnap = await getDoc(elderRef);
    const elderData = elderSnap.exists() ? elderSnap.data() : null;
    if (!elderData) continue;
    elders.push({
      id: elderId,
      name: elderData.fullName || elderData.name || '',
      age: elderData.age,
      location: elderData.location,
      primaryCondition: elderData.primaryCondition,
      healthUpdates: Array.isArray(elderData.healthUpdates) ? elderData.healthUpdates : [],
      updates: Array.isArray(elderData.updates) ? elderData.updates : [],
      medicineIntakeLogs: Array.isArray(elderData.medicineIntakeLogs) ? elderData.medicineIntakeLogs : [],
      tasks: Array.isArray(elderData.tasks) ? elderData.tasks : [],
      sosAlerts: Array.isArray(elderData.sosAlerts) ? elderData.sosAlerts : []
    });
  }

  return {
    elders,
    healthUpdates: [], // deprecated: use elders[].healthUpdates
    updates: [],
    medicineIntakeLogs: [] // deprecated: use elders[].medicineIntakeLogs
  };
}
