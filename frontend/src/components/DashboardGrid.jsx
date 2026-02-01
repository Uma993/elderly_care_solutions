import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { radii } from '../design/tokens';

const heroCardStyle = (bg, disabled = false) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '1rem',
  minHeight: 120,
  borderRadius: radii.card,
  background: bg,
  color: '#fff',
  border: 'none',
  cursor: disabled ? 'default' : 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  fontSize: '1rem',
  fontWeight: 600,
  opacity: disabled ? 0.7 : 1
});

function ElderDashboardGrid({ currentUser }) {
  const navigate = useNavigate();
  return (
    <>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>
        Welcome, {currentUser.fullName}!
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
          marginBottom: '1.25rem'
        }}
      >
        <button type="button" onClick={() => navigate('/tasks')} style={heroCardStyle('#22c55e')} aria-label="Today's Tasks">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          Today&apos;s Tasks
        </button>
        <button type="button" onClick={() => navigate('/medicines')} style={heroCardStyle('#f97316')} aria-label="Medication Reminder">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4"/><path d="M12 9v11"/><path d="M8 14h8"/></svg>
          Medication Reminder
        </button>
        <button type="button" onClick={() => navigate('/voice-assistant')} style={heroCardStyle('#3b82f6')} aria-label="Request Help">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
          Request Help
        </button>
        <button type="button" onClick={() => navigate('/sos')} style={heroCardStyle('#dc2626')} aria-label="SOS Emergency">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          SOS Emergency
        </button>
      </div>
    </>
  );
}

function FamilyDashboardGrid({ currentUser }) {
  const navigate = useNavigate();
  return (
    <>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.75rem', fontWeight: 700 }}>
        Welcome, {currentUser.fullName}!
      </h2>
      <p style={{ marginTop: 0, marginBottom: '0.75rem', color: '#334155' }}>
        Monitor your loved one&apos;s medicines and recent health updates in one calm view.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem'
        }}
      >
        <button type="button" onClick={() => navigate('/sos-alerts')} style={heroCardStyle('#dc2626')} aria-label="SOS Alerts">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          SOS Alerts
        </button>
        <button type="button" onClick={() => navigate('/medicines')} style={heroCardStyle('#f97316')} aria-label="Medicines">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4"/><path d="M12 9v11"/><path d="M8 14h8"/></svg>
          Medicines
        </button>
        <button type="button" onClick={() => navigate('/tasks')} style={heroCardStyle('#22c55e')} aria-label="Tasks">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          Tasks
        </button>
        <button type="button" onClick={() => navigate('/voice-assistant')} style={heroCardStyle('#3b82f6')} aria-label="Voice assistant">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
          Voice assistant
        </button>
        <button type="button" onClick={() => navigate('/overview')} style={heroCardStyle('#6366f1')} aria-label="Elder overview">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          Elder overview
        </button>
      </div>
    </>
  );
}

/**
 * Grid-only dashboard: reads context and renders Elder or Family 2x2 grid with navigation.
 * Family grid uses selectedElderId from FamilyElderContext.
 */
function DashboardGrid() {
  const { currentUser } = useOutletContext();
  if (!currentUser) return null;
  if (currentUser.role === 'elderly') {
    return <ElderDashboardGrid currentUser={currentUser} />;
  }
  return <FamilyDashboardGrid currentUser={currentUser} />;
}

export default DashboardGrid;
