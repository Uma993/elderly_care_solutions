/**
 * In-memory one-time tokens for "verified by WebAuthn, now allow password change".
 * TTL 2 minutes. Key: token string, value: { userId, expiresAt }.
 */
const tokens = new Map();
const TTL_MS = 2 * 60 * 1000;

function prune() {
  const now = Date.now();
  for (const [key, val] of tokens.entries()) {
    if (val.expiresAt < now) tokens.delete(key);
  }
}

function create(userId) {
  prune();
  const token = require('crypto').randomBytes(24).toString('hex');
  tokens.set(token, { userId, expiresAt: Date.now() + TTL_MS });
  return token;
}

function validateAndConsume(token, userId) {
  prune();
  const entry = tokens.get(token);
  if (!entry || entry.userId !== userId || entry.expiresAt < Date.now()) return false;
  tokens.delete(token);
  return true;
}

module.exports = { create, validateAndConsume };
