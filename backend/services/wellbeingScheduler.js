/**
 * Wellbeing scheduler: at a configured time each day, send Web Push to elders
 * to open the wellbeing check. One notification per elder per day.
 */

const webPush = require('web-push');
const { readUsers } = require('../data/userStore');
const { getSubscriptionsByUserId } = require('../data/pushSubscriptions');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails('mailto:support@elderlycare.example', vapidPublicKey, vapidPrivateKey);
}

const WELLBEING_CHECK_HOUR = parseInt(process.env.WELLBEING_CHECK_HOUR ?? '9', 10);
const WELLBEING_CHECK_MINUTE = parseInt(process.env.WELLBEING_CHECK_MINUTE ?? '0', 10);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

/** Per-elder last sent date (YYYY-MM-DD) so we only send once per day */
const lastSentByElder = new Map();

function runWellbeingScheduler() {
  if (!vapidPublicKey || !vapidPrivateKey) return;
  const now = new Date();
  if (now.getHours() !== WELLBEING_CHECK_HOUR || now.getMinutes() !== WELLBEING_CHECK_MINUTE) return;

  const todayStr = now.toISOString().slice(0, 10);
  const users = readUsers();
  const elders = Array.isArray(users) ? users.filter((u) => u.role === 'elderly') : [];

  elders.forEach((elder) => {
    const elderId = elder.id;
    if (lastSentByElder.get(elderId) === todayStr) return;
    lastSentByElder.set(elderId, todayStr);

    const subs = getSubscriptionsByUserId(elderId);
    const actionUrl = `${FRONTEND_ORIGIN}/wellbeing-check`;
    const payload = JSON.stringify({
      type: 'wellbeing_check',
      title: 'How are you feeling today?',
      body: 'Tap to record your daily wellbeing.',
      url: actionUrl,
      data: { url: actionUrl, type: 'wellbeing_check', elderId }
    });

    subs.forEach(({ subscription }) => {
      webPush.sendNotification(subscription, payload).catch((err) => {
        console.warn('Wellbeing push failed for', elderId, err.message);
      });
    });
  });
}

let intervalId = null;

function startWellbeingScheduler() {
  if (intervalId != null) return;
  runWellbeingScheduler();
  intervalId = setInterval(runWellbeingScheduler, 60 * 1000);
}

function stopWellbeingScheduler() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  startWellbeingScheduler,
  stopWellbeingScheduler,
  runWellbeingScheduler
};
