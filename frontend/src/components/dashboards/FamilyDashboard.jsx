import React, { useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';
import Tag from '../ui/Tag.jsx';
import PasskeyRegister from '../PasskeyRegister.jsx';
import { colors } from '../../design/tokens';
import { API_BASE_URL, getAuthHeaders } from '../../api';
import { getFamilyDashboardData } from '../../firebase/dashboardData.js';

const LOAD_ERROR_MESSAGE =
  "Could not load elder. Make sure you're linked: your elder's profile must list you as family.";

function FamilyDashboard({ currentUser, token, onLogout }) {
  const [acknowledgedIds, setAcknowledgedIds] = useState({});
  const [elders, setElders] = useState([]);
  const [selectedElderId, setSelectedElderId] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [linkElderPhone, setLinkElderPhone] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkSuccessName, setLinkSuccessName] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [medicineForm, setMedicineForm] = useState({ name: '', dosage: '', time: '', notes: '' });
  const [editingMedicineId, setEditingMedicineId] = useState(null);
  const [medicineLoading, setMedicineLoading] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', time: '' });
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskLoading, setTaskLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadError('');

    async function load() {
      try {
        const data = await getFamilyDashboardData(currentUser.id, token);
        if (!isMounted || !data) return;
        const elderList = Array.isArray(data.elders) ? data.elders : [];
        setElders(elderList);
        setSelectedElderId((prev) => {
          if (elderList.length === 0) return null;
          if (elderList.some((e) => e.id === prev)) return prev;
          return elderList[0].id;
        });
      } catch (error) {
        if (isMounted) setLoadError(LOAD_ERROR_MESSAGE);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, token, refreshTrigger]);

  const selectedElder = elders.find((e) => e.id === selectedElderId) || elders[0] || null;
  const allSosAlerts = elders.flatMap((e) => (e.sosAlerts || []).map((a) => ({ ...a, elderName: a.elderName || e.name || 'Elder', elderId: e.id }))).sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  const health = selectedElder
    ? (selectedElder.healthUpdates || []).map((u) => ({
        id: u.id,
        time: u.time || '',
        summary: u.title || u.summary || 'Update',
        details: u.details || ''
      }))
    : [];
  const medicineIntakeLogs = selectedElder ? (selectedElder.medicineIntakeLogs || []) : [];

  useEffect(() => {
    if (!selectedElderId || !token) {
      setMedicines([]);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/medicines`, {
          headers: getAuthHeaders(token)
        });
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setMedicines(Array.isArray(data.medicines) ? data.medicines : []);
        } else {
          setMedicines([]);
        }
      } catch {
        if (isMounted) setMedicines([]);
      }
    })();
    return () => { isMounted = false; };
  }, [selectedElderId, token, refreshTrigger]);

  useEffect(() => {
    if (!selectedElderId || !token) {
      setTasks([]);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/tasks`, {
          headers: getAuthHeaders(token)
        });
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        } else {
          setTasks([]);
        }
      } catch {
        if (isMounted) setTasks([]);
      }
    })();
    return () => { isMounted = false; };
  }, [selectedElderId, token, refreshTrigger]);

  const handleAddMedicine = async (e) => {
    e?.preventDefault();
    if (!selectedElderId || !medicineForm.name.trim()) return;
    if (editingMedicineId) {
      await handleUpdateMedicine(editingMedicineId, {
        name: medicineForm.name.trim(),
        dosage: medicineForm.dosage.trim(),
        time: medicineForm.time.trim(),
        notes: medicineForm.notes.trim()
      });
      setMedicineForm({ name: '', dosage: '', time: '', notes: '' });
      setEditingMedicineId(null);
      return;
    }
    setMedicineLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/medicines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({
          name: medicineForm.name.trim(),
          dosage: medicineForm.dosage.trim(),
          time: medicineForm.time.trim(),
          notes: medicineForm.notes.trim()
        })
      });
      if (res.ok) {
        setMedicineForm({ name: '', dosage: '', time: '', notes: '' });
        setRefreshTrigger((t) => t + 1);
      } else {
        const data = await res.json().catch(() => ({}));
        setLinkError(data.message || 'Failed to add medicine.');
      }
    } catch {
      setLinkError('Unable to reach the server.');
    } finally {
      setMedicineLoading(false);
    }
  };

  const handleUpdateMedicine = async (medicineId, payload) => {
    if (!selectedElderId) return;
    setMedicineLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/medicines/${medicineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditingMedicineId(null);
        setRefreshTrigger((t) => t + 1);
      }
    } catch {
      setLinkError('Unable to reach the server.');
    } finally {
      setMedicineLoading(false);
    }
  };

  const handleDeleteMedicine = async (medicineId) => {
    if (!selectedElderId) return;
    setMedicineLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/medicines/${medicineId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
      });
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch {
      setLinkError('Unable to reach the server.');
    } finally {
      setMedicineLoading(false);
    }
  };

  const handleAddTask = async (e) => {
    e?.preventDefault();
    if (!selectedElderId || !taskForm.title.trim()) return;
    if (editingTaskId) {
      await handleUpdateTask(editingTaskId, {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        time: taskForm.time.trim()
      });
      setTaskForm({ title: '', description: '', time: '' });
      setEditingTaskId(null);
      return;
    }
    setTaskLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          time: taskForm.time.trim()
        })
      });
      if (res.ok) {
        setTaskForm({ title: '', description: '', time: '' });
        setRefreshTrigger((t) => t + 1);
      } else {
        const data = await res.json().catch(() => ({}));
        setLinkError(data.message || 'Failed to add task.');
      }
    } catch {
      setLinkError('Unable to reach the server.');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleUpdateTask = async (taskId, payload) => {
    if (!selectedElderId) return;
    setTaskLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditingTaskId(null);
        setRefreshTrigger((t) => t + 1);
      }
    } catch {
      setLinkError('Unable to reach the server.');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!selectedElderId) return;
    setTaskLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/elders/${selectedElderId}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
      });
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch {
      setLinkError('Unable to reach the server.');
    } finally {
      setTaskLoading(false);
    }
  };

  const handleLinkToElder = async () => {
    const elderPhone = linkElderPhone.trim().replace(/\s/g, '');
    if (!elderPhone) {
      setLinkError('Enter the elder\'s phone number.');
      return;
    }
    setLinkError('');
    setLinkSuccessName('');
    setLinkLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/link-elder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ elderPhone })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLinkError(data.message || 'Failed to link.');
        return;
      }
      setLinkSuccessName(data.elderName || 'Elder');
      setLinkElderPhone('');
      setRefreshTrigger((t) => t + 1);
    } catch {
      setLinkError('Unable to reach the server.');
    } finally {
      setLinkLoading(false);
    }
  };

  const acknowledge = (id) => {
    setAcknowledgedIds((prev) => ({
      ...prev,
      [id]: true
    }));
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
        Welcome, {currentUser.fullName}
      </h2>
      <p style={{ marginTop: 0, marginBottom: '1.25rem', color: colors.textMuted }}>
        Monitor your loved one&apos;s medicines and recent health updates in one calm view.
      </p>

      {loadError && (
        <p style={{ color: colors.errorText, marginBottom: '1rem', fontSize: '1rem' }}>{loadError}</p>
      )}

      {allSosAlerts.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0, color: colors.errorText }}>SOS alerts</h3>
          <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {allSosAlerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id || alert.time}
                className="hover-card"
                style={{
                  borderRadius: '0.8rem',
                  padding: '0.75rem 0.9rem',
                  border: `2px solid ${colors.errorText}`,
                  background: colors.surfaceSoft,
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: colors.text
                }}
              >
                <span style={{ color: colors.errorText }}>SOS</span> — {alert.elderName || 'Elder'} · {alert.time ? new Date(alert.time).toLocaleString() : '—'}
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Elder overview</h3>
        {elders.length > 1 && (
          <div style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {elders.map((e) => (
              <button
                key={e.id}
                type="button"
                className="interactive-surface"
                onClick={() => setSelectedElderId(e.id)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '999px',
                  border: `2px solid ${selectedElderId === e.id ? colors.primary : colors.borderSubtle}`,
                  background: selectedElderId === e.id ? colors.surfaceSoft : 'transparent',
                  color: colors.text,
                  fontWeight: selectedElderId === e.id ? 600 : 400,
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                {e.name || 'Elder'}
              </button>
            ))}
          </div>
        )}
        <div
          className="hover-card"
          style={{
            borderRadius: '0.9rem',
            padding: '0.9rem 1rem',
            border: `1px solid ${colors.borderSubtle}`,
            background: colors.surfaceSoft,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
            fontSize: '1.02rem',
            color: colors.text
          }}
        >
          {elders.length === 0 ? (
            <>
              <p style={{ color: colors.textMuted, margin: 0 }}>No elder linked. Enter the elder&apos;s phone number below to link.</p>
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="tel"
                  placeholder="Elder's phone number"
                  value={linkElderPhone}
                  onChange={(e) => setLinkElderPhone(e.target.value)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '1rem',
                    border: `1px solid ${colors.borderSubtle}`,
                    borderRadius: '0.5rem'
                  }}
                />
                <Button
                  onClick={handleLinkToElder}
                  disabled={linkLoading}
                  style={{ marginTop: 0, alignSelf: 'flex-start' }}
                >
                  {linkLoading ? 'Linking…' : 'Link an elder'}
                </Button>
                {linkSuccessName && <p style={{ color: colors.successText, margin: 0, fontSize: '0.95rem' }}>Linked to {linkSuccessName}</p>}
                {linkError && <p style={{ color: colors.errorText, margin: 0, fontSize: '0.95rem' }}>{linkError}</p>}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{selectedElder?.name || 'Elder'}</span>
                {allSosAlerts.length > 0 ? (
                  <Tag tone="warning">SOS alert(s)</Tag>
                ) : (
                  <Tag tone="success">No active SOS</Tag>
                )}
              </div>
              {(selectedElder?.age || selectedElder?.location) && (
                <span>
                  {selectedElder?.age ? `${selectedElder.age} years` : ''}{selectedElder?.age && selectedElder?.location ? ' • ' : ''}{selectedElder?.location || ''}
                </span>
              )}
              {selectedElder?.primaryCondition && (
                <span style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                  Condition: {selectedElder.primaryCondition}
                </span>
              )}
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: `1px solid ${colors.borderSubtle}` }}>
                <p style={{ color: colors.textMuted, margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Link another elder</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input
                    type="tel"
                    placeholder="Elder's phone number"
                    value={linkElderPhone}
                    onChange={(e) => setLinkElderPhone(e.target.value)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      fontSize: '1rem',
                      border: `1px solid ${colors.borderSubtle}`,
                      borderRadius: '0.5rem'
                    }}
                  />
                  <Button
                    onClick={handleLinkToElder}
                    disabled={linkLoading}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {linkLoading ? 'Linking…' : 'Link another elder'}
                  </Button>
                  {linkSuccessName && <p style={{ color: colors.successText, margin: 0, fontSize: '0.95rem' }}>Linked to {linkSuccessName}</p>}
                  {linkError && <p style={{ color: colors.errorText, margin: 0, fontSize: '0.95rem' }}>{linkError}</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {selectedElderId && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Medicines</h3>
          <form
            onSubmit={handleAddMedicine}
            style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '24rem' }}
          >
            <input
              type="text"
              placeholder="Medicine name"
              value={medicineForm.name}
              onChange={(e) => setMedicineForm((f) => ({ ...f, name: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Dosage"
              value={medicineForm.dosage}
              onChange={(e) => setMedicineForm((f) => ({ ...f, dosage: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Time (e.g. 8:00 AM)"
              value={medicineForm.time}
              onChange={(e) => setMedicineForm((f) => ({ ...f, time: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Notes (optional)"
              value={medicineForm.notes}
              onChange={(e) => setMedicineForm((f) => ({ ...f, notes: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="submit" disabled={medicineLoading || !medicineForm.name.trim()}>
                {medicineLoading ? 'Saving…' : editingMedicineId ? 'Update medicine' : 'Add medicine'}
              </Button>
              {editingMedicineId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setEditingMedicineId(null); setMedicineForm({ name: '', dosage: '', time: '', notes: '' }); }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {medicines.length === 0 && (
              <p style={{ color: colors.textMuted, fontSize: '0.95rem', margin: 0 }}>No medicines added yet.</p>
            )}
            {medicines.map((m) => (
              <div
                key={m.id}
                className="hover-card"
                style={{
                  borderRadius: '0.8rem',
                  padding: '0.75rem 0.9rem',
                  border: `1px solid ${colors.borderSubtle}`,
                  background: colors.surfaceSoft,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '0.98rem',
                  color: colors.text
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: '0.9rem', color: colors.textMuted }}>{m.dosage || '—'} · {m.time || '—'}</div>
                  {m.notes && <div style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>{m.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="secondary"
                    onClick={() => { setEditingMedicineId(m.id); setMedicineForm({ name: m.name, dosage: m.dosage || '', time: m.time || '', notes: m.notes || '' }); }}
                    disabled={medicineLoading}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem' }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleDeleteMedicine(m.id)}
                    disabled={medicineLoading}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem' }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedElderId && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0 }}>Tasks</h3>
          <form
            onSubmit={handleAddTask}
            style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '24rem' }}
          >
            <input
              type="text"
              placeholder="Task title"
              value={taskForm.title}
              onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={taskForm.description}
              onChange={(e) => setTaskForm((f) => ({ ...f, description: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <input
              type="text"
              placeholder="Time (e.g. 9:00 AM)"
              value={taskForm.time}
              onChange={(e) => setTaskForm((f) => ({ ...f, time: e.target.value }))}
              style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="submit" disabled={taskLoading || !taskForm.title.trim()}>
                {taskLoading ? 'Saving…' : editingTaskId ? 'Update task' : 'Add task'}
              </Button>
              {editingTaskId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setEditingTaskId(null); setTaskForm({ title: '', description: '', time: '' }); }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {tasks.length === 0 && (
              <p style={{ color: colors.textMuted, fontSize: '0.95rem', margin: 0 }}>No tasks yet.</p>
            )}
            {tasks.map((t) => (
              <div
                key={t.id}
                className="hover-card"
                style={{
                  borderRadius: '0.8rem',
                  padding: '0.75rem 0.9rem',
                  border: `1px solid ${colors.borderSubtle}`,
                  background: colors.surfaceSoft,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  fontSize: '0.98rem',
                  color: colors.text
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{t.title || 'Task'}</div>
                  {t.description && <div style={{ fontSize: '0.9rem', color: colors.textMuted }}>{t.description}</div>}
                  <div style={{ fontSize: '0.9rem', color: colors.textMuted }}>{t.time || '—'} {t.completed && <Tag tone="success">Done</Tag>}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="secondary"
                    onClick={() => { setEditingTaskId(t.id); setTaskForm({ title: t.title || '', description: t.description || '', time: t.time || '' }); }}
                    disabled={taskLoading}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem' }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleDeleteTask(t.id)}
                    disabled={taskLoading}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem' }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Recent health updates</h3>
        <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {health.length === 0 && (
            <p style={{ color: colors.textMuted, fontSize: '0.95rem', margin: 0 }}>No health updates yet.</p>
          )}
          {health.map((u) => (
            <div
              key={u.id}
              className="hover-card"
              style={{
                borderRadius: '0.8rem',
                padding: '0.75rem 0.9rem',
                border: `1px solid ${colors.borderSubtle}`,
                background: colors.surfaceSoft,
                fontSize: '0.98rem',
                color: colors.text
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.35rem'
                }}
              >
                <span style={{ fontWeight: 600 }}>{u.summary}</span>
                <span style={{ fontSize: '0.85rem', color: colors.textMuted }}>{u.time}</span>
              </div>
              <p style={{ margin: 0 }}>{u.details}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Medicine intake</h3>
        <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {medicineIntakeLogs.length === 0 && (
            <p style={{ color: colors.textMuted, fontSize: '0.95rem', margin: 0 }}>No intake logs yet.</p>
          )}
          {medicineIntakeLogs.map((log) => {
            const isAck = !!acknowledgedIds[log.id];
            return (
              <div
                key={log.id}
                style={{
                  borderRadius: '0.8rem',
                  padding: '0.75rem 0.9rem',
                  border: `1px solid ${colors.borderSubtle}`,
                  background: colors.surfaceSoft,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.98rem',
                  color: colors.text
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{log.medicineName}</div>
                  <div style={{ fontSize: '0.9rem', color: colors.textMuted }}>{log.time}</div>
                  <div style={{ fontSize: '0.9rem', marginTop: '0.15rem' }}>
                    Status:{' '}
                    <Tag tone={log.status === 'Taken' ? 'success' : 'warning'}>
                      {log.status}
                    </Tag>
                  </div>
                </div>
                {!isAck && (
                  <button
                    type="button"
                    className="interactive-surface"
                    onClick={() => acknowledge(log.id)}
                    style={{
                      borderRadius: '999px',
                      padding: '0.35rem 0.9rem',
                      border: `1px solid ${colors.borderSubtle}`,
                      background: 'transparent',
                      color: colors.text,
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Mark seen
                  </button>
                )}
                {isAck && (
                  <span style={{ fontSize: '0.85rem', color: colors.successText }}>Seen</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <PasskeyRegister token={token} />
      <Button variant="secondary" onClick={onLogout}>
        Log out
      </Button>
    </div>
  );
}

export default FamilyDashboard;

