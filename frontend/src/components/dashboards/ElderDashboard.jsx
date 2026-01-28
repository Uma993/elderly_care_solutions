import React, { useState } from 'react';
import Button from '../ui/Button.jsx';
import Tag from '../ui/Tag.jsx';
import { medicineReminders } from '../../mock/elderData.js';

function ElderDashboard({ currentUser, onLogout }) {
  const [takenToday, setTakenToday] = useState({});
  const [sosSent, setSosSent] = useState(false);

  const toggleTaken = (id) => {
    setTakenToday((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSOS = () => {
    setSosSent(true);
    // In a real app this would notify family / backend
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Good day, {currentUser.fullName}</h2>
      <p style={{ marginTop: 0, marginBottom: '1.25rem', color: '#9ca3af' }}>
        Here are your medicines for today and a quick help button if you feel unwell.
      </p>

      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Today&apos;s medicines</h3>
          <Tag tone="success">Tap when taken</Tag>
        </div>

        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {medicineReminders.map((m) => {
            const isTaken = !!takenToday[m.id];
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleTaken(m.id)}
                style={{
                  textAlign: 'left',
                  borderRadius: '0.9rem',
                  padding: '0.8rem 0.9rem',
                  border: '1px solid rgba(148,163,184,0.35)',
                  background: isTaken ? 'rgba(22,163,74,0.12)' : 'rgba(15,23,42,0.7)',
                  color: '#e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '1.02rem',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>{m.dosage}</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Time: {m.times.join(', ')}</div>
                </div>
                <Tag tone={isTaken ? 'success' : 'warning'}>{isTaken ? 'Taken' : 'Tap when taken'}</Tag>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Need quick help?</h3>
        <p style={{ marginTop: '0.2rem', marginBottom: '0.9rem', color: '#9ca3af' }}>
          If you suddenly feel unwell, press the SOS button so your family can check on you.
        </p>
        <Button variant="danger" onClick={handleSOS}>
          SOS – I need help
        </Button>
        {sosSent && (
          <p className="info-message" style={{ marginTop: '0.75rem' }}>
            SOS alert noted. Your family members will be notified in the monitoring portal.
          </p>
        )}
      </section>

      <Button variant="secondary" onClick={onLogout}>
        Log out
      </Button>
    </div>
  );
}

export default ElderDashboard;

