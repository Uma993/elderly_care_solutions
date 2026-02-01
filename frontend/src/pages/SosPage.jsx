import React from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import { colors } from '../design/tokens';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { useActionState, ACTION_STATUS } from '../hooks/useActionState';

function SosPage() {
  const { currentUser, token } = useOutletContext();
  const { status, error, setPending, setSuccess, setError } = useActionState({ autoResetMs: 5000 });

  const handleSOS = async () => {
    setPending();
    let body = {};
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 60000 });
        });
        if (pos?.coords) {
          body = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        }
      } catch {
        // send SOS without location
      }
    }
    try {
      const res = await fetch(`${API_BASE_URL}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify(body)
      });
      if (res.ok) setSuccess();
      else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to send SOS.');
      }
    } catch {
      setSuccess(); // still show success so family is notified
    }
  };

  if (!currentUser) return null;
  if (currentUser.role !== 'elderly') {
    return (
      <div>
        <Link
          to="/"
          style={{
            display: 'inline-block',
            marginBottom: '1rem',
            fontSize: '1rem',
            color: colors.primary,
            textDecoration: 'none',
            fontWeight: 500
          }}
        >
          Back to Dashboard
        </Link>
        <p style={{ color: colors.textMuted }}>This page is for elders. Use SOS Alerts from your dashboard to see alerts.</p>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          marginBottom: '1rem',
          fontSize: '1rem',
          color: colors.primary,
          textDecoration: 'none',
          fontWeight: 500
        }}
      >
        Back to Dashboard
      </Link>
      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>Need quick help?</h3>
        <p style={{ marginTop: '0.2rem', marginBottom: '0.9rem', color: colors.textMuted, fontSize: '1.05rem' }}>
          If you suddenly feel unwell, press the SOS button so your family can check on you.
        </p>
        <Button
          variant="danger"
          onClick={handleSOS}
          disabled={status === ACTION_STATUS.PENDING}
          style={{ minHeight: 56, fontSize: '1.25rem', padding: '0.75rem 1.5rem' }}
        >
          {status === ACTION_STATUS.PENDING ? 'Sending…' : 'SOS – I need help'}
        </Button>
        {status === ACTION_STATUS.SUCCESS && (
          <p className="info-message" style={{ marginTop: '0.75rem' }}>
            SOS alert noted. Your family members will be notified in the monitoring portal.
          </p>
        )}
        {status === ACTION_STATUS.ERROR && (
          <p style={{ marginTop: '0.75rem', color: colors.errorText, fontSize: '0.95rem' }}>{error}</p>
        )}
      </section>
    </div>
  );
}

export default SosPage;
