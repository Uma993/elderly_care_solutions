import React, { useEffect, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import { colors, radii, spacing } from '../design/tokens';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { useActionState, ACTION_STATUS } from '../hooks/useActionState';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['male', 'female', 'other'];
const MOBILITY_OPTIONS = ['none', 'walker', 'wheelchair', 'cane', 'other'];

const inputStyle = {
  padding: `${spacing.sm} ${spacing.md}`,
  fontSize: '1rem',
  border: `1px solid ${colors.borderSubtle}`,
  borderRadius: radii.button,
  width: '100%',
  boxSizing: 'border-box'
};

const sectionStyle = {
  marginBottom: spacing.xl,
  padding: spacing.lg,
  borderRadius: radii.card,
  border: `1px solid ${colors.borderSubtle}`,
  background: colors.surfaceSoft
};

function Section({ title, children }) {
  return (
    <div style={sectionStyle}>
      <h3 style={{ marginTop: 0, marginBottom: spacing.md, fontSize: '1.1rem', fontWeight: 600 }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, optional, children }) {
  return (
    <div style={{ marginBottom: spacing.md }}>
      <label style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.95rem', color: optional ? colors.textMuted : colors.text }}>
        {label}{optional ? ' (optional)' : ''}
      </label>
      {children}
    </div>
  );
}

function ElderProfilePage() {
  const { currentUser, token } = useOutletContext();
  const [profile, setProfile] = useState(null);
  const [hasProfileAdded, setHasProfileAdded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const saveAction = useActionState({ autoResetMs: 3000 });
  const [fitbitConnected, setFitbitConnected] = useState(false);
  const [fitbitLastSyncAt, setFitbitLastSyncAt] = useState(null);
  const [fitbitLoading, setFitbitLoading] = useState(false);
  const [fitbitSyncPending, setFitbitSyncPending] = useState(false);
  const [fitbitMessage, setFitbitMessage] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!currentUser?.id || currentUser?.role !== 'elderly') return;
      try {
        const res = await fetch(`${API_BASE_URL}/elders/${currentUser.id}/profile`, {
          headers: getAuthHeaders(token)
        });
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setHasProfileAdded(data.hasProfileAdded);
          setProfile(data.profile || {});
          setForm(data.profile || {});
        }
      } catch (_) {}
      if (isMounted) setLoading(false);
    }
    load();
    return () => { isMounted = false; };
  }, [currentUser?.id, currentUser?.role, token]);

  useEffect(() => {
    const fitbit = searchParams.get('fitbit');
    if (fitbit === 'connected') {
      setFitbitMessage('Fitbit connected successfully.');
      setFitbitConnected(true);
      setSearchParams({}, { replace: true });
    } else if (fitbit === 'error') {
      setFitbitMessage('Fitbit connection failed. Please try again.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let isMounted = true;
    async function loadStatus() {
      if (!currentUser?.id || currentUser?.role !== 'elderly' || !token) return;
      setFitbitLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/fitbit/status`, { headers: getAuthHeaders(token) });
        if (!isMounted) return;
        if (res.ok) {
          const data = await res.json();
          setFitbitConnected(data.connected);
          setFitbitLastSyncAt(data.lastSyncAt || null);
        }
      } catch (_) {}
      if (isMounted) setFitbitLoading(false);
    }
    loadStatus();
    return () => { isMounted = false; };
  }, [currentUser?.id, currentUser?.role, token]);

  const handleConnectFitbit = async () => {
    if (!token) return;
    setFitbitLoading(true);
    setFitbitMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/fitbit/auth`, { headers: getAuthHeaders(token) });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setFitbitMessage(data.message || 'Could not start Fitbit connection.');
    } catch {
      setFitbitMessage('Unable to reach the server.');
    }
    setFitbitLoading(false);
  };

  const handleSyncFitbit = async () => {
    if (!token) return;
    setFitbitSyncPending(true);
    setFitbitMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/fitbit/sync`, {
        method: 'POST',
        headers: getAuthHeaders(token)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setFitbitMessage('Synced.');
        setFitbitLastSyncAt(new Date().toISOString());
        if (data.profile) {
          setProfile(data.profile);
          setForm(data.profile);
        }
      } else {
        setFitbitMessage(data.message || 'Sync failed.');
      }
    } catch {
      setFitbitMessage('Unable to reach the server.');
    }
    setFitbitSyncPending(false);
  };

  const handleDisconnectFitbit = async () => {
    if (!token) return;
    setFitbitLoading(true);
    setFitbitMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/fitbit/disconnect`, {
        method: 'DELETE',
        headers: getAuthHeaders(token)
      });
      if (res.ok) {
        setFitbitConnected(false);
        setFitbitLastSyncAt(null);
        setFitbitMessage('Disconnected.');
      } else {
        const data = await res.json().catch(() => ({}));
        setFitbitMessage(data.message || 'Disconnect failed.');
      }
    } catch {
      setFitbitMessage('Unable to reach the server.');
    }
    setFitbitLoading(false);
  };

  const updateForm = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const updateNested = (key, subKey, value) =>
    setForm((f) => ({ ...f, [key]: { ...(f[key] || {}), [subKey]: value } }));

  const handleSave = async (e) => {
    e.preventDefault();
    saveAction.setPending();
    try {
      const payload = {
        age: form.age ?? null,
        gender: form.gender || undefined,
        height: form.height ?? null,
        heightUnit: form.heightUnit || 'cm',
        weight: form.weight ?? null,
        weightUnit: form.weightUnit || 'kg',
        bloodType: form.bloodType || undefined,
        location: form.location || undefined,
        primaryCondition: form.primaryCondition || undefined,
        emergencyContact1: form.emergencyContact1 || undefined,
        emergencyContact2: form.emergencyContact2 || undefined,
        primaryDoctor: form.primaryDoctor || undefined,
        preferredHospital: form.preferredHospital || undefined,
        allergies: form.allergies || undefined,
        dietaryRestrictions: form.dietaryRestrictions || undefined,
        mobilityAids: form.mobilityAids || undefined,
        cognitiveNotes: form.cognitiveNotes || undefined,
        stepsToday: form.stepsToday ?? null,
        heartRate: form.heartRate ?? null,
        spO2: form.spO2 ?? null,
        bloodPressure: form.bloodPressure || undefined,
        sleepHours: form.sleepHours ?? null
      };
      const res = await fetch(`${API_BASE_URL}/elders/${currentUser.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        saveAction.setError(data.message || 'Failed to save profile.');
        return;
      }
      saveAction.setSuccess();
      setProfile(data.profile || {});
      setForm(data.profile || {});
      setHasProfileAdded(data.hasProfileAdded);
      setEditing(false);
    } catch {
      saveAction.setError('Unable to reach the server.');
    }
  };

  if (!currentUser || currentUser.role !== 'elderly') return null;

  if (loading) {
    return (
      <div>
        <p style={{ color: colors.textMuted }}>Loading profile…</p>
      </div>
    );
  }

  const showForm = !hasProfileAdded || editing;

  return (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '1.5rem', textAlign: 'center' }}>Profile</h2>

      {!showForm ? (
        <>
          <p style={{ color: colors.successText, fontWeight: 600, marginBottom: spacing.lg }}>Profile added</p>
          <div style={{ ...sectionStyle, marginBottom: spacing.md }}>
            <h3 style={{ marginTop: 0, marginBottom: spacing.sm, fontSize: '1rem' }}>Basic</h3>
            <p style={{ margin: 0, fontSize: '0.95rem', color: colors.textMuted }}>
              {[profile.age && `${profile.age} years`, profile.gender, profile.height && `${profile.height} ${profile.heightUnit || 'cm'}`, profile.weight && `${profile.weight} ${profile.weightUnit || 'kg'}`, profile.bloodType, profile.location, profile.primaryCondition].filter(Boolean).join(' • ') || '—'}
            </p>
          </div>
          {(profile.emergencyContact1?.name || profile.primaryDoctor?.name || profile.preferredHospital?.name) && (
            <div style={{ ...sectionStyle, marginBottom: spacing.md }}>
              <h3 style={{ marginTop: 0, marginBottom: spacing.sm, fontSize: '1rem' }}>Emergency</h3>
              <p style={{ margin: 0, fontSize: '0.95rem', color: colors.textMuted }}>
                {[
                  profile.emergencyContact1?.name && `ICE: ${profile.emergencyContact1.name} (${profile.emergencyContact1.relationship || '—'})`,
                  profile.emergencyContact2?.name && `ICE2: ${profile.emergencyContact2.name}`,
                  profile.primaryDoctor?.name && `Doctor: ${profile.primaryDoctor.name}`,
                  profile.preferredHospital?.name && `Hospital: ${profile.preferredHospital.name}`
                ].filter(Boolean).join(' • ') || '—'}
              </p>
            </div>
          )}
          {(profile.allergies || profile.dietaryRestrictions || profile.mobilityAids) && (
            <div style={{ ...sectionStyle, marginBottom: spacing.md }}>
              <h3 style={{ marginTop: 0, marginBottom: spacing.sm, fontSize: '1rem' }}>Health</h3>
              <p style={{ margin: 0, fontSize: '0.95rem', color: colors.textMuted }}>
                {[profile.allergies && `Allergies: ${profile.allergies}`, profile.dietaryRestrictions && `Diet: ${profile.dietaryRestrictions}`, profile.mobilityAids !== 'none' && profile.mobilityAids && `Mobility: ${profile.mobilityAids}`].filter(Boolean).join(' • ') || '—'}
              </p>
            </div>
          )}
          {(profile.stepsToday != null || profile.heartRate != null || profile.sleepHours != null) && (
            <div style={{ ...sectionStyle, marginBottom: spacing.md }}>
              <h3 style={{ marginTop: 0, marginBottom: spacing.sm, fontSize: '1rem' }}>Fitness</h3>
              <p style={{ margin: 0, fontSize: '0.95rem', color: colors.textMuted }}>
                {[
                  profile.stepsToday != null && `${profile.stepsToday} steps`,
                  profile.heartRate != null && `${profile.heartRate} bpm`,
                  profile.sleepHours != null && `${profile.sleepHours} h sleep`
                ].filter(Boolean).join(' • ') || '—'}
              </p>
            </div>
          )}
          <Button onClick={() => setEditing(true)} style={{ marginTop: spacing.sm }}>Edit profile</Button>
        </>
      ) : (
        <form onSubmit={handleSave}>
          <Section title="Basic">
            <Field label="Age" optional><input type="number" min="1" max="120" value={form.age ?? ''} onChange={(e) => updateForm('age', e.target.value)} style={inputStyle} placeholder="e.g. 75" /></Field>
            <Field label="Gender" optional>
              <select value={form.gender || ''} onChange={(e) => updateForm('gender', e.target.value)} style={inputStyle}>
                <option value="">Select</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing.sm, marginBottom: spacing.md }}>
              <Field label="Height" optional>
                <input type="number" min="0" value={form.height ?? ''} onChange={(e) => updateForm('height', e.target.value)} style={inputStyle} placeholder="e.g. 170" />
              </Field>
              <Field label="Unit">
                <select value={form.heightUnit || 'cm'} onChange={(e) => updateForm('heightUnit', e.target.value)} style={inputStyle}>
                  <option value="cm">cm</option>
                  <option value="ft">ft</option>
                </select>
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing.sm, marginBottom: spacing.md }}>
              <Field label="Weight" optional>
                <input type="number" min="0" step="0.1" value={form.weight ?? ''} onChange={(e) => updateForm('weight', e.target.value)} style={inputStyle} placeholder="e.g. 70" />
              </Field>
              <Field label="Unit">
                <select value={form.weightUnit || 'kg'} onChange={(e) => updateForm('weightUnit', e.target.value)} style={inputStyle}>
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </Field>
            </div>
            <Field label="Blood type" optional>
              <select value={form.bloodType || ''} onChange={(e) => updateForm('bloodType', e.target.value)} style={inputStyle}>
                <option value="">Select</option>
                {BLOOD_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Location" optional><input type="text" value={form.location || ''} onChange={(e) => updateForm('location', e.target.value)} style={inputStyle} placeholder="City or address" /></Field>
            <Field label="Primary condition" optional><input type="text" value={form.primaryCondition || ''} onChange={(e) => updateForm('primaryCondition', e.target.value)} style={inputStyle} placeholder="e.g. Hypertension" /></Field>
          </Section>

          <Section title="Emergency">
            <Field label="Emergency contact 1 - Name" optional><input type="text" value={form.emergencyContact1?.name || ''} onChange={(e) => updateNested('emergencyContact1', 'name', e.target.value)} style={inputStyle} /></Field>
            <Field label="Relationship" optional><input type="text" value={form.emergencyContact1?.relationship || ''} onChange={(e) => updateNested('emergencyContact1', 'relationship', e.target.value)} style={inputStyle} placeholder="e.g. Son" /></Field>
            <Field label="Phone" optional><input type="tel" value={form.emergencyContact1?.phone || ''} onChange={(e) => updateNested('emergencyContact1', 'phone', e.target.value)} style={inputStyle} /></Field>
            <Field label="Emergency contact 2 - Name" optional><input type="text" value={form.emergencyContact2?.name || ''} onChange={(e) => updateNested('emergencyContact2', 'name', e.target.value)} style={inputStyle} /></Field>
            <Field label="Relationship" optional><input type="text" value={form.emergencyContact2?.relationship || ''} onChange={(e) => updateNested('emergencyContact2', 'relationship', e.target.value)} style={inputStyle} /></Field>
            <Field label="Phone" optional><input type="tel" value={form.emergencyContact2?.phone || ''} onChange={(e) => updateNested('emergencyContact2', 'phone', e.target.value)} style={inputStyle} /></Field>
            <Field label="Primary doctor - Name" optional><input type="text" value={form.primaryDoctor?.name || ''} onChange={(e) => updateNested('primaryDoctor', 'name', e.target.value)} style={inputStyle} /></Field>
            <Field label="Phone" optional><input type="tel" value={form.primaryDoctor?.phone || ''} onChange={(e) => updateNested('primaryDoctor', 'phone', e.target.value)} style={inputStyle} /></Field>
            <Field label="Preferred hospital - Name" optional><input type="text" value={form.preferredHospital?.name || ''} onChange={(e) => updateNested('preferredHospital', 'name', e.target.value)} style={inputStyle} /></Field>
            <Field label="Phone" optional><input type="tel" value={form.preferredHospital?.phone || ''} onChange={(e) => updateNested('preferredHospital', 'phone', e.target.value)} style={inputStyle} /></Field>
          </Section>

          <Section title="Health">
            <Field label="Allergies" optional><input type="text" value={form.allergies || ''} onChange={(e) => updateForm('allergies', e.target.value)} style={inputStyle} placeholder="e.g. Penicillin, nuts" /></Field>
            <Field label="Dietary restrictions" optional><input type="text" value={form.dietaryRestrictions || ''} onChange={(e) => updateForm('dietaryRestrictions', e.target.value)} style={inputStyle} placeholder="e.g. Diabetic, low-sodium" /></Field>
            <Field label="Mobility aids" optional>
              <select value={form.mobilityAids || 'none'} onChange={(e) => updateForm('mobilityAids', e.target.value)} style={inputStyle}>
                {MOBILITY_OPTIONS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </Field>
          </Section>

          <Section title="Care Notes">
            <Field label="Cognitive/behavioral notes" optional><input type="text" value={form.cognitiveNotes || ''} onChange={(e) => updateForm('cognitiveNotes', e.target.value)} style={inputStyle} placeholder="e.g. Early stage dementia" /></Field>
            </Section> 

          <Section title="Fitness">
            <div style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: radii.button, border: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.surface }}>
              <p style={{ marginTop: 0, marginBottom: spacing.sm, fontSize: '0.95rem', fontWeight: 600 }}>Fitbit</p>
              {fitbitMessage && <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: fitbitConnected ? colors.successText : colors.errorText }}>{fitbitMessage}</p>}
              {fitbitConnected ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: colors.successText }}>Connected to Fitbit</span>
                  {fitbitLastSyncAt && <span style={{ fontSize: '0.85rem', color: colors.textMuted }}>Last sync: {new Date(fitbitLastSyncAt).toLocaleString()}</span>}
                  <Button type="button" onClick={handleSyncFitbit} disabled={fitbitSyncPending} style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
                    {fitbitSyncPending ? 'Syncing…' : 'Sync now'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleDisconnectFitbit} disabled={fitbitLoading} style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button type="button" onClick={handleConnectFitbit} disabled={fitbitLoading}>
                  {fitbitLoading ? 'Connecting…' : 'Connect Fitbit'}
                </Button>
              )}
            </div>
            <p style={{ fontSize: '0.9rem', color: colors.textMuted, marginBottom: spacing.md }}>Manual entry (or sync from Fitbit above)</p>
            <Field label="Steps today" optional><input type="number" min="0" value={form.stepsToday ?? ''} onChange={(e) => updateForm('stepsToday', e.target.value)} style={inputStyle} /></Field>
            <Field label="Heart rate (bpm)" optional><input type="number" min="0" value={form.heartRate ?? ''} onChange={(e) => updateForm('heartRate', e.target.value)} style={inputStyle} /></Field>
            <Field label="SpO2 (%)" optional><input type="number" min="0" max="100" value={form.spO2 ?? ''} onChange={(e) => updateForm('spO2', e.target.value)} style={inputStyle} /></Field>
            <Field label="Blood pressure" optional><input type="text" value={form.bloodPressure || ''} onChange={(e) => updateForm('bloodPressure', e.target.value)} style={inputStyle} placeholder="e.g. 120/80" /></Field>
            <Field label="Sleep hours" optional><input type="number" min="0" step="0.5" value={form.sleepHours ?? ''} onChange={(e) => updateForm('sleepHours', e.target.value)} style={inputStyle} /></Field>
          </Section>

          {saveAction.status === ACTION_STATUS.ERROR && <p style={{ color: colors.errorText, marginBottom: spacing.md }}>{saveAction.error}</p>}
          {saveAction.status === ACTION_STATUS.SUCCESS && <p style={{ color: colors.successText, marginBottom: spacing.md }}>Profile saved.</p>}
          <div style={{ display: 'flex', gap: spacing.sm }}>
            <Button type="submit" disabled={saveAction.status === ACTION_STATUS.PENDING}>
              {saveAction.status === ACTION_STATUS.PENDING ? 'Saving…' : 'Save profile'}
            </Button>
            {editing && <Button variant="secondary" type="button" onClick={() => { setEditing(false); setForm(profile || {}); }}>Cancel</Button>}
          </div>
        </form>
      )}
    </div>
  );
}

export default ElderProfilePage;
