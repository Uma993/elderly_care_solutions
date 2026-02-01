const express = require('express');
const router = express.Router();
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const { requireAuth, issueJwt, sanitizeUser } = require('./auth');
const { findByEmail, readUsers } = require('../data/userStore');
const {
  getCredentialsByUserId,
  addCredential,
  getUserIdByCredentialId,
  getCredentialById,
  updateCredentialCounter
} = require('../data/webauthnCredentials');
const { create: createChangePasswordToken } = require('../data/changePasswordTokens');

const rpId = process.env.WEBAUTHN_RP_ID || 'localhost';
const rpName = process.env.WEBAUTHN_RP_NAME || 'Elderly Care';

// In-memory challenge storage (keyed by userId). Optional TTL; clear after use.
const registrationChallenges = new Map();
const authenticationChallenges = new Map();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function getOrigin(req) {
  return req.get('origin') || process.env.WEBAUTHN_ORIGIN || 'http://localhost:5173';
}

/** Normalise credential ID to canonical base64url (no padding) for consistent lookup. */
function normaliseCredentialId(id) {
  if (id == null || typeof id !== 'string') return '';
  return id.replace(/=+$/, '').trim();
}

function clearExpiredChallenges(map) {
  const now = Date.now();
  for (const [key, val] of map.entries()) {
    if (val.createdAt && now - val.createdAt > CHALLENGE_TTL_MS) map.delete(key);
  }
}

// GET /api/auth/webauthn/register-options — requires JWT
router.get('/register-options', requireAuth, async (req, res) => {
  try {
    clearExpiredChallenges(registrationChallenges);
    const userId = req.auth.userId;
    const user = findByEmail(req.auth.email);
    const displayName = user && user.fullName ? user.fullName : '';
    const userName = user && user.email ? user.email : userId;

    const existingCreds = getCredentialsByUserId(userId);
    const excludeCredentials = existingCreds.map((c) => ({ id: c.credentialID }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID: rpId,
      userName,
      userDisplayName: displayName,
      userID: Buffer.from(userId, 'utf8'),
      attestationType: 'none',
      excludeCredentials: excludeCredentials.length > 0 ? excludeCredentials : undefined,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required',
        authenticatorAttachment: 'platform'
      }
    });

    registrationChallenges.set(userId, { challenge: options.challenge, createdAt: Date.now() });
    return res.json(options);
  } catch (err) {
    console.warn('WebAuthn register-options failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to generate registration options.' });
  }
});

// POST /api/auth/webauthn/register-verify — requires JWT
router.post('/register-verify', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const stored = registrationChallenges.get(userId);
    if (!stored) {
      return res.status(400).json({ message: 'Registration session expired. Please try again.' });
    }
    registrationChallenges.delete(userId);

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: stored.challenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: rpId
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ message: 'Verification failed.' });
    }

    const { credential } = verification.registrationInfo;
    addCredential(userId, {
      credentialID: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter
    });

    return res.json({ message: 'Passkey registered. You can now sign in with fingerprint or face.' });
  } catch (err) {
    console.warn('WebAuthn register-verify failed:', err.message);
    return res.status(400).json({ message: err.message || 'Verification failed.' });
  }
});

// POST /api/auth/webauthn/login-options — body: { email }
router.post('/login-options', async (req, res) => {
  try {
    const email = req.body?.email;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ message: 'Email is required for passkey sign-in.' });
    }

    const user = findByEmail(email.trim());
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email.' });
    }

    const credentials = getCredentialsByUserId(user.id);
    if (!credentials.length) {
      return res.status(400).json({ message: 'No passkey registered for this account. Sign in with password and enable fingerprint login first.' });
    }

    const allowCredentials = credentials.map((c) => ({ id: c.credentialID }));

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials,
      userVerification: 'required'
    });

    authenticationChallenges.set(user.id, { challenge: options.challenge, createdAt: Date.now() });
    return res.json(options);
  } catch (err) {
    console.warn('WebAuthn login-options failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to generate sign-in options.' });
  }
});

// POST /api/auth/webauthn/login-verify — body: assertion from client
router.post('/login-verify', async (req, res) => {
  try {
    const rawCredentialId = req.body?.id;
    const credentialId = normaliseCredentialId(rawCredentialId);
    if (!credentialId) {
      return res.status(400).json({ message: 'Invalid response.' });
    }

    const userId = getUserIdByCredentialId(credentialId);
    if (!userId) {
      return res.status(400).json({ message: 'Unknown credential.' });
    }

    const stored = authenticationChallenges.get(userId);
    if (!stored) {
      return res.status(400).json({ message: 'Sign-in session expired. Please try again.' });
    }
    authenticationChallenges.delete(userId);

    const credential = getCredentialById(userId, credentialId);
    if (!credential) {
      return res.status(400).json({ message: 'Credential not found.' });
    }

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: stored.challenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: rpId,
      credential: {
        id: credential.credentialID,
        publicKey: credential.publicKey,
        counter: credential.counter
      }
    });

    if (!verification.verified) {
      return res.status(400).json({ message: 'Verification failed.' });
    }

    if (verification.authenticationInfo) {
      updateCredentialCounter(userId, credentialId, verification.authenticationInfo.newCounter);
    }

    const users = readUsers();
    const foundUser = users.find((u) => u.id === userId);
    if (!foundUser) {
      return res.status(500).json({ message: 'User not found.' });
    }

    const token = issueJwt(foundUser);
    return res.json({
      message: 'Login successful.',
      user: sanitizeUser(foundUser),
      token
    });
  } catch (err) {
    console.warn('WebAuthn login-verify failed:', err.message);
    return res.status(400).json({ message: 'Verification failed. Try again or sign in with password.' });
  }
});

// GET /api/auth/webauthn/password-change-options — requireAuth; returns auth options for current user (for "verify with passkey" before change password)
router.get('/password-change-options', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = findByEmail(req.auth.email);
    if (!user || user.id !== userId) {
      return res.status(401).json({ message: 'User not found.' });
    }

    const credentials = getCredentialsByUserId(userId);
    if (!credentials.length) {
      return res.status(400).json({ message: 'No passkey registered. Use current password to change password.' });
    }

    clearExpiredChallenges(authenticationChallenges);
    const allowCredentials = credentials.map((c) => ({ id: c.credentialID }));

    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials,
      userVerification: 'required'
    });

    authenticationChallenges.set(userId, { challenge: options.challenge, createdAt: Date.now() });
    return res.json(options);
  } catch (err) {
    console.warn('WebAuthn password-change-options failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to get options.' });
  }
});

// POST /api/auth/webauthn/verify-for-password-change — requireAuth; body: assertion from client; returns changePasswordToken
router.post('/verify-for-password-change', requireAuth, async (req, res) => {
  try {
    const userId = req.auth.userId;
    const rawCredentialId = req.body?.id;
    const credentialId = normaliseCredentialId(rawCredentialId);
    if (!credentialId) {
      return res.status(400).json({ message: 'Invalid response.' });
    }

    const credentialUserId = getUserIdByCredentialId(credentialId);
    if (!credentialUserId || credentialUserId !== userId) {
      return res.status(400).json({ message: 'Credential does not belong to this account.' });
    }

    const stored = authenticationChallenges.get(userId);
    if (!stored) {
      return res.status(400).json({ message: 'Session expired. Please try again.' });
    }
    authenticationChallenges.delete(userId);

    const credential = getCredentialById(userId, credentialId);
    if (!credential) {
      return res.status(400).json({ message: 'Credential not found.' });
    }

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: stored.challenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: rpId,
      credential: {
        id: credential.credentialID,
        publicKey: credential.publicKey,
        counter: credential.counter
      }
    });

    if (!verification.verified) {
      return res.status(400).json({ message: 'Verification failed.' });
    }

    if (verification.authenticationInfo) {
      updateCredentialCounter(userId, credentialId, verification.authenticationInfo.newCounter);
    }

    const changePasswordToken = createChangePasswordToken(userId);
    return res.json({ verified: true, changePasswordToken });
  } catch (err) {
    console.warn('WebAuthn verify-for-password-change failed:', err.message);
    return res.status(400).json({ message: err.message || 'Verification failed.' });
  }
});

module.exports = router;
