import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Tag from '../components/ui/Tag.jsx';
import VoiceAssistant from '../components/VoiceAssistant.jsx';
import WellbeingCheck from '../components/WellbeingCheck.jsx';
import PushSubscribe from '../components/PushSubscribe.jsx';
import PasskeyRegister from '../components/PasskeyRegister.jsx';
import { colors } from '../design/tokens';
import { toAuthenticationOptions, credentialToJSON, supportsWebAuthn } from '../webauthnHelpers.js';
import { getElderDashboardData } from '../firebase/dashboardData.js';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { useActionState, ACTION_STATUS } from '../hooks/useActionState';
import { playReminderBell } from '../utils/reminderBell.js';
import { parseTimeToMinutes } from '../utils/timeUtils.js';

const today = () => new Date().toISOString().slice(0, 10);

function ElderOverviewPage() {
  const { currentUser, token, onLogout } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [medicines, setMedicines] = useState([]);
  const [medicineIntakeLogs, setMedicineIntakeLogs] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [reminderForm, setReminderForm] = useState({ text: '', at: '', date: '' });
  const [todoInput, setTodoInput] = useState('');
  const [reminderLoading, setReminderLoading] = useState(false);
  const [todoLoading, setTodoLoading] = useState(false);
  const [togglingReminderId, setTogglingReminderId] = useState(null);
  const [togglingTodoId, setTogglingTodoId] = useState(null);
  const [markingId, setMarkingId] = useState(null);
  const [completingTaskId, setCompletingTaskId] = useState(null);
  const [showWellbeingCheck, setShowWellbeingCheck] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOlderTasks, setShowOlderTasks] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePasswordStep, setChangePasswordStep] = useState('verify'); // 'verify' | 'newPassword'
  const [changePasswordCurrentPassword, setChangePasswordCurrentPassword] = useState('');
  const [changePasswordToken, setChangePasswordToken] = useState(null);
  const [changePasswordNew, setChangePasswordNew] = useState('');
  const [changePasswordConfirm, setChangePasswordConfirm] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false);
  const sosAction = useActionState({ autoResetMs: 5000 });
  const addReminderAction = useActionState({ autoResetMs: 3000 });
  const todayStr = today();
  const tasksForToday = useMemo(() => tasks.filter((t) => (t.date || '').slice(0, 10) === todayStr || (!t.date && true)), [tasks, todayStr]);
  const tasksOlder = useMemo(() => tasks.filter((t) => (t.date || '').slice(0, 10) !== todayStr && (t.date || '').slice(0, 10) < todayStr).sort((a, b) => (b.date || '').localeCompare(a.date || '')), [tasks, todayStr]);
  const remindersTodayOnly = useMemo(() => reminders.filter((r) => (r.date || '').slice(0, 10) === todayStr || !r.date), [reminders, todayStr]);
  const reminderBellPlayedIds = useRef(new Set());

  useEffect(() => {
    const q = searchParams.get('wellbeing');
    if (q === '1') setShowWellbeingCheck(true);
  }, [searchParams]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      remindersTodayOnly.forEach((r) => {
        if (r.done) return;
        const remMin = parseTimeToMinutes(r.at);
        if (remMin < 0) return;
        if (remMin === currentMin && !reminderBellPlayedIds.current.has(r.id)) {
          reminderBellPlayedIds.current.add(r.id);
          playReminderBell();
        }
      });
    };
    tick();
    const id = setInterval(tick, 30 * 1000);
    return () => clearInterval(id);
  }, [remindersTodayOnly]);

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
              times: Array.isArray(m.times) ? m.times : (m.time ? [m.time] : [])
            }))
          );
        } else setMedicines([]);
        setMedicineIntakeLogs(Array.isArray(data.medicineIntakeLogs) ? data.medicineIntakeLogs : []);
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      } catch (_) {}
    }
    if (currentUser?.id) load();
    return () => { isMounted = false; };
  }, [currentUser?.id, token, refreshTrigger]);

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
    if (token) load();
    return () => { isMounted = false; };
  }, [token, refreshTrigger]);

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
    if (token) load();
    return () => { isMounted = false; };
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
        { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) }, body: JSON.stringify({}) }
      );
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch (_) {}
    setMarkingId(null);
  };

  const handleTaskComplete = async (taskId) => {
    setCompletingTaskId(taskId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/elders/${currentUser.id}/tasks/${taskId}/complete`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) }, body: JSON.stringify({}) }
      );
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch (_) {}
    setCompletingTaskId(null);
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!reminderForm.text.trim() || reminderLoading) return;
    setReminderLoading(true);
    addReminderAction.setPending();
    try {
      const res = await fetch(`${API_BASE_URL}/ai/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ text: reminderForm.text.trim(), at: reminderForm.at.trim(), date: reminderForm.date || '' })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setReminderForm({ text: '', at: '', date: '' });
        setRefreshTrigger((t) => t + 1);
        addReminderAction.setSuccess();
      } else addReminderAction.setError(data.message || 'Failed to add reminder.');
    } catch (_) {
      addReminderAction.setError('Request failed.');
    } finally {
      setReminderLoading(false);
    }
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
      const res = await fetch(`${API_BASE_URL}/ai/checklist/${id}`, { method: 'DELETE', headers: getAuthHeaders(token) });
      if (res.ok) setRefreshTrigger((t) => t + 1);
    } catch (_) {}
  };

  const handleSOS = async () => {
    sosAction.setPending();
    let body = {};
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, maximumAge: 60000 });
        });
        if (pos?.coords) body = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (_) {}
    }
    try {
      const res = await fetch(`${API_BASE_URL}/sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify(body)
      });
      if (res.ok) sosAction.setSuccess();
      else {
        const data = await res.json().catch(() => ({}));
        sosAction.setError(data.message || 'Failed to send SOS.');
      }
    } catch (_) {
      sosAction.setSuccess();
    }
  };

  const openChangePassword = () => {
    setShowChangePassword(true);
    setChangePasswordStep('verify');
    setChangePasswordCurrentPassword('');
    setChangePasswordToken(null);
    setChangePasswordNew('');
    setChangePasswordConfirm('');
    setChangePasswordError('');
    setChangePasswordSuccess(false);
  };

  const closeChangePassword = () => {
    setShowChangePassword(false);
    setChangePasswordStep('verify');
    setChangePasswordCurrentPassword('');
    setChangePasswordToken(null);
    setChangePasswordNew('');
    setChangePasswordConfirm('');
    setChangePasswordError('');
  };

  const handleVerifyWithPassword = () => {
    if (!changePasswordCurrentPassword.trim()) {
      setChangePasswordError('Enter your current password.');
      return;
    }
    setChangePasswordError('');
    setChangePasswordStep('newPassword');
  };

  const handleVerifyWithPasskey = async () => {
    setChangePasswordError('');
    setChangePasswordLoading(true);
    try {
      const optionsRes = await fetch(`${API_BASE_URL}/auth/webauthn/password-change-options`, {
        headers: getAuthHeaders(token)
      });
      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) {
        setChangePasswordError(optionsData.message || 'Could not start verification.');
        return;
      }
      const publicKey = toAuthenticationOptions(optionsData);
      const credential = await navigator.credentials.get({ publicKey });
      if (!credential) {
        setChangePasswordError('Verification was cancelled.');
        return;
      }
      const verifyRes = await fetch(`${API_BASE_URL}/auth/webauthn/verify-for-password-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify(credentialToJSON(credential))
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setChangePasswordError(verifyData.message || 'Verification failed.');
        return;
      }
      if (verifyData.changePasswordToken) {
        setChangePasswordToken(verifyData.changePasswordToken);
        setChangePasswordStep('newPassword');
      } else {
        setChangePasswordError('Verification failed.');
      }
    } catch (err) {
      setChangePasswordError(err.message || 'Verification failed.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleSubmitNewPassword = async (e) => {
    e?.preventDefault();
    if (changePasswordNew.length < 6) {
      setChangePasswordError('New password must be at least 6 characters.');
      return;
    }
    if (changePasswordNew !== changePasswordConfirm) {
      setChangePasswordError('New password and confirmation do not match.');
      return;
    }
    setChangePasswordError('');
    setChangePasswordLoading(true);
    try {
      const body = changePasswordToken
        ? { changePasswordToken, newPassword: changePasswordNew, confirmNewPassword: changePasswordConfirm }
        : { currentPassword: changePasswordCurrentPassword, newPassword: changePasswordNew, confirmNewPassword: changePasswordConfirm };
      const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setChangePasswordSuccess(true);
        setChangePasswordNew('');
        setChangePasswordConfirm('');
        setTimeout(() => { closeChangePassword(); setShowSettings(false); }, 1500);
      } else {
        setChangePasswordError(data.message || 'Failed to update password.');
      }
    } catch (_) {
      setChangePasswordError('Failed to update password. Try again.');
    } finally {
      setChangePasswordLoading(false);
    }
  };

  if (!currentUser || currentUser.role !== 'elderly') return null;

  return (
    <div style={{ position: 'relative' }}>
      <Link to="/" style={{ fontSize: '1rem', color: colors.primary, marginBottom: '1rem', display: 'inline-block' }}>← Back to Dashboard</Link>
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        aria-label="Settings"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: `1px solid ${colors.borderSubtle}`,
          background: colors.surfaceSoft,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem'
        }}
      >
        ⚙
      </button>
      {showSettings && (
        <div
          role="dialog"
          aria-label="Settings"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowSettings(false)}
        >
          <div
            style={{
              background: colors.surface,
              borderRadius: '1rem',
              padding: '1.5rem',
              maxWidth: 400,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.25rem' }}>Settings</h3>
            <p style={{ marginBottom: '0.5rem', fontSize: '0.95rem', color: colors.textMuted }}>Account</p>
            <p style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem' }}>{currentUser?.fullName || '—'}</p>
            <p style={{ marginBottom: '0.5rem', fontSize: '0.95rem', color: colors.textMuted }}>{Array.isArray(currentUser?.emails) && currentUser.emails.length > 0 ? 'Emails' : 'Email'}</p>
            {Array.isArray(currentUser?.emails) && currentUser.emails.length > 0 ? (
              <ul style={{ marginTop: 0, marginBottom: '1rem', paddingLeft: '1.25rem', fontSize: '1rem' }}>
                {currentUser.emails.map((e, i) => (
                  <li key={i}>{e || '—'}</li>
                ))}
              </ul>
            ) : (
              <p style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>{currentUser?.email || '—'}</p>
            )}
            <p style={{ marginBottom: '0.5rem', fontSize: '0.95rem', color: colors.textMuted }}>Phone (edit in profile)</p>
            <p style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem' }}>{currentUser?.phone || '—'}</p>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.95rem', color: colors.textMuted }}>Enable notifications</p>
              <PushSubscribe token={token} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.95rem', color: colors.textMuted }}>Fingerprint / passkey login</p>
              <PasskeyRegister token={token} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.95rem', color: colors.textMuted }}>Change password</p>
              {!showChangePassword ? (
                <Button variant="secondary" onClick={openChangePassword} style={{ width: '100%', minHeight: 44 }}>Change password</Button>
              ) : changePasswordSuccess ? (
                <p style={{ margin: 0, color: colors.successText || colors.primary, fontSize: '1rem' }}>Password updated successfully.</p>
              ) : changePasswordStep === 'verify' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>Verify your identity:</p>
                  <input
                    type="password"
                    placeholder="Current password"
                    value={changePasswordCurrentPassword}
                    onChange={(e) => setChangePasswordCurrentPassword(e.target.value)}
                    style={{ padding: '0.6rem 0.9rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem', minHeight: 44 }}
                  />
                  <Button onClick={handleVerifyWithPassword} style={{ minHeight: 44 }}>Continue with password</Button>
                  {supportsWebAuthn() && (
                    <Button variant="secondary" onClick={handleVerifyWithPasskey} disabled={changePasswordLoading} style={{ minHeight: 44 }}>
                      {changePasswordLoading ? 'Verifying…' : 'Verify with fingerprint (passkey)'}
                    </Button>
                  )}
                  <Button variant="secondary" onClick={closeChangePassword} style={{ minHeight: 40, fontSize: '0.95rem' }}>Cancel</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmitNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input
                    type="password"
                    placeholder="New password"
                    value={changePasswordNew}
                    onChange={(e) => setChangePasswordNew(e.target.value)}
                    minLength={6}
                    style={{ padding: '0.6rem 0.9rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem', minHeight: 44 }}
                  />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={changePasswordConfirm}
                    onChange={(e) => setChangePasswordConfirm(e.target.value)}
                    minLength={6}
                    style={{ padding: '0.6rem 0.9rem', fontSize: '1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem', minHeight: 44 }}
                  />
                  {changePasswordError && <p style={{ margin: 0, color: colors.errorText, fontSize: '0.9rem' }}>{changePasswordError}</p>}
                  <Button type="submit" disabled={changePasswordLoading || changePasswordNew.length < 6 || changePasswordNew !== changePasswordConfirm} style={{ minHeight: 44 }}>
                    {changePasswordLoading ? 'Updating…' : 'Update password'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={closeChangePassword} style={{ minHeight: 40, fontSize: '0.95rem' }}>Cancel</Button>
                </form>
              )}
            </div>
            <Button variant="secondary" onClick={() => setShowSettings(false)} style={{ width: '100%', minHeight: 48 }}>Close</Button>
          </div>
        </div>
      )}
      {showWellbeingCheck && (
        <WellbeingCheck token={token} onClose={() => setShowWellbeingCheck(false)} onSubmitted={() => setRefreshTrigger((t) => t + 1)} />
      )}
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 700, textAlign: 'center' }}>Overview</h2>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>Voice assistant</h3>
        <p style={{ marginTop: '0.2rem', marginBottom: '0.5rem', color: colors.textMuted, fontSize: '0.95rem' }}>
          Hold the mic and ask about your medicines, tasks, or say &quot;I need help&quot; for SOS.
        </p>
        <VoiceAssistant token={token} onAction={() => setRefreshTrigger((t) => t + 1)} />
      </section>
      <section style={{ marginBottom: '1.5rem' }}>
        <p style={{ marginTop: 0, marginBottom: '0.5rem', color: colors.textMuted, fontSize: '0.95rem' }}>Quick actions</p>
        <Button variant="secondary" onClick={() => setShowWellbeingCheck(true)} style={{ minHeight: '44px', fontSize: '0.95rem', padding: '0.5rem 1rem' }}>
          How are you feeling?
        </Button>
      </section>

      {recommendations.length > 0 && (
        <section style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>Daily tips</h3>
          <div className="hover-card" style={{ borderRadius: '0.9rem', padding: '0.9rem 1rem', border: `1px solid ${colors.borderSubtle}`, background: colors.surfaceSoft, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recommendations.map((tip, i) => (
              <p key={i} style={{ margin: 0, fontSize: '1rem', color: colors.text }}>{tip}</p>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>Today&apos;s reminders</h3>
        <form onSubmit={handleAddReminder} style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <input type="text" placeholder="What to remind" value={reminderForm.text} onChange={(e) => setReminderForm((f) => ({ ...f, text: e.target.value }))} style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem', minWidth: '12rem', minHeight: 48 }} />
          <input type="text" placeholder="Time (e.g. 17:00)" value={reminderForm.at} onChange={(e) => setReminderForm((f) => ({ ...f, at: e.target.value }))} style={{ padding: '0.75rem 1rem', fontSize: '1.1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem', width: '7rem', minHeight: 48 }} />
          <Button type="submit" disabled={reminderLoading || !reminderForm.text.trim()} style={{ minHeight: 48, fontSize: '1.1rem', padding: '0.75rem 1.25rem' }}>{reminderLoading ? '…' : 'Add reminder'}</Button>
        </form>
        {addReminderAction.status === ACTION_STATUS.SUCCESS && <p className="info-message" style={{ marginBottom: '0.5rem' }}>Reminder added.</p>}
        {addReminderAction.status === ACTION_STATUS.ERROR && <p style={{ marginBottom: '0.5rem', color: colors.errorText, fontSize: '0.95rem' }}>{addReminderAction.error}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {remindersTodayOnly.length === 0 && <p style={{ color: colors.textMuted, fontSize: '0.95rem', margin: 0 }}>No reminders for today. Add one or say &quot;Remind me at 5 to call&quot; via voice.</p>}
          {remindersTodayOnly.map((r) => (
            <div key={r.id} className="hover-card" style={{ borderRadius: '0.8rem', padding: '0.6rem 0.9rem', border: `1px solid ${colors.borderSubtle}`, background: r.done ? colors.successBg : colors.surfaceSoft, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', color: colors.text }}>
              <div>
                <span style={{ textDecoration: r.done ? 'line-through' : 'none' }}>{r.text}</span>
                {r.at && <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: colors.textMuted }}>at {r.at}</span>}
              </div>
              <button type="button" onClick={() => handleReminderDone(r.id, !r.done)} disabled={togglingReminderId === r.id} style={{ padding: '0.35rem 0.75rem', fontSize: '0.9rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem', background: colors.surfaceSoft, cursor: togglingReminderId === r.id ? 'wait' : 'pointer' }}>
                {togglingReminderId === r.id ? '…' : r.done ? 'Undo' : 'Done'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>My to-do list</h3>
        <form onSubmit={handleAddTodo} style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}>
          <input type="text" placeholder='Add item (or say "Add to my list: …" via voice)' value={todoInput} onChange={(e) => setTodoInput(e.target.value)} style={{ flex: 1, padding: '0.75rem 1rem', fontSize: '1.1rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem', minHeight: 48 }} />
          <Button type="submit" disabled={todoLoading || !todoInput.trim()} style={{ minHeight: 48, fontSize: '1.1rem', padding: '0.75rem 1.25rem' }}>{todoLoading ? '…' : 'Add'}</Button>
        </form>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {checklist.length === 0 && <p style={{ color: colors.textMuted, fontSize: '0.95rem', margin: 0 }}>No items. Add one above or via voice.</p>}
          {checklist.map((item) => (
            <div key={item.id} className="hover-card" style={{ borderRadius: '0.8rem', padding: '0.75rem 1rem', border: `1px solid ${colors.borderSubtle}`, background: item.done ? colors.successBg : colors.surfaceSoft, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.05rem', color: colors.text, minHeight: 52 }}>
              <input type="checkbox" checked={!!item.done} onChange={() => handleToggleTodo(item.id)} disabled={togglingTodoId === item.id} style={{ width: '1.4rem', height: '1.4rem', cursor: togglingTodoId === item.id ? 'wait' : 'pointer' }} />
              <span style={{ flex: 1, textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
              <button type="button" onClick={() => handleDeleteTodo(item.id)} aria-label="Delete" style={{ padding: '0.4rem 0.75rem', fontSize: '1rem', minHeight: 44, border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem', background: 'transparent', cursor: 'pointer', color: colors.textMuted }}>Delete</button>
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
          {medicines.length === 0 && <p style={{ color: colors.textMuted, fontSize: '0.95rem' }}>No medicines added yet. Add them in your profile or ask a family member.</p>}
          {medicines.map((m) => {
            const isTaken = takenTodaySet.has(m.id);
            const isMarking = markingId === m.id;
            return (
              <button key={m.id} type="button" className="hover-card" onClick={() => !isTaken && !isMarking && handleMarkTaken(m.id)} disabled={isTaken || isMarking}
                style={{ textAlign: 'left', borderRadius: '0.9rem', padding: '0.8rem 0.9rem', border: `1px solid ${colors.borderSubtle}`, background: isTaken ? colors.successBg : colors.surfaceSoft, color: colors.text, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.02rem', cursor: isTaken || isMarking ? 'default' : 'pointer' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>{m.dosage}</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Time: {m.times.join(', ') || '—'}</div>
                </div>
                <Tag tone={isTaken ? 'success' : 'warning'}>{isMarking ? 'Saving…' : isTaken ? 'Taken' : 'Tap when taken'}</Tag>
              </button>
            );
          })}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Today&apos;s tasks</h3>
          {tasksOlder.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOlderTasks((v) => !v)}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.95rem', border: `1px solid ${colors.borderSubtle}`, borderRadius: '0.5rem', background: colors.surfaceSoft, cursor: 'pointer', color: colors.primary, fontWeight: 600 }}
            >
              {showOlderTasks ? '▲ Hide older' : `▼ Show older (${tasksOlder.length})`}
            </button>
          )}
        </div>
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {tasksForToday.length === 0 && !showOlderTasks && <p style={{ color: colors.textMuted, fontSize: '0.95rem' }}>No tasks for today.</p>}
          {tasksForToday.map((t) => {
            const isComplete = !!t.completed;
            const isCompleting = completingTaskId === t.id;
            return (
              <div key={t.id} className="hover-card" style={{ borderRadius: '0.9rem', padding: '0.9rem 1rem', border: `1px solid ${colors.borderSubtle}`, background: isComplete ? colors.successBg : colors.surfaceSoft, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', fontSize: '1.05rem', color: colors.text, minHeight: 56 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{t.title || 'Task'}</div>
                  {t.description && <div style={{ fontSize: '0.95rem', opacity: 0.9, marginTop: '0.2rem' }}>{t.description}</div>}
                  {t.time && <div style={{ fontSize: '0.95rem', opacity: 0.8 }}>Time: {t.time}</div>}
                </div>
                {!isComplete ? <Button onClick={() => handleTaskComplete(t.id)} disabled={isCompleting} style={{ minHeight: 48, padding: '0.6rem 1.25rem', fontSize: '1.05rem' }}>{isCompleting ? '…' : 'Done'}</Button> : <Tag tone="success">Done</Tag>}
              </div>
            );
          })}
          {showOlderTasks && tasksOlder.length > 0 && (
            <>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: colors.textMuted }}>Older tasks</p>
              {tasksOlder.map((t) => {
                const isComplete = !!t.completed;
                const isCompleting = completingTaskId === t.id;
                return (
                  <div key={t.id} className="hover-card" style={{ borderRadius: '0.9rem', padding: '0.8rem 1rem', border: `1px solid ${colors.borderSubtle}`, background: isComplete ? colors.successBg : colors.surfaceSoft, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', fontSize: '1rem', color: colors.text, opacity: 0.9 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{t.title || 'Task'}</div>
                      {t.date && <div style={{ fontSize: '0.85rem', color: colors.textMuted }}>{t.date}</div>}
                    </div>
                    {!isComplete ? <Button onClick={() => handleTaskComplete(t.id)} disabled={isCompleting} style={{ minHeight: 44, padding: '0.5rem 1rem' }}>{isCompleting ? '…' : 'Done'}</Button> : <Tag tone="success">Done</Tag>}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>Need quick help?</h3>
        <p style={{ marginTop: '0.2rem', marginBottom: '0.9rem', color: colors.textMuted, fontSize: '1.05rem' }}>If you suddenly feel unwell, press the SOS button so your family can check on you.</p>
        <Button variant="danger" onClick={handleSOS} disabled={sosAction.status === ACTION_STATUS.PENDING} style={{ minHeight: 56, fontSize: '1.25rem', padding: '0.75rem 1.5rem' }}>{sosAction.status === ACTION_STATUS.PENDING ? 'Sending…' : 'SOS – I need help'}</Button>
        {sosAction.status === ACTION_STATUS.SUCCESS && <p className="info-message" style={{ marginTop: '0.75rem' }}>SOS alert noted. Your family members will be notified in the monitoring portal.</p>}
        {sosAction.status === ACTION_STATUS.ERROR && <p style={{ marginTop: '0.75rem', color: colors.errorText, fontSize: '0.95rem' }}>{sosAction.error}</p>}
      </section>

    </div>
  );
}

export default ElderOverviewPage;
