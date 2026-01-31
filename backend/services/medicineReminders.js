/**
 * Medicine reminder scheduler: every minute, check elders' medicine times
 * and send Web Push to elder (and optionally linked family) when due.
 */

const webPush = require('web-push');
const { readUsers } = require('../data/userStore');
const { getElderMedicines, getLinkedFamilyIds, isConfigured } = require('./firebase');
const { getSubscriptionsByUserId } = require('../data/pushSubscriptions');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails('mailto:support@elderlycare.example', vapidPublicKey, vapidPrivateKey);
}

let sentThisMinute = new Set();
let lastMinute = -1;

/**
 * Parse medicine time string (e.g. "9:00", "09:00", "9:00 AM") to { hour, minute } in 24h.
 * Returns null if unparseable.
 */
function parseMedicineTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = (match[3] || '').toUpperCase();
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function runMedicineReminders() {
  if (!isConfigured() || !vapidPublicKey || !vapidPrivateKey) return;
  const now = new Date();
  const currentMinute = Math.floor(now.getTime() / 60000);
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();

  if (currentMinute !== lastMinute) {
    sentThisMinute.clear();
    lastMinute = currentMinute;
  }

  const users = readUsers();
  const elders = Array.isArray(users) ? users.filter((u) => u.role === 'elderly') : [];

  elders.forEach((elder) => {
    const elderId = elder.id;
    const elderName = elder.fullName || elder.name || 'Elder';
    getElderMedicines(elderId)
      .then((medicines) => {
        medicines.forEach((med) => {
          const parsed = parseMedicineTime(med.time);
          if (!parsed || parsed.hour !== currentHour || parsed.minute !== currentMin) return;
          const key = `${elderId}-${med.id}`;
          if (sentThisMinute.has(key)) return;
          sentThisMinute.add(key);

          const title = 'Medicine reminder';
          const body = `Time to take ${med.name}${med.dosage ? ` – ${med.dosage}` : ''}`;
          const payload = JSON.stringify({
            type: 'medicine',
            title,
            body,
            url: '/',
            data: { url: '/', type: 'medicine', elderId, medicineId: med.id, medicineName: med.name }
          });

          const sendTo = (userId) => {
            const subs = getSubscriptionsByUserId(userId);
            subs.forEach(({ subscription }) => {
              webPush.sendNotification(subscription, payload).catch((err) => {
                console.warn('Medicine push failed for', userId, err.message);
              });
            });
          };

          sendTo(elderId);
          getLinkedFamilyIds(elderId).then((familyIds) => {
            familyIds.forEach(sendTo);
          });
        });
      })
      .catch((err) => {
        console.warn('Medicine reminders fetch failed for', elderId, err.message);
      });
  });
}

let intervalId = null;

function startMedicineReminderScheduler() {
  if (intervalId != null) return;
  runMedicineReminders();
  intervalId = setInterval(runMedicineReminders, 60 * 1000);
}

function stopMedicineReminderScheduler() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  startMedicineReminderScheduler,
  stopMedicineReminderScheduler,
  runMedicineReminders
};
