/**
 * Generic reminder scheduler: every minute, check elders' reminders (from Firestore)
 * and send Web Push when due. Medicine-specific reminders stay in medicineReminders.js.
 */

const webPush = require('web-push');
const { readUsers } = require('../data/userStore');
const { getReminders, getLinkedFamilyIds, isConfigured } = require('./firebase');
const { getSubscriptionsByUserId } = require('../data/pushSubscriptions');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails('mailto:support@elderlycare.example', vapidPublicKey, vapidPrivateKey);
}

let sentThisMinute = new Set();
let lastMinute = -1;

/**
 * Parse time string (e.g. "9:00", "17:00", "9:00 AM") to { hour, minute } in 24h.
 * Returns null if unparseable.
 */
function parseReminderTime(timeStr) {
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

function runReminderScheduler() {
  if (!isConfigured() || !vapidPublicKey || !vapidPrivateKey) return;
  const now = new Date();
  const currentMinute = Math.floor(now.getTime() / 60000);
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const todayStr = now.toISOString().slice(0, 10);

  if (currentMinute !== lastMinute) {
    sentThisMinute.clear();
    lastMinute = currentMinute;
  }

  const users = readUsers();
  const elders = Array.isArray(users) ? users.filter((u) => u.role === 'elderly') : [];

  elders.forEach((elder) => {
    const elderId = elder.id;
    getReminders(elderId)
      .then((reminders) => {
        reminders.forEach((rem) => {
          if (rem.done || !rem.at) return;
          const parsed = parseReminderTime(rem.at);
          if (!parsed || parsed.hour !== currentHour || parsed.minute !== currentMin) return;
          if (rem.date && rem.date.slice(0, 10) !== todayStr) return;
          const key = `${elderId}-${rem.id}-${todayStr}-${parsed.hour}-${parsed.minute}`;
          if (sentThisMinute.has(key)) return;
          sentThisMinute.add(key);

          const title = 'Reminder';
          const body = rem.text || 'Reminder';
          const payload = JSON.stringify({
            type: 'reminder',
            title,
            body,
            url: '/',
            data: { url: '/', type: 'reminder', elderId, reminderId: rem.id }
          });

          const sendTo = (userId) => {
            const subs = getSubscriptionsByUserId(userId);
            subs.forEach(({ subscription }) => {
              webPush.sendNotification(subscription, payload).catch((err) => {
                console.warn('Reminder push failed for', userId, err.message);
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
        console.warn('Reminder scheduler fetch failed for', elderId, err.message);
      });
  });
}

let intervalId = null;

function startReminderScheduler() {
  if (intervalId != null) return;
  runReminderScheduler();
  intervalId = setInterval(runReminderScheduler, 60 * 1000);
}

function stopReminderScheduler() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  startReminderScheduler,
  stopReminderScheduler,
  runReminderScheduler
};
