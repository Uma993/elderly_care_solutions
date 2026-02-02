const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { requireAuth } = require('./auth');
const {
  getFitbitTokens,
  setFitbitTokens,
  clearFitbitTokens,
  isConfigured
} = require('../services/firebase');
const {
  getAuthUrl,
  exchangeCodeForTokens,
  syncToElderProfile
} = require('../services/fitbit');

const pendingStates = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

function prunePendingStates() {
  const now = Date.now();
  for (const [state, data] of pendingStates.entries()) {
    if (now - data.createdAt > STATE_TTL_MS) pendingStates.delete(state);
  }
}

function requireElder(req, res, next) {
  if (req.auth?.role !== 'elderly') {
    return res.status(403).json({ message: 'Only elderly users can connect Fitbit.' });
  }
  next();
}

/** GET /api/fitbit/auth — returns { url } for frontend to redirect to Fitbit OAuth */
router.get('/auth', requireAuth, requireElder, (req, res) => {
  const elderId = req.auth.userId;
  const { clientId } = require('../services/fitbit').getConfig();
  if (!clientId) {
    return res.status(503).json({ message: 'Fitbit is not configured.' });
  }
  const state = crypto.randomBytes(24).toString('base64url');
  pendingStates.set(state, { elderId, createdAt: Date.now() });
  prunePendingStates();
  const url = getAuthUrl(state);
  return res.json({ url });
});

/** GET /api/fitbit/callback — Fitbit redirects here with code and state */
router.get('/callback', async (req, res) => {
  const { code, state } = req.query || {};
  const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';

  if (!code || !state) {
    return res.redirect(`${frontendBase}/profile?fitbit=error&message=missing_params`);
  }

  const data = pendingStates.get(state);
  pendingStates.delete(state);
  if (!data) {
    return res.redirect(`${frontendBase}/profile?fitbit=error&message=invalid_state`);
  }

  const elderId = data.elderId;

  try {
    const { accessToken, refreshToken, userId } = await exchangeCodeForTokens(code);
    if (!isConfigured()) {
      return res.redirect(`${frontendBase}/profile?fitbit=error&message=server_error`);
    }
    await setFitbitTokens(elderId, {
      accessToken,
      refreshToken,
      fitbitUserId: userId
    });
    return res.redirect(`${frontendBase}/profile?fitbit=connected`);
  } catch (err) {
    console.warn('Fitbit callback error:', err.message);
    const msg = encodeURIComponent(err.message || 'token_exchange_failed');
    return res.redirect(`${frontendBase}/profile?fitbit=error&message=${msg}`);
  }
});

/** POST /api/fitbit/sync — trigger sync of Fitbit data to profile */
router.post('/sync', requireAuth, requireElder, async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Firestore not configured.' });
  }
  try {
    const { profile } = await syncToElderProfile(req.auth.userId);
    return res.json({ profile, message: 'Synced.' });
  } catch (err) {
    console.warn('Fitbit sync error:', err.message);
    return res.status(400).json({ message: err.message || 'Sync failed.' });
  }
});

/** GET /api/fitbit/status — returns { connected, lastSyncAt } */
router.get('/status', requireAuth, requireElder, async (req, res) => {
  if (!isConfigured()) {
    return res.json({ connected: false, lastSyncAt: null });
  }
  try {
    const tokens = await getFitbitTokens(req.auth.userId);
    return res.json({
      connected: !!tokens,
      lastSyncAt: tokens?.lastSyncAt || null
    });
  } catch {
    return res.json({ connected: false, lastSyncAt: null });
  }
});

/** DELETE /api/fitbit/disconnect — remove Fitbit connection */
router.delete('/disconnect', requireAuth, requireElder, async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Firestore not configured.' });
  }
  try {
    await clearFitbitTokens(req.auth.userId);
    return res.json({ message: 'Disconnected.' });
  } catch (err) {
    console.warn('Fitbit disconnect error:', err.message);
    return res.status(500).json({ message: err.message || 'Disconnect failed.' });
  }
});

module.exports = router;
