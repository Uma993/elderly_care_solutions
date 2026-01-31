import React, { useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';
import Tag from '../ui/Tag.jsx';
import PasskeyRegister from '../PasskeyRegister.jsx';
import PushSubscribe from '../PushSubscribe.jsx';
import VoiceAssistant from '../VoiceAssistant.jsx';
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
  const [recommendations, setRecommendations] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [reminderForm, setReminderForm] = useState({ text: '', at: '' });
  const [todoInput, setTodoInput] = useState('');
  const [reminderLoading, setReminderLoading] = useState(false);
  const [todoLoading, setTodoLoading] = useState(false);
  const [togglingReminderId, setTogglingReminderId] = useState(null);
  const [togglingTodoId, setTogglingTodoId] = useState(null);

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

  // Recommendations (elder only)
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/ai/recommendations`, { headers: getAuthHeaders(token) });
        if (!res.ok || !isMounted) return;
        const data = await res.json().catch(() => ({}));
        if (isMounted && Array.isArray(data.recommendations)) setRecommendations(data.recommendations);
      } catch (_) {}
    }
    load();
  }, [token, refreshTrigger]);

  // Reminders and checklist (elder only)
  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const [remRes, listRes] = await Promise.all([
          fetch(`${API_BASE_URL}/ai/reminders`, { headers: getAuthHeaders(token) }),
          fetch(`${API_BASE_URL}/ai/checklist`, { headers: getAuthHeaders(token) })
        ]);
        if (!isMounted) return;
        if (remRes.ok) {
          const d = await remRes.json().catch(() => ({}));
          setReminders(Array.isArray(d.reminders) ? d.reminders : []);
        }
        if (listRes.ok) {
          const d = await listRes.json().catch(() => ({}));
          setChecklist(Array.isArray(d.checklist) ? d.checklist : []);
        }
      } catch (_) {}
    }
    load();
  }, [token, refreshTrigger]);

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

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!reminderForm.text.trim() || reminderLoading) return;
    setReminderLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ text: reminderForm.text.trim(), at: reminderForm.at.trim() })
      });
      if (res.ok) {
        setReminderForm({ text: '', at: '' });
        setRefreshTrigger((t) => t + 1);
      }
    } catch (_) {}
    setReminderLoading(false);
  };

  const handleReminderDone = async (id, done) => {
    setTogglingReminderId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ done })
      });
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch (_) {}
    setTogglingReminderId(null);
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!todoInput.trim() || todoLoading) return;
    setTodoLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ text: todoInput.trim() })
      });
      if (res.ok) {
        setTodoInput('');
        setRefreshTrigger((t) => t + 1);
      }
    } catch (_) {}
    setTodoLoading(false);
  };

  const handleToggleTodo = async (id) => {
    setTogglingTodoId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/checklist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) }
      });
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch (_) {}
    setTogglingTodoId(null);
  };

  const handleDeleteTodo = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/ai/checklist/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
      });
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch (_) {}
  };

  const handleSOS = async () => {
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
        <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>Voice assistant</h3>
        <p style={{ marginTop: '0.2rem', marginBottom: '0.5rem', color: colors.textMuted, fontSize: '0.95rem' }}>
          Hold the mic and ask about your medicines, tasks, or say &quot;I need help&quot; for SOS.
        </p>
        <VoiceAssistant token={token} onAction={() => setRefreshTrigger((t) => t + 1)} />
      </section>

      {recommendations.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>Daily tips</h3>
          <div
            className="hover-card"
            style={{
              borderRadius: '0.9rem',
              padding: '0.9rem 1rem',
              border: `1px solid ${colors.borderSubtle}`,
              background: colors.surfaceSoft,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            {recommendations.map((tip, i) => (
              <p key={i} style={{ margin: 0, fontSize: '1rem', color: colors.text }}>
                {tip}
              </p>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>Reminders</h3>
        <form onSubmit={handleAddReminder} style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="What to remind"
            value={reminderForm.text}
            onChange={(e) => setReminderForm((f) => ({ ...f, text: e.target.value }))}
            style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem', minWidth: '10rem' }}
          />
          <input
            type="text"
            placeholder="Time (e.g. 17:00)"
            value={reminderForm.at}
            onChange={(e) => setReminderForm((f) => ({ ...f, at: e.target.value }))}
            style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem', width: '6rem' }}
          />
          <Button type="submit" disabled={reminderLoading || !reminderForm.text.trim()}>
            {reminderLoading ? '…' : 'Add reminder'}
          </Button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {reminders.length === 0 && (
            <p style={{ color: colors.textMuted, fontSize: '0.95rem', margin: 0 }}>No reminders. Add one or say &quot;Remind me at 5 to call&quot; via voice.</p>
          )}
          {reminders.map((r) => (
            <div
              key={r.id}
              className="hover-card"
              style={{
                borderRadius: '0.8rem',
                padding: '0.6rem 0.9rem',
                border: `1px solid ${colors.borderSubtle}`,
                background: r.done ? colors.successBg : colors.surfaceSoft,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '1rem',
                color: colors.text
              }}
            >
              <div>
                <span style={{ textDecoration: r.done ? 'line-through' : 'none' }}>{r.text}</span>
                {r.at && <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: colors.textMuted }}>at {r.at}</span>}
              </div>
              <button
                type="button"
                onClick={() => handleReminderDone(r.id, !r.done)}
                disabled={togglingReminderId === r.id}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.9rem',
                  border: `1px solid ${colors.borderSubtle}`,
                  borderRadius: '0.5rem',
                  background: colors.surfaceSoft,
                  cursor: togglingReminderId === r.id ? 'wait' : 'pointer'
                }}
              >
                {togglingReminderId === r.id ? '…' : r.done ? 'Undo' : 'Done'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>My to-do list</h3>
        <form onSubmit={handleAddTodo} style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Add item (or say &quot;Add to my list: …&quot; via voice)"
            value={todoInput}
            onChange={(e) => setTodoInput(e.target.value)}
            style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
          />
          <Button type="submit" disabled={todoLoading || !todoInput.trim()}>
            {todoLoading ? '…' : 'Add'}
          </Button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {checklist.length === 0 && (
            <p style={{ color: colors.textMuted, fontSize: '0.95rem', margin: 0 }}>No items. Add one above or via voice.</p>
          )}
          {checklist.map((item) => (
            <div
              key={item.id}
              className="hover-card"
              style={{
                borderRadius: '0.8rem',
                padding: '0.6rem 0.9rem',
                border: `1px solid ${colors.borderSubtle}`,
                background: item.done ? colors.successBg : colors.surfaceSoft,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '1rem',
                color: colors.text
              }}
            >
              <input
                type="checkbox"
                checked={!!item.done}
                onChange={() => handleToggleTodo(item.id)}
                disabled={togglingTodoId === item.id}
                style={{ width: '1.2rem', height: '1.2rem', cursor: togglingTodoId === item.id ? 'wait' : 'pointer' }}
              />
              <span style={{ flex: 1, textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
              <button
                type="button"
                onClick={() => handleDeleteTodo(item.id)}
                aria-label="Delete"
                style={{
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.9rem',
                  border: `1px solid ${colors.borderSubtle}`,
                  borderRadius: '0.5rem',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: colors.textMuted
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

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

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>Notifications</h3>
        <p style={{ marginTop: '0.2rem', marginBottom: '0.5rem', color: colors.textMuted, fontSize: '0.95rem' }}>
          Enable medicine reminders on this device.
        </p>
        <PushSubscribe token={token} />
      </section>

      <PasskeyRegister token={token} />
      <Button variant="secondary" onClick={onLogout}>
        Log out
      </Button>
    </div>
  );
}

export default ElderDashboard;

