const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, 'webauthnCredentials.json');

function readStore() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    console.error('Error reading webauthnCredentials.json:', err.message);
    return {};
  }
}

function writeStore(store) {
  fs.writeFileSync(dataFilePath, JSON.stringify(store, null, 2), 'utf8');
}

/**
 * Get all WebAuthn credentials for a user.
 * @param {string} userId
 * @returns {Array<{ credentialID: string, publicKey: string, counter: number }>}
 */
function getCredentialsByUserId(userId) {
  const store = readStore();
  const list = store[userId];
  return Array.isArray(list) ? list : [];
}

/**
 * Add a credential for a user. publicKey can be Uint8Array/Buffer (stored as base64).
 * @param {string} userId
 * @param {{ credentialID: string, publicKey: Uint8Array|Buffer|string, counter: number }} credential
 */
function addCredential(userId, credential) {
  const store = readStore();
  if (!store[userId]) store[userId] = [];
  const pk = credential.publicKey;
  const publicKeyBase64 =
    typeof pk === 'string' ? pk : Buffer.from(pk).toString('base64');
  store[userId].push({
    credentialID: credential.credentialID,
    publicKey: publicKeyBase64,
    counter: credential.counter != null ? credential.counter : 0
  });
  writeStore(store);
}

/**
 * Get credential for verify: publicKey returned as Buffer (Uint8Array-compatible).
 * @param {string} userId
 * @param {string} credentialId
 * @returns {{ credentialID: string, publicKey: Buffer, counter: number }|null}
 */
function getCredentialById(userId, credentialId) {
  const list = getCredentialsByUserId(userId);
  const cred = list.find((c) => c.credentialID === credentialId);
  if (!cred) return null;
  return {
    credentialID: cred.credentialID,
    publicKey: Buffer.from(cred.publicKey, 'base64'),
    counter: cred.counter
  };
}

/**
 * Find userId that owns the given credential ID (for login-verify).
 * @param {string} credentialId - base64url credential id
 * @returns {string|null}
 */
function getUserIdByCredentialId(credentialId) {
  const store = readStore();
  for (const [userId, list] of Object.entries(store)) {
    if (!Array.isArray(list)) continue;
    if (list.some((c) => c.credentialID === credentialId)) return userId;
  }
  return null;
}

/**
 * Update counter after successful authentication.
 * @param {string} userId
 * @param {string} credentialId
 * @param {number} newCounter
 */
function updateCredentialCounter(userId, credentialId, newCounter) {
  const store = readStore();
  const list = store[userId];
  if (!Array.isArray(list)) return;
  const idx = list.findIndex((c) => c.credentialID === credentialId);
  if (idx >= 0) list[idx].counter = newCounter;
  writeStore(store);
}

module.exports = {
  getCredentialsByUserId,
  addCredential,
  getUserIdByCredentialId,
  getCredentialById,
  updateCredentialCounter
};
