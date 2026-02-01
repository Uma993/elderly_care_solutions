import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import Button from './ui/Button.jsx';
import { db } from '../firebase/config.js';
import { ensureSignedIn } from '../firebase/authFirebase.js';
import { useFamilyElder } from '../context/FamilyElderContext.jsx';

const defaultTitle = 'Elderly Care';

/**
 * Renders the SOS flash overlay when a new SOS alert arrives for any linked elder.
 * Must be rendered inside FamilyElderProvider. Listens to elders' Firestore docs.
 */
function FamilyFlashAlert({ token }) {
  const { elders } = useFamilyElder() || {};
  const [flashAlert, setFlashAlert] = useState(null);
  const prevSosIdsByElder = useRef({});
  const sosUnsubscribesRef = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!db || !elders?.length || !token) return;
    sosUnsubscribesRef.current = [];
    (async () => {
      try {
        await ensureSignedIn(token);
      } catch {
        return;
      }
      const unsubs = [];
      elders.forEach((elder) => {
        const elderId = elder.id;
        const elderName = elder.name || 'Elder';
        const unsub = onSnapshot(doc(db, 'users', elderId), (snap) => {
          const data = snap.exists() ? snap.data() : {};
          const sosAlerts = Array.isArray(data.sosAlerts) ? data.sosAlerts : [];
          const prevIds = prevSosIdsByElder.current[elderId] || new Set();
          const newAlerts = sosAlerts.filter((a) => a.id && !prevIds.has(a.id));
          prevSosIdsByElder.current[elderId] = new Set(sosAlerts.map((a) => a.id).filter(Boolean));
          if (newAlerts.length > 0) {
            const alert = newAlerts[newAlerts.length - 1];
            setFlashAlert({
              id: alert.id,
              time: alert.time,
              elderName: alert.elderName || elderName,
              elderId,
              location: alert.location
            });
            document.title = `SOS – ${alert.elderName || elderName} needs help`;
            if (typeof navigator.vibrate === 'function') {
              navigator.vibrate([500, 200, 500, 200, 500, 200, 1000]);
            }
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.type = 'sine';
              const t0 = ctx.currentTime;
              osc.frequency.setValueAtTime(600, t0);
              osc.frequency.setValueAtTime(1200, t0 + 0.15);
              osc.frequency.setValueAtTime(600, t0 + 0.3);
              osc.frequency.setValueAtTime(1200, t0 + 0.45);
              osc.frequency.setValueAtTime(600, t0 + 0.6);
              gain.gain.setValueAtTime(0.35, t0);
              gain.gain.exponentialRampToValueAtTime(0.01, t0 + 0.9);
              osc.start(t0);
              osc.stop(t0 + 0.9);
            } catch (_) {}
          }
        });
        unsubs.push(unsub);
      });
      sosUnsubscribesRef.current = unsubs;
    })();
    return () => {
      sosUnsubscribesRef.current.forEach((fn) => typeof fn === 'function' && fn());
      sosUnsubscribesRef.current = [];
    };
  }, [elders, token]);

  const dismissFlash = () => {
    setFlashAlert(null);
    document.title = defaultTitle;
  };

  if (!flashAlert) return null;

  const flashAlertLocation = flashAlert.location;
  const hasLocation = flashAlertLocation?.lat != null && flashAlertLocation?.lng != null;
  const mapUrl = hasLocation
    ? `https://www.google.com/maps?q=${encodeURIComponent(flashAlertLocation.lat)},${encodeURIComponent(flashAlertLocation.lng)}`
    : null;
  const sosPageUrl = `/sos-alert?alertId=${encodeURIComponent(flashAlert.id || '')}&elderId=${encodeURIComponent(flashAlert.elderId || '')}&elderName=${encodeURIComponent(flashAlert.elderName || 'Elder')}&time=${encodeURIComponent(flashAlert.time || '')}${hasLocation ? `&lat=${encodeURIComponent(flashAlertLocation.lat)}&lng=${encodeURIComponent(flashAlertLocation.lng)}` : ''}`;

  return (
    <div
      role="alert"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(180deg, #8b0000 0%, #4a0000 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        boxSizing: 'border-box'
      }}
    >
      <h2 style={{ margin: '0 0 0.5rem', fontSize: 'clamp(1.5rem, 5vw, 2.25rem)' }}>SOS</h2>
      <p style={{ margin: '0 0 0.5rem', fontSize: 'clamp(1.1rem, 3vw, 1.4rem)' }}>{flashAlert.elderName} needs help</p>
      {flashAlert.time && (
        <p style={{ margin: '0 0 0.75rem', fontSize: '1rem', opacity: 0.9 }}>
          Time: {new Date(flashAlert.time).toLocaleString()}
        </p>
      )}
      {hasLocation && (
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>
          Location: {flashAlertLocation.lat}, {flashAlertLocation.lng}
        </p>
      )}
      {mapUrl && (
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '0.6rem 1.2rem',
            background: '#fff',
            color: '#8b0000',
            borderRadius: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: '1rem'
          }}
        >
          Open in map
        </a>
      )}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          variant="primary"
          onClick={() => {
            dismissFlash();
            navigate(sosPageUrl);
          }}
          style={{ minHeight: '44px' }}
        >
          View
        </Button>
        <Button
          variant="secondary"
          onClick={dismissFlash}
          style={{ minHeight: '44px', color: '#fff', borderColor: '#fff' }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export default FamilyFlashAlert;
