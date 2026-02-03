import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Tag from '../components/ui/Tag.jsx';
import { colors } from '../design/tokens';
import { getElderDashboardData } from '../firebase/dashboardData.js';
import { API_BASE_URL, getAuthHeaders } from '../api';

const today = () => new Date().toISOString().slice(0, 10);

function ElderMedicinesPage() {
  const { currentUser, token } = useOutletContext();
  const [medicines, setMedicines] = useState([]);
  const [medicineIntakeLogs, setMedicineIntakeLogs] = useState([]);
  const [markingId, setMarkingId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getElderDashboardData(currentUser?.id, token);
        if (!isMounted || !data) return;
        if (Array.isArray(data.medicines) && data.medicines.length > 0) {
          setMedicines(
            data.medicines.map((m) => ({
              id: m.id,
              name: m.title || m.name || 'Medicine',
              dosage: m.details || m.dosage || '',
              times: Array.isArray(m.times) ? m.times : (m.time ? [m.time] : ['']),
              refillStatus: m.refillStatus || 'none',
              refillNotes: m.refillNotes || '',
              amountLeft: m.amountLeft ?? null,
              refillReminderAt: m.refillReminderAt || null
            }))
          );
        } else setMedicines([]);
        setMedicineIntakeLogs(Array.isArray(data.medicineIntakeLogs) ? data.medicineIntakeLogs : []);
      } catch (_) {}
    }
    if (currentUser?.id) load();
    return () => { isMounted = false; };
  }, [currentUser?.id, token, refreshTrigger]);

  const takenTodaySet = new Set(
    medicineIntakeLogs
      .filter((log) => log.date === today() && log.medicineId)
      .map((log) => log.medicineId)
  );

  const handleMarkTaken = async (medicineId) => {
    setMarkingId(medicineId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/elders/${currentUser.id}/medicines/${medicineId}/taken`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
          body: JSON.stringify({})
        }
      );
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch (_) {}
    setMarkingId(null);
  };

  if (!currentUser || currentUser.role !== 'elderly') return null;

  return (
    <div>
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Today&apos;s medicines</h3>
          <Tag tone="success">Tap when taken</Tag>
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {medicines.length === 0 && (
            <p style={{ color: colors.textMuted, fontSize: '0.95rem' }}>No medicines added yet. Add them in your profile or ask a family member.</p>
          )}
          {medicines.map((m) => {
            const isTaken = takenTodaySet.has(m.id);
            const isMarking = markingId === m.id;
            return (
              <button
                key={m.id}
                type="button"
                className="hover-card"
                onClick={() => !isTaken && !isMarking && handleMarkTaken(m.id)}
                disabled={isTaken || isMarking}
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
                  cursor: isTaken || isMarking ? 'default' : 'pointer'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>{m.dosage}</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Time: {m.times.join(', ') || '—'}</div>
                  {(m.refillStatus === 'pending' || m.refillStatus === 'ordered') && (
                    <div style={{ fontSize: '0.9rem', marginTop: '0.35rem', color: colors.textMuted }}>
                      Refill requested by family
                    </div>
                  )}
                  {(m.amountLeft != null || m.refillReminderAt) && (
                    <div style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: colors.textMuted }}>
                      {m.amountLeft != null && `${m.amountLeft} days left`}
                      {m.amountLeft != null && m.refillReminderAt && ' · '}
                      {m.refillReminderAt && `Remind: ${m.refillReminderAt}`}
                    </div>
                  )}
                </div>
                <Tag tone={isTaken ? 'success' : 'warning'}>
                  {isMarking ? 'Saving…' : isTaken ? 'Taken' : 'Tap when taken'}
                </Tag>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default ElderMedicinesPage;
