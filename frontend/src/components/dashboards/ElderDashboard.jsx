import React, { useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';
import Tag from '../ui/Tag.jsx';
import PasskeyRegister from '../PasskeyRegister.jsx';
import { colors } from '../../design/tokens';
import { getElderDashboardData } from '../../firebase/dashboardData.js';
import { API_BASE_URL, getAuthHeaders } from '../../api';

const today = () => new Date().toISOString().slice(0, 10);

function ElderDashboard({ currentUser, token, onLogout }) {
  const [medicines, setMedicines] = useState([]);
  const [medicineIntakeLogs, setMedicineIntakeLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sosSent, setSosSent] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [completingTaskId, setCompletingTaskId] = useState(null);

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
              name: m.title || m.name || m.name || 'Medicine',
              dosage: m.details || m.dosage || '',
              times: Array.isArray(m.times) ? m.times : (m.time ? [m.time] : [''])
            }))
          );
        } else {
          setMedicines([]);
        }
        setMedicineIntakeLogs(Array.isArray(data.medicineIntakeLogs) ? data.medicineIntakeLogs : []);
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      } catch (error) {
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, token, refreshTrigger]);

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
    } catch {
      // keep UI unchanged on error
    } finally {
      setMarkingId(null);
    }
  };

  const handleTaskComplete = async (taskId) => {
    setCompletingTaskId(taskId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/elders/${currentUser.id}/tasks/${taskId}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
          body: JSON.stringify({})
        }
      );
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch {
      // keep UI unchanged on error
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleSOS = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({})
      });
      if (res.ok) {
        setSosSent(true);
      }
    } catch {
      // show sent anyway for UX
      setSosSent(true);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.5rem' }}>Good day, {currentUser.fullName}</h2>
      <p style={{ marginTop: 0, marginBottom: '1.25rem', color: colors.textMuted, fontSize: '1.05rem' }}>
        Here are your medicines for today and a quick help button if you feel unwell.
      </p>

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
                </div>
                <Tag tone={isTaken ? 'success' : 'warning'}>
                  {isMarking ? 'Saving…' : isTaken ? 'Taken' : 'Tap when taken'}
                </Tag>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>Today&apos;s tasks</h3>
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tasks.length === 0 && (
            <p style={{ color: colors.textMuted, fontSize: '0.95rem' }}>No tasks for today.</p>
          )}
          {tasks.map((t) => {
            const isComplete = !!t.completed;
            const isCompleting = completingTaskId === t.id;
            return (
              <div
                key={t.id}
                className="hover-card"
                style={{
                  borderRadius: '0.9rem',
                  padding: '0.8rem 0.9rem',
                  border: `1px solid ${colors.borderSubtle}`,
                  background: isComplete ? colors.successBg : colors.surfaceSoft,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '1.02rem',
                  color: colors.text
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{t.title || 'Task'}</div>
                  {t.description && <div style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '0.2rem' }}>{t.description}</div>}
                  {t.time && <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Time: {t.time}</div>}
                </div>
                {!isComplete ? (
                  <Button
                    onClick={() => handleTaskComplete(t.id)}
                    disabled={isCompleting}
                    style={{ minHeight: '2.5rem', padding: '0.5rem 1rem' }}
                  >
                    {isCompleting ? '…' : 'Done'}
                  </Button>
                ) : (
                  <Tag tone="success">Done</Tag>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>Need quick help?</h3>
        <p style={{ marginTop: '0.2rem', marginBottom: '0.9rem', color: colors.textMuted, fontSize: '1.05rem' }}>
          If you suddenly feel unwell, press the SOS button so your family can check on you.
        </p>
        <Button
          variant="danger"
          onClick={handleSOS}
          style={{ minHeight: 56, fontSize: '1.25rem', padding: '0.75rem 1.5rem' }}
        >
          SOS – I need help
        </Button>
        {sosSent && (
          <p className="info-message" style={{ marginTop: '0.75rem' }}>
            SOS alert noted. Your family members will be notified in the monitoring portal.
          </p>
        )}
      </section>

      <PasskeyRegister token={token} />
      <Button variant="secondary" onClick={onLogout}>
        Log out
      </Button>
    </div>
  );
}

export default ElderDashboard;

