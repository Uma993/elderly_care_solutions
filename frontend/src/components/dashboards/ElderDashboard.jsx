import React, { useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';
import Tag from '../ui/Tag.jsx';
import { colors } from '../../design/tokens';
import { getElderDashboardData } from '../../firebase/dashboardData.js';

function ElderDashboard({ currentUser, token, onLogout }) {
  const [takenToday, setTakenToday] = useState({});
  const [sosSent, setSosSent] = useState(false);
  const [medicines, setMedicines] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const data = await getElderDashboardData(currentUser.id, token);
        if (!isMounted || !data) return;
        if (Array.isArray(data.medicines) && data.medicines.length > 0) {
          setMedicines(
            data.medicines.map((m) => ({
              id: m.id,
              name: m.title || m.name || 'Medicine',
              dosage: m.details || m.dosage || '',
              times: Array.isArray(m.times) ? m.times : [m.time || '']
            }))
          );
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('ElderDashboard: could not load medicines from Firestore', error);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, token]);

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
      <p style={{ marginTop: 0, marginBottom: '1.25rem', color: colors.textMuted }}>
        Here are your medicines for today and a quick help button if you feel unwell.
      </p>

      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Today&apos;s medicines</h3>
          <Tag tone="success">Tap when taken</Tag>
        </div>

        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {medicines.length === 0 && (
            <p style={{ color: colors.textMuted, fontSize: '0.95rem' }}>No medicines added yet. Add them in your profile or ask a family member.</p>
          )}
          {medicines.map((m) => {
            const isTaken = !!takenToday[m.id];
            return (
              <button
                key={m.id}
                type="button"
                className="hover-card"
                onClick={() => toggleTaken(m.id)}
                style={{
                  textAlign: 'left',
                  borderRadius: '0.9rem',
                  padding: '0.8rem 0.9rem',
                  border: `1px solid ${colors.borderSubtle}`,
                  background: isTaken ? colors.successBg : colors.surfaceSoft,
                  color: colors.text,
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
        <p style={{ marginTop: '0.2rem', marginBottom: '0.9rem', color: colors.textMuted }}>
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

