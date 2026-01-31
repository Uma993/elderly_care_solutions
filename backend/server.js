require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const webauthnRoutes = require('./routes/webauthn');
const usersRoutes = require('./routes/users');
const eldersRoutes = require('./routes/elders');
const sosRoutes = require('./routes/sos');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/webauthn', webauthnRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/elders', eldersRoutes);
app.use('/api/sos', sosRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Elderly care backend running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Elderly care backend listening on http://localhost:${PORT}`);
});

