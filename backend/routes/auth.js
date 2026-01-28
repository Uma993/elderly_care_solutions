const express = require('express');
const router = express.Router();

const { findByEmail, createNewUser } = require('../data/userStore');

// Helper to omit sensitive fields
function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

// POST /api/auth/register
router.post('/register', (req, res) => {
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

  return res.status(201).json({
    message: 'Registration successful. You can now log in.',
    user: sanitizeUser(user)
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

  return res.json({
    message: 'Login successful.',
    user: sanitizeUser(user)
  });
});

module.exports = router;

