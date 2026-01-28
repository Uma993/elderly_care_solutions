import React, { useState } from 'react';
import Button from '../ui/Button.jsx';
import Tag from '../ui/Tag.jsx';
import { elderProfile, healthUpdates, medicineIntakeLogs } from '../../mock/elderData.js';

function FamilyDashboard({ currentUser, onLogout }) {
  const [acknowledgedIds, setAcknowledgedIds] = useState({});

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
      <p style={{ marginTop: 0, marginBottom: '1.25rem', color: '#9ca3af' }}>
        Monitor your loved one&apos;s medicines and recent health updates in one calm view.
      </p>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Elder overview</h3>
        <div
          style={{
            borderRadius: '0.9rem',
            padding: '0.9rem 1rem',
            border: '1px solid rgba(148,163,184,0.35)',
            background: 'rgba(15,23,42,0.8)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.3rem',
            fontSize: '1.02rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600 }}>{elderProfile.name}</span>
            <Tag tone="success">No active SOS</Tag>
          </div>
          <span>
            {elderProfile.age} years • {elderProfile.location}
          </span>
          <span style={{ fontSize: '0.95rem', opacity: 0.9 }}>
            Condition: {elderProfile.primaryCondition}
          </span>
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Recent health updates</h3>
        <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {healthUpdates.map((u) => (
            <div
              key={u.id}
              style={{
                borderRadius: '0.8rem',
                padding: '0.75rem 0.9rem',
                border: '1px solid rgba(148,163,184,0.3)',
                background: 'rgba(15,23,42,0.6)',
                fontSize: '0.98rem'
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
                <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{u.time}</span>
              </div>
              <p style={{ margin: 0, color: '#e5e7eb' }}>{u.details}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Medicine intake</h3>
        <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {medicineIntakeLogs.map((log) => {
            const isAck = !!acknowledgedIds[log.id];
            return (
              <div
                key={log.id}
                style={{
                  borderRadius: '0.8rem',
                  padding: '0.75rem 0.9rem',
                  border: '1px solid rgba(148,163,184,0.3)',
                  background: 'rgba(15,23,42,0.6)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.98rem'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{log.medicineName}</div>
                  <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>{log.time}</div>
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
                    onClick={() => acknowledge(log.id)}
                    style={{
                      borderRadius: '999px',
                      padding: '0.35rem 0.9rem',
                      border: '1px solid rgba(148,163,184,0.7)',
                      background: 'transparent',
                      color: '#e5e7eb',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Mark seen
                  </button>
                )}
                {isAck && (
                  <span style={{ fontSize: '0.85rem', color: '#22c55e' }}>Seen</span>
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

