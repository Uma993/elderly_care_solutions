const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(__dirname, 'pushSubscriptions.json');

function readStore() {
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    console.error('Error reading pushSubscriptions.json:', err.message);
    return {};
  }
}

function writeStore(store) {
  fs.writeFileSync(dataFilePath, JSON.stringify(store, null, 2), 'utf8');
}

/**
 * Save a push subscription for a user (replaces previous; single device per user for demo).
 * @param {string} userId - Family user id
 * @param {object} subscription - PushSubscriptionJSON (endpoint, keys, expirationTime)
 */
function saveSubscription(userId, subscription) {
  if (!userId || !subscription || !subscription.endpoint || !subscription.keys) return;
  const store = readStore();
  store[userId] = [{ subscription, createdAt: new Date().toISOString() }];
  writeStore(store);
}

/**
 * Get all push subscriptions for a user.
 * @param {string} userId
 * @returns {Array<{ subscription: object, createdAt: string }>}
 */
function getSubscriptionsByUserId(userId) {
  const store = readStore();
  const list = store[userId];
  return Array.isArray(list) ? list : [];
}

module.exports = {
  saveSubscription,
  getSubscriptionsByUserId
};
