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
 * Link a family user (son) to an elder. Sets son's linkedElderId and adds son's userId to elder's linkedFamilyIds.
 * @param {string} sonUserId - Node userId of the family member (caller)
 * @param {string} elderUserId - Node userId (document id) of the elder in users collection
 * @returns {Promise<void>}
 */
async function linkElderToFamily(sonUserId, elderUserId) {
  if (!firestore || !admin) throw new Error('Firestore not configured');
  const batch = firestore.batch();
  const sonRef = firestore.collection('users').doc(sonUserId);
  const elderRef = firestore.collection('users').doc(elderUserId);
  batch.update(sonRef, { linkedElderId: elderUserId });
  batch.update(elderRef, {
    linkedFamilyIds: admin.firestore.FieldValue.arrayUnion(sonUserId)
  });
  await batch.commit();
}

function isConfigured() {
  return !!firestore && !!auth;
}

module.exports = {
  createUserProfile,
  createCustomToken,
  linkElderToFamily,
  isConfigured,
  get firestore() {
    return firestore;
  }
};
