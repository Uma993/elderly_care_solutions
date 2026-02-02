import React, { useState } from 'react';
import Button from './ui/Button.jsx';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { colors, radii, spacing } from '../design/tokens';
import { useActionState, ACTION_STATUS } from '../hooks/useActionState';

const MODE_ADD = 'add';
const MODE_LINK = 'link';

const inputStyle = {
  padding: `${spacing.sm} ${spacing.md}`,
  fontSize: '1rem',
  border: `1px solid ${colors.borderSubtle}`,
  borderRadius: radii.button,
  width: '100%',
  boxSizing: 'border-box'
};

function AddElderProfileModal({ open, onClose, onSuccess, token }) {
  const [mode, setMode] = useState(MODE_ADD);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [primaryCondition, setPrimaryCondition] = useState('');
  const addAction = useActionState({ autoResetMs: 0 });
  const linkAction = useActionState({ autoResetMs: 0 });

  const isPending = addAction.status === ACTION_STATUS.PENDING || linkAction.status === ACTION_STATUS.PENDING;

  const handleAddProfile = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim().replace(/\s/g, '');
    if (!trimmedName) {
      addAction.setError('Name is required.');
      return;
    }
    if (!trimmedPhone) {
      addAction.setError('Phone is required.');
      return;
    }
    addAction.setPending();
    try {
      const res = await fetch(`${API_BASE_URL}/users/add-elder-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
          age: age.trim() ? Number(age) : undefined,
          gender: gender || undefined,
          location: location.trim() || undefined,
          primaryCondition: primaryCondition.trim() || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addAction.setError(data.message || 'Failed to add profile.');
        return;
      }
      addAction.setSuccess();
      setName('');
      setPhone('');
      setAge('');
      setGender('');
      setLocation('');
      setPrimaryCondition('');
      onSuccess?.();
      onClose?.();
    } catch {
      addAction.setError('Unable to reach the server.');
    }
  };

  const handleLinkByPhone = async (e) => {
    e.preventDefault();
    const elderPhone = phone.trim().replace(/\s/g, '');
    if (!elderPhone) {
      linkAction.setError("Enter the elder's phone number.");
      return;
    }
    linkAction.setPending();
    try {
      const res = await fetch(`${API_BASE_URL}/users/link-elder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ elderPhone })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        linkAction.setError(data.message || 'Failed to link.');
        return;
      }
      linkAction.setSuccess();
      setPhone('');
      onSuccess?.();
      onClose?.();
    } catch {
      linkAction.setError('Unable to reach the server.');
    }
  };

  const handleModeChange = (m) => {
    setMode(m);
    addAction.reset?.();
    linkAction.reset?.();
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-elder-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.4)',
        padding: spacing.lg
      }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        style={{
          background: colors.surface,
          borderRadius: radii.card,
          padding: spacing.xl,
          maxWidth: '28rem',
          width: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-elder-modal-title" style={{ marginTop: 0, marginBottom: spacing.lg, fontSize: '1.35rem', textAlign: 'center' }}>
          Add or link an elder
        </h2>

        <div style={{ marginBottom: spacing.lg, display: 'flex', gap: spacing.sm }}>
          <label
            style={{
              flex: 1,
              padding: spacing.sm,
              textAlign: 'center',
              borderRadius: radii.button,
              border: `2px solid ${mode === MODE_ADD ? colors.primary : colors.borderSubtle}`,
              background: mode === MODE_ADD ? colors.surfaceSoft : 'transparent',
              cursor: 'pointer',
              fontWeight: mode === MODE_ADD ? 600 : 400
            }}
          >
            <input
              type="radio"
              name="elder-mode"
              value={MODE_ADD}
              checked={mode === MODE_ADD}
              onChange={() => handleModeChange(MODE_ADD)}
              style={{ marginRight: '0.35rem' }}
            />
            Add new profile
          </label>
          <label
            style={{
              flex: 1,
              padding: spacing.sm,
              textAlign: 'center',
              borderRadius: radii.button,
              border: `2px solid ${mode === MODE_LINK ? colors.primary : colors.borderSubtle}`,
              background: mode === MODE_LINK ? colors.surfaceSoft : 'transparent',
              cursor: 'pointer',
              fontWeight: mode === MODE_LINK ? 600 : 400
            }}
          >
            <input
              type="radio"
              name="elder-mode"
              value={MODE_LINK}
              checked={mode === MODE_LINK}
              onChange={() => handleModeChange(MODE_LINK)}
              style={{ marginRight: '0.35rem' }}
            />
            Link by phone
          </label>
        </div>

        {mode === MODE_ADD ? (
          <form onSubmit={handleAddProfile} style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div>
              <label htmlFor="add-elder-name" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.95rem', fontWeight: 500 }}>
                Name (required)
              </label>
              <input
                id="add-elder-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Elder's full name"
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="add-elder-phone" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.95rem', fontWeight: 500 }}>
                Phone (required)
              </label>
              <input
                id="add-elder-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Elder's phone number"
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="add-elder-age" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.95rem', color: colors.textMuted }}>
                Age (optional)
              </label>
              <input
                id="add-elder-age"
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 75"
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="add-elder-gender" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.95rem', color: colors.textMuted }}>
                Gender (optional)
              </label>
              <select
                id="add-elder-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label htmlFor="add-elder-location" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.95rem', color: colors.textMuted }}>
                Location (optional)
              </label>
              <input
                id="add-elder-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. City or address"
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="add-elder-condition" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.95rem', color: colors.textMuted }}>
                Primary condition (optional)
              </label>
              <input
                id="add-elder-condition"
                type="text"
                value={primaryCondition}
                onChange={(e) => setPrimaryCondition(e.target.value)}
                placeholder="e.g. Diabetes, hypertension"
                style={inputStyle}
              />
            </div>
            {addAction.status === ACTION_STATUS.SUCCESS && (
              <p style={{ color: colors.successText, margin: 0, fontSize: '0.95rem' }}>Profile added successfully.</p>
            )}
            {addAction.status === ACTION_STATUS.ERROR && (
              <p style={{ color: colors.errorText, margin: 0, fontSize: '0.95rem' }}>{addAction.error}</p>
            )}
            <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.sm }}>
              <Button type="submit" disabled={isPending} style={{ flex: 1, marginTop: 0 }}>
                {addAction.status === ACTION_STATUS.PENDING ? 'Adding…' : 'Add profile'}
              </Button>
              <Button variant="secondary" type="button" onClick={onClose} style={{ flex: 1, marginTop: 0 }}>
                Skip for now
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLinkByPhone} style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <p style={{ color: colors.textMuted, margin: 0, fontSize: '0.95rem' }}>
              Link to an elder who already has an account. Enter their registered phone number.
            </p>
            <div>
              <label htmlFor="link-elder-phone" style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.95rem', fontWeight: 500 }}>
                Elder&apos;s phone number
              </label>
              <input
                id="link-elder-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Elder's phone number"
                style={inputStyle}
              />
            </div>
            {linkAction.status === ACTION_STATUS.SUCCESS && (
              <p style={{ color: colors.successText, margin: 0, fontSize: '0.95rem' }}>Linked successfully.</p>
            )}
            {linkAction.status === ACTION_STATUS.ERROR && (
              <p style={{ color: colors.errorText, margin: 0, fontSize: '0.95rem' }}>{linkAction.error}</p>
            )}
            <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.sm }}>
              <Button type="submit" disabled={isPending} style={{ flex: 1, marginTop: 0 }}>
                {linkAction.status === ACTION_STATUS.PENDING ? 'Linking…' : 'Link elder'}
              </Button>
              <Button variant="secondary" type="button" onClick={onClose} style={{ flex: 1, marginTop: 0 }}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AddElderProfileModal;
