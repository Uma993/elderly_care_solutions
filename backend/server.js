require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const webauthnRoutes = require('./routes/webauthn');
const usersRoutes = require('./routes/users');
const eldersRoutes = require('./routes/elders');
const sosRoutes = require('./routes/sos');
const pushRoutes = require('./routes/push');
const aiRoutes = require('./routes/ai');
const wellbeingRoutes = require('./routes/wellbeing');
const activityRoutes = require('./routes/activity');
const fitbitRoutes = require('./routes/fitbit');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/webauthn', webauthnRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/elders', eldersRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/wellbeing', wellbeingRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/fitbit', fitbitRoutes);
app.use('/api', pushRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Elderly care backend running' });
});

// Start server
const { startMedicineReminderScheduler } = require('./services/medicineReminders');
const { startReminderScheduler } = require('./services/reminderScheduler');
const { startWellbeingScheduler } = require('./services/wellbeingScheduler');
const { startInactiveScheduler } = require('./services/inactiveScheduler');
const { startRefillReminderScheduler } = require('./services/refillReminderScheduler');
app.listen(PORT,  '0.0.0.0', () => {
  console.log(`Elderly care backend listening on http://localhost:${PORT}`);
  startMedicineReminderScheduler();
  startReminderScheduler();
  startWellbeingScheduler();
  startInactiveScheduler();
  startRefillReminderScheduler();
});

