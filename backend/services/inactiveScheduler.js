/**
 * Inactive scheduler: every hour, check elders' lastActivityAt.
 * If older than INACTIVE_THRESHOLD_HOURS, send Web Push to linked family.
 * Dedupe: one alert per elder per day.
 */

const webPush = require('web-push');
const { readUsers } = require('../data/userStore');
const { getLastActivityAt, getLinkedFamilyIds, getElderName, isConfigured } = require('./firebase');
const { getSubscriptionsByUserId } = require('../data/pushSubscriptions');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails('mailto:support@elderlycare.example', vapidPublicKey, vapidPrivateKey);
}

const INACTIVE_THRESHOLD_HOURS = parseInt(process.env.INACTIVE_THRESHOLD_HOURS ?? '24', 10);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

/** Per-elder last sent date (YYYY-MM-DD) so we only send once per day */
const lastAlertByElder = new Map();

function runInactiveScheduler() {
  if (!isConfigured() || !vapidPublicKey || !vapidPrivateKey) return;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const thresholdMs = INACTIVE_THRESHOLD_HOURS * 60 * 60 * 1000;

  const users = readUsers();
  const elders = Array.isArray(users) ? users.filter((u) => u.role === 'elderly') : [];

  elders.forEach((elder) => {
    const elderId = elder.id;
    if (lastAlertByElder.get(elderId) === todayStr) return;

    getLastActivityAt(elderId)
      .then((lastAt) => {
        if (!lastAt) return; // never active, skip or could alert
        const last = new Date(lastAt).getTime();
        if (now.getTime() - last < thresholdMs) return;

        lastAlertByElder.set(elderId, todayStr);
        return getElderName(elderId).then((elderName) => ({ elderName }));
      })
      .then((info) => {
        if (!info) return;
        const elderName = info.elderName || 'Elder';
        return getLinkedFamilyIds(elderId).then((familyIds) => {
          const title = 'Inactive elder';
          const body = `${elderName} has been inactive for more than ${INACTIVE_THRESHOLD_HOURS} hours.`;
          const payload = JSON.stringify({
            type: 'inactive',
            title,
            body,
            url: `${FRONTEND_ORIGIN}/overview`,
            data: { url: `${FRONTEND_ORIGIN}/overview`, type: 'inactive', elderId }
          });
          familyIds.forEach((familyUserId) => {
            const subs = getSubscriptionsByUserId(familyUserId);
            subs.forEach(({ subscription }) => {
              webPush.sendNotification(subscription, payload).catch((err) => {
                console.warn('Inactive push failed for', familyUserId, err.message);
              });
            });
          });
        });
      })
      .catch((err) => {
        console.warn('Inactive scheduler failed for', elderId, err.message);
      });
  });
}

let intervalId = null;

function startInactiveScheduler() {
  if (intervalId != null) return;
  runInactiveScheduler();
  intervalId = setInterval(runInactiveScheduler, 60 * 60 * 1000);
}

function stopInactiveScheduler() {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  startInactiveScheduler,
  stopInactiveScheduler,
  runInactiveScheduler
};
