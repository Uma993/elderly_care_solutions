import React, { useEffect, useState } from 'react';
import Button from '../ui/Button.jsx';
import Tag from '../ui/Tag.jsx';
import { colors } from '../../design/tokens';
import { API_BASE_URL, getAuthHeaders } from '../../api';
import { getFamilyDashboardData } from '../../firebase/dashboardData.js';

const emptyElder = { name: '', age: '', location: '', primaryCondition: '' };

const LOAD_ERROR_MESSAGE =
  "Could not load elder. Make sure you're linked: your elder's profile must list you as family.";

function FamilyDashboard({ currentUser, token, onLogout }) {
  const [acknowledgedIds, setAcknowledgedIds] = useState({});
  const [elder, setElder] = useState(emptyElder);
  const [health, setHealth] = useState([]);
  const [medicineIntakeLogs, setMedicineIntakeLogs] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [linkElderId, setLinkElderId] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadError('');

    async function load() {
      try {
        const data = await getFamilyDashboardData(currentUser.id, token);
        if (!isMounted || !data) return;
        if (data.elder) {
          setElder({
            name: data.elder.name || '',
            age: data.elder.age || '',
            location: data.elder.location || '',
            primaryCondition: data.elder.primaryCondition || ''
          });
        } else {
          setElder(emptyElder);
        }

        if (Array.isArray(data.healthUpdates) && data.healthUpdates.length > 0) {
          setHealth(
            data.healthUpdates.map((u) => ({
              id: u.id,
              time: u.time || '',
              summary: u.title || u.summary || 'Update',
              details: u.details || ''
            }))
          );
        } else {
          setHealth([]);
        }

        if (Array.isArray(data.medicineIntakeLogs)) {
          setMedicineIntakeLogs(data.medicineIntakeLogs);
        } else {
          setMedicineIntakeLogs([]);
        }
      } catch (error) {
        if (isMounted) setLoadError(LOAD_ERROR_MESSAGE);
        // eslint-disable-next-line no-console
        console.warn('FamilyDashboard: could not load data from Firestore', error);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [currentUser.id, token, refreshTrigger]);

  const handleLinkToElder = async () => {
    const elderUserId = linkElderId.trim();
    if (!elderUserId) {
      setLinkError('Enter the elder\'s user ID.');
      return;
    }
    setLinkError('');
    setLinkLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/link-elder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
        body: JSON.stringify({ elderUserId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLinkError(data.message || 'Failed to link.');
        return;
      }
      setLinkElderId('');
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

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Elder overview</h3>
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
          {!elder.name ? (
            <>
              <p style={{ color: colors.textMuted, margin: 0 }}>No elder linked. Link to an elder&apos;s account below.</p>
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="Elder's user ID"
                  value={linkElderId}
                  onChange={(e) => setLinkElderId(e.target.value)}
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
                  {linkLoading ? 'Linking…' : 'Link to elder'}
                </Button>
                {linkError && <p style={{ color: colors.errorText, margin: 0, fontSize: '0.95rem' }}>{linkError}</p>}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>{elder.name}</span>
                <Tag tone="success">No active SOS</Tag>
              </div>
              {(elder.age || elder.location) && (
                <span>
                  {elder.age ? `${elder.age} years` : ''}{elder.age && elder.location ? ' • ' : ''}{elder.location || ''}
                </span>
              )}
              {elder.primaryCondition && (
                <span style={{ fontSize: '0.95rem', opacity: 0.9 }}>
                  Condition: {elder.primaryCondition}
                </span>
              )}
            </>
          )}
        </div>
      </section>

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

      <Button variant="secondary" onClick={onLogout}>
        Log out
      </Button>
    </div>
  );
}

export default FamilyDashboard;

