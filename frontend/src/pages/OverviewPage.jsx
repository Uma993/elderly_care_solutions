import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import Tag from '../components/ui/Tag.jsx';
import AddElderProfileModal from '../components/AddElderProfileModal.jsx';
import { colors } from '../design/tokens';
import { API_BASE_URL, getAuthHeaders } from '../api';
import { useFamilyElder } from '../context/FamilyElderContext.jsx';
import { useActionState, ACTION_STATUS } from '../hooks/useActionState';

const INACTIVE_THRESHOLD_HOURS = 24;

function formatLastActive(iso) {
  if (!iso) return null;
  const then = new Date(iso);
  const now = new Date();
  const ms = now - then;
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function isInactive(lastActivityAt, thresholdHours = INACTIVE_THRESHOLD_HOURS) {
  if (!lastActivityAt) return true;
  const then = new Date(lastActivityAt).getTime();
  const now = Date.now();
  return (now - then) > thresholdHours * 60 * 60 * 1000;
}

function OverviewPage() {
  const { currentUser, token } = useOutletContext();
  const { elders, selectedElderId, setSelectedElderId, loadError, setRefreshTrigger } = useFamilyElder() || {};
  const [linkElderPhone, setLinkElderPhone] = useState('');
  const [showAddElderModal, setShowAddElderModal] = useState(false);
  const linkAction = useActionState({ autoResetMs: 4000 });

  const handleLinkToElder = async () => {
    const elderPhone = linkElderPhone.trim().replace(/\s/g, '');
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
      setLinkElderPhone('');
      setRefreshTrigger?.((t) => t + 1);
    } catch {
      linkAction.setError('Unable to reach the server.');
    }
  };

  if (!currentUser || currentUser.role !== 'family') return null;

  const selectedElder = (elders || []).find((e) => e.id === selectedElderId) || (elders || [])[0] || null;
  const allSosAlerts = (elders || []).flatMap((e) =>
    (e.sosAlerts || []).map((a) => ({ ...a, elderName: a.elderName || e.name || 'Elder', elderId: e.id }))
  );

  return (
    <div>
      <h2 style={{ marginTop: 0, fontSize: '1.5rem', textAlign: 'center' }}>Elder overview</h2>
      {loadError && (
        <p style={{ color: colors.errorText, marginBottom: '1rem', fontSize: '1rem' }}>{loadError}</p>
      )}
      {(elders || []).length > 1 && (
        <div style={{ marginBottom: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {(elders || []).map((e) => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="interactive-surface"
                onClick={() => setSelectedElderId?.(e.id)}
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
              {e.hasProfileAdded ? <Tag tone="success">Profile added</Tag> : <span style={{ fontSize: '0.85rem', color: colors.textMuted }}>Profile pending</span>}
            </div>
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
        {(elders || []).length === 0 ? (
          <>
            <p style={{ color: colors.textMuted, margin: 0 }}>No elder linked. Add an elder profile or link to one who already has an account.</p>
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Button onClick={() => setShowAddElderModal(true)} style={{ alignSelf: 'flex-start', marginTop: 0 }}>
                Add elder profile
              </Button>
              <p style={{ color: colors.textMuted, margin: '0.5rem 0 0.25rem 0', fontSize: '0.95rem' }}>Or link by phone (elder has an account):</p>
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
              <Button onClick={handleLinkToElder} disabled={linkAction.status === ACTION_STATUS.PENDING} style={{ marginTop: 0, alignSelf: 'flex-start' }}>
                {linkAction.status === ACTION_STATUS.PENDING ? 'Linking…' : 'Link an elder'}
              </Button>
              {linkAction.status === ACTION_STATUS.SUCCESS && <p style={{ color: colors.successText, margin: 0, fontSize: '0.95rem' }}>Linked successfully.</p>}
              {linkAction.status === ACTION_STATUS.ERROR && <p style={{ color: colors.errorText, margin: 0, fontSize: '0.95rem' }}>{linkAction.error}</p>}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600 }}>{selectedElder?.name || 'Elder'}</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedElder?.hasProfileAdded ? <Tag tone="success">Profile added</Tag> : <Tag>Profile pending</Tag>}
                {allSosAlerts.length > 0 ? <Tag tone="warning">SOS alert(s)</Tag> : <Tag tone="success">No active SOS</Tag>}
              </div>
            </div>
            {selectedElder?.lastActivityAt != null && (
              <span style={{ fontSize: '0.95rem', color: colors.textMuted }}>
                Last active: {formatLastActive(selectedElder.lastActivityAt)}
                {isInactive(selectedElder.lastActivityAt) && (
                  <span style={{ color: colors.errorText, marginLeft: '0.5rem' }}> · Inactive &gt; 24h</span>
                )}
              </span>
            )}
            {(selectedElder?.age || selectedElder?.location) && (
              <span>
                {selectedElder?.age ? `${selectedElder.age} years` : ''}
                {selectedElder?.age && selectedElder?.location ? ' • ' : ''}
                {selectedElder?.location || ''}
              </span>
            )}
            {selectedElder?.primaryCondition && (
              <span style={{ fontSize: '0.95rem', opacity: 0.9 }}>Condition: {selectedElder.primaryCondition}</span>
            )}
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: `1px solid ${colors.borderSubtle}` }}>
              <p style={{ color: colors.textMuted, margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>Add or link another elder</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Button onClick={() => setShowAddElderModal(true)} style={{ alignSelf: 'flex-start', marginTop: 0 }}>
                  Add elder profile
                </Button>
                <span style={{ color: colors.textMuted, fontSize: '0.9rem' }}>Or link by phone:</span>
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
                <Button onClick={handleLinkToElder} disabled={linkAction.status === ACTION_STATUS.PENDING} style={{ alignSelf: 'flex-start' }}>
                  {linkAction.status === ACTION_STATUS.PENDING ? 'Linking…' : 'Link another elder'}
                </Button>
                {linkAction.status === ACTION_STATUS.SUCCESS && <p style={{ color: colors.successText, margin: 0, fontSize: '0.95rem' }}>Linked successfully.</p>}
                {linkAction.status === ACTION_STATUS.ERROR && <p style={{ color: colors.errorText, margin: 0, fontSize: '0.95rem' }}>{linkAction.error}</p>}
              </div>
            </div>
          </>
        )}
      </div>
      <AddElderProfileModal
        open={showAddElderModal}
        onClose={() => setShowAddElderModal(false)}
        onSuccess={() => setRefreshTrigger?.((t) => t + 1)}
        token={token}
      />
    </div>
  );
}

export default OverviewPage;
