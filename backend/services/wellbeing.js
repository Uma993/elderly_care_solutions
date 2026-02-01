/**
 * Wellbeing check: notify linked caregivers via Web Push when elder reports "not_well" repeatedly.
 */

const webPush = require('web-push');
const { getWellbeingEntries, getLinkedFamilyIds, getElderName, isConfigured } = require('./firebase');
const { getSubscriptionsByUserId } = require('../data/pushSubscriptions');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails('mailto:support@elderlycare.example', vapidPublicKey, vapidPrivateKey);
}

const NOT_WELL_THRESHOLD = 3;
const NOT_WELL_DAYS = 7;

/**
 * If elder has reported "not_well" at least NOT_WELL_THRESHOLD times in the last NOT_WELL_DAYS days,
 * send Web Push to all linked family/caregivers.
 * @param {string} elderId
 */
async function checkAndNotifyCaregiverIfNeeded(elderId) {
  if (!isConfigured() || !vapidPublicKey || !vapidPrivateKey) return;
  try {
    const entries = await getWellbeingEntries(elderId, { days: NOT_WELL_DAYS });
    const notWellCount = entries.filter((e) => e.value === 'not_well').length;
    if (notWellCount < NOT_WELL_THRESHOLD) return;

    const elderName = await getElderName(elderId);
    const familyIds = await getLinkedFamilyIds(elderId);
    const title = 'Wellbeing check';
    const body = `${elderName || 'Elder'} has reported "Not well" several times in the last ${NOT_WELL_DAYS} days. Please check in.`;
    const payload = JSON.stringify({
      title,
      body,
      url: '/',
      data: { type: 'wellbeing', elderId, elderName: elderName || 'Elder' }
    });

    for (const familyUserId of familyIds) {
      const subs = getSubscriptionsByUserId(familyUserId);
      for (const { subscription } of subs) {
        try {
          await webPush.sendNotification(subscription, payload);
        } catch (pushErr) {
          console.warn('Wellbeing push failed for', familyUserId, pushErr.message);
        }
      }
    }
  } catch (err) {
    console.warn('checkAndNotifyCaregiverIfNeeded failed:', err.message);
  }
}

module.exports = {
  checkAndNotifyCaregiverIfNeeded
};
