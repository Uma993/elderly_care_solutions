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

  return {
    elder,
    medicines,
    updates
  };
}

/**
 * Load family dashboard data. If the current user (family) has linkedElderId in their doc,
 * loads the linked elder's doc for overview, healthUpdates, medicineIntakeLogs; otherwise uses own doc.
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

  let linkedElderId = null;
  if (myData && myData.linkedElderId != null) {
    if (typeof myData.linkedElderId === 'string') {
      linkedElderId = myData.linkedElderId.trim() || null;
    } else if (typeof myData.linkedElderId === 'object' && myData.linkedElderId != null && 'id' in myData.linkedElderId) {
      linkedElderId = myData.linkedElderId.id;
    }
  }

  let data = myData;
  if (linkedElderId) {
    const elderRef = doc(db, 'users', linkedElderId);
    const elderSnap = await getDoc(elderRef);
    const elderExists = elderSnap.exists();
    const elderData = elderExists ? elderSnap.data() : null;
    data = elderExists ? elderData : null;
  }

  const elder = data
    ? {
        name: data.fullName || data.name,
        age: data.age,
        location: data.location,
        primaryCondition: data.primaryCondition
      }
    : null;
  const healthUpdates = data && Array.isArray(data.healthUpdates) ? data.healthUpdates : [];
  const updates = data && Array.isArray(data.updates) ? data.updates : [];
  const medicineIntakeLogs = data && Array.isArray(data.medicineIntakeLogs) ? data.medicineIntakeLogs : [];

  return {
    elder,
    healthUpdates,
    updates,
    medicineIntakeLogs
  };
}
