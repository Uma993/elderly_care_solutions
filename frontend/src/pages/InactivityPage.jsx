import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { colors } from '../design/tokens';
import { useFamilyElder } from '../context/FamilyElderContext.jsx';

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

function InactivityPage() {
  const { currentUser } = useOutletContext();
  const { elders, loadError } = useFamilyElder() || {};

  if (!currentUser || currentUser.role !== 'family') return null;

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.5rem', fontWeight: 700, textAlign: 'center' }}>Inactivity status</h2>
      <p style={{ marginTop: 0, marginBottom: '1rem', color: colors.textMuted, fontSize: '0.95rem' }}>
        See when each elder was last active. Check in on anyone inactive for more than 24 hours.
      </p>
      {loadError && <p style={{ color: colors.errorText, marginBottom: '1rem', fontSize: '1rem' }}>{loadError}</p>}
      {(elders || []).length === 0 && (
        <p style={{ color: colors.textMuted }}>No elder linked. Link an elder from the overview to see inactivity status.</p>
      )}
      {(elders || []).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(elders || []).map((e) => {
            const inactive = isInactive(e.lastActivityAt);
            return (
              <div
                key={e.id}
                style={{
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  border: `1px solid ${inactive ? colors.errorText : colors.borderSubtle}`,
                  background: inactive ? 'rgba(220, 38, 38, 0.06)' : colors.surfaceSoft
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '1.1rem' }}>{e.name || 'Elder'}</strong>
                  <span
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: inactive ? colors.errorText : colors.successText
                    }}
                  >
                    {inactive ? 'Inactive > 24h' : 'Active'}
                  </span>
                </div>
                <div style={{ fontSize: '0.95rem', color: colors.textMuted, marginBottom: '0.35rem' }}>
                  Last active: {formatLastActive(e.lastActivityAt) || '—'}
                </div>
                {inactive && (
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', color: colors.text }}>
                    Check in on {e.name || 'Elder'} – no activity in over 24 hours.
                  </p>
                )}
                <Link to="/overview" style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.95rem', color: colors.primary, fontWeight: 600 }}>
                  View overview
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InactivityPage;
