import React, { useState } from 'react';
import Button from './ui/Button.jsx';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { base64UrlToBuffer } from '../webauthnHelpers.js';

function PushSubscribe({ token }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleEnableNotifications = async () => {
    if (!token) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('Notifications or Push not supported in this browser.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Notification permission denied.');
        setLoading(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const base = API_BASE_URL.replace(/\/api\/?$/, '');
      const vapidRes = await fetch(`${base}/api/push-vapid-public`);
      const vapidData = await vapidRes.json();
      if (!vapidRes.ok || !vapidData.publicKey) {
        setError('Could not get push configuration.');
        setLoading(false);
        return;
      }
      const applicationServerKey = base64UrlToBuffer(vapidData.publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
      const subRes = await fetch(`${base}/api/push-subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ subscription: subscription.toJSON ? subscription.toJSON() : subscription })
      });
      const subData = await subRes.json();
      if (!subRes.ok) {
        setError(subData.message || 'Failed to enable notifications.');
        setLoading(false);
        return;
      }
      setMessage(subData.message || 'SOS notifications enabled. You will get alerts when an elder sends SOS.');
    } catch (err) {
      setError(err.message || 'Failed to enable notifications.');
    } finally {
      setLoading(false);
    }
  };

  if (!('Notification' in window) || !('PushManager' in window)) return null;

  return (
    <div style={{ marginTop: '1rem' }}>
      <Button
        type="button"
        variant="secondary"
        onClick={handleEnableNotifications}
        disabled={loading}
        style={{ minHeight: '44px', fontSize: '1rem' }}
      >
        {loading ? 'Enabling…' : 'Enable notifications'}
      </Button>
      {message && <p style={{ margin: '0.5rem 0 0 0', color: 'var(--success-text, #166534)', fontSize: '0.95rem' }}>{message}</p>}
      {error && <p style={{ margin: '0.5rem 0 0 0', color: 'var(--error-text, #b91c1c)', fontSize: '0.95rem' }}>{error}</p>}
    </div>
  );
}

export default PushSubscribe;
