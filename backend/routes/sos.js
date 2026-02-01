const express = require('express');
const router = express.Router();
const webPush = require('web-push');
const { requireAuth } = require('./auth');
const { appendSosAlert, setLastActivityAt, isConfigured, getLinkedFamilyIds } = require('../services/firebase');
const { getSubscriptionsByUserId } = require('../data/pushSubscriptions');

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails('mailto:support@elderlycare.example', vapidPublicKey, vapidPrivateKey);
}

/** POST /api/sos — elder only; records SOS alert and sends Web Push to linked family */
router.post('/', requireAuth, async (req, res) => {
  if (req.auth.role !== 'elderly') {
    return res.status(403).json({ message: 'Only elders can send an SOS alert.' });
  }
  if (!isConfigured()) {
    return res.status(503).json({ message: 'Firestore not configured.' });
  }
  const elderId = req.auth.userId;
  const { lat, lng } = req.body || {};
  try {
    const { elderName, alert } = await appendSosAlert(elderId, { lat, lng });
    await setLastActivityAt(elderId);
    const familyIds = await getLinkedFamilyIds(elderId);
    const latVal = alert.location?.lat;
    const lngVal = alert.location?.lng;
    const params = new URLSearchParams({
      alertId: alert.id,
      elderId,
      elderName: elderName || 'Elder',
      time: alert.time || ''
    });
    if (latVal != null && lngVal != null) {
      params.set('lat', String(latVal));
      params.set('lng', String(lngVal));
    }
    const sosUrl = `/sos-alert?${params.toString()}`;
    const bodyText = latVal != null && lngVal != null
      ? `Time: ${alert.time}. Location: ${latVal}, ${lngVal}. Tap to see map.`
      : `Time: ${alert.time}. Tap to see details.`;
    const payload = JSON.stringify({
      title: `SOS – ${elderName} needs help`,
      body: bodyText,
      url: sosUrl,
      data: {
        url: sosUrl,
        alertId: alert.id,
        elderId,
        elderName: elderName || 'Elder',
        time: alert.time || '',
        lat: latVal,
        lng: lngVal
      }
    });
    for (const familyUserId of familyIds) {
      const subs = getSubscriptionsByUserId(familyUserId);
      for (const { subscription } of subs) {
        try {
          await webPush.sendNotification(subscription, payload);
        } catch (pushErr) {
          console.warn('Web Push failed for', familyUserId, pushErr.message);
        }
      }
    }
    return res.json({ message: 'SOS alert sent. Your family will be notified.' });
  } catch (err) {
    console.warn('POST sos failed:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to send SOS.' });
  }
});

module.exports = router;
