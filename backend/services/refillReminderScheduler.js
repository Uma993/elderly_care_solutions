/**
 * Refill reminder scheduler: run daily; for each elder's medicines with
 * refillReminderAt <= today or amountLeft <= REFILL_LOW_DAYS, send Web Push to linked family.
 * Dedupe: one alert per elder+medicine per day.
 */

const webPush = require('web-push');
const { readUsers } = require('../data/userStore');
const { getElderMedicines, getLinkedFamilyIds, getElderName, isConfigured } = require('./firebase');
const { getSubscriptionsByUserId } = require('../data/pushSubscriptions');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails('mailto:support@elderlycare.example', vapidPublicKey, vapidPrivateKey);
}

const REFILL_LOW_DAYS = parseInt(process.env.REFILL_LOW_DAYS ?? '7', 10);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

/** Per elderId-medicineId last sent date (YYYY-MM-DD) */
const lastSentByKey = new Map();

function runRefillReminderScheduler() {
  if (!isConfigured() || !vapidPublicKey || !vapidPrivateKey) return;
  const todayStr = new Date().toISOString().slice(0, 10);

  const users = readUsers();
  const elders = Array.isArray(users) ? users.filter((u) => u.role === 'elderly') : [];

  elders.forEach((elder) => {
    const elderId = elder.id;
    getElderMedicines(elderId)
      .then((medicines) => {
        const needReminder = medicines.filter((m) => {
          const key = `${elderId}-${m.id}`;
          if (lastSentByKey.get(key) === todayStr) return false;
          const reminderDue = m.refillReminderAt && m.refillReminderAt <= todayStr;
          const lowAmount = m.amountLeft != null && typeof m.amountLeft === 'number' && m.amountLeft <= REFILL_LOW_DAYS;
          return reminderDue || lowAmount;
        });
        return Promise.all(
          needReminder.map((m) => {
            const key = `${elderId}-${m.id}`;
            lastSentByKey.set(key, todayStr);
            return getElderName(elderId).then((elderName) => ({
              elderName: elderName || 'Elder',
              medicineName: m.name || 'Medicine'
            }));
          })
        ).then((infos) => infos.map((info, i) => ({ ...info, medicine: needReminder[i] })));
      })
      .then((items) => {
        if (!items || items.length === 0) return;
        return getLinkedFamilyIds(elderId).then((familyIds) => {
          const elderName = items[0]?.elderName || 'Elder';
          items.forEach(({ medicineName }) => {
            const title = 'Refill reminder';
            const body = `${elderName} – ${medicineName}: amount low / refill due.`;
            const payload = JSON.stringify({
              type: 'refill_reminder',
              title,
              body,
              url: `${FRONTEND_ORIGIN}/medicines`,
              data: { url: `${FRONTEND_ORIGIN}/medicines`, type: 'refill_reminder', elderId }
            });
            familyIds.forEach((familyUserId) => {
              const subs = getSubscriptionsByUserId(familyUserId);
              subs.forEach(({ subscription }) => {
                webPush.sendNotification(subscription, payload).catch((err) => {
                  console.warn('Refill reminder push failed for', familyUserId, err.message);
                });
              });
            });
          });
        });
      })
      .catch((err) => {
        console.warn('Refill reminder scheduler failed for', elderId, err.message);
      });
  });
}

let intervalId = null;

function startRefillReminderScheduler() {
  if (intervalId != null) return;
  runRefillReminderScheduler();
  intervalId = setInterval(runRefillReminderScheduler, 24 * 60 * 60 * 1000);
}

function stopRefillReminderScheduler() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  startRefillReminderScheduler,
  stopRefillReminderScheduler,
  runRefillReminderScheduler
};
