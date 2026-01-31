const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const { findByEmail, createNewUser } = require('../data/userStore');
const { createUserProfile, createCustomToken } = require('../services/firebase');

const JWT_SECRET = process.env.JWT_SECRET || 'elderly-care-dev-secret-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// Helper to omit sensitive fields
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

function issueJwt(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

// Verify JWT and attach payload to req (userId, email, role)
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.auth = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { fullName, email, password, confirmPassword, role, phone, relation } = req.body;

  if (!fullName || !email || !password || !confirmPassword || !role) {
    return res.status(400).json({ message: 'Please fill in all required fields.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }

  if (!['elderly', 'family'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  if (role === 'family' && !relation) {
    return res.status(400).json({ message: 'Relation is required for family members.' });
  }

  const existing = findByEmail(email);
  if (existing) {
    return res.status(409).json({ message: 'A user with this email already exists.' });
  }

  const user = createNewUser({ fullName, email, password, role, phone, relation });
  const token = issueJwt(user);

  try {
    await createUserProfile(user.id, sanitizeUser(user));
  } catch (err) {
    console.warn('Firestore user profile create failed (user still registered in Node):', err.message);
  }

  return res.status(201).json({
    message: 'Registration successful. You can now log in.',
    user: sanitizeUser(user),
    token
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = findByEmail(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = issueJwt(user);

  return res.json({
    message: 'Login successful.',
    user: sanitizeUser(user),
    token
  });
});

// POST /api/auth/firebase-token — returns a Firebase custom token for the authenticated user (Bearer JWT required)
router.post('/firebase-token', requireAuth, async (req, res) => {
  const userId = req.auth.userId;
  try {
    const customToken = await createCustomToken(userId);
    if (!customToken) {
      return res.status(503).json({ message: 'Firebase custom token not configured.' });
    }
    return res.json({ token: customToken });
  } catch (err) {
    console.error('Firebase custom token error:', err);
    return res.status(500).json({ message: 'Failed to create Firebase token.' });
  }
});

module.exports = router;
module.exports.issueJwt = issueJwt;
module.exports.requireAuth = requireAuth;
module.exports.sanitizeUser = sanitizeUser;
module.exports.JWT_SECRET = JWT_SECRET;

