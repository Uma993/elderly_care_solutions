import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { colors, radii } from '../../design/tokens';
import { useFamilyElder } from '../../context/FamilyElderContext.jsx';
import { useHoverSegments, FAMILY_SEGMENT_TOOLTIPS } from '../../hooks/useHoverSegments';

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

const heroCardStyle = (bg) => ({
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
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  fontSize: '1rem',
  fontWeight: 600
});

function FamilyDashboard({ currentUser, token, onLogout }) {
  const navigate = useNavigate();
  const { elders, loadError } = useFamilyElder() || {};
  const { hoverSegment, onEnter, onLeave } = useHoverSegments();

  const inactiveElders = (elders || []).filter((e) => isInactive(e.lastActivityAt));

  if (!currentUser) return null;

  return (
    <div className="dashboard-expanded">
      {inactiveElders.length > 0 && (
        <section
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: radii.card,
            background: 'rgba(220, 38, 38, 0.08)',
            border: `1px solid ${colors.errorText}`,
            color: colors.text
          }}
          aria-live="polite"
        >
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: colors.errorText }}>Inactive</h3>
          {inactiveElders.map((e) => (
            <div key={e.id} style={{ marginBottom: '0.35rem', fontSize: '0.95rem' }}>
              Inactive: {e.name || 'Elder'} – last active {formatLastActive(e.lastActivityAt) || '—'}.
              <Link to="/overview" style={{ marginLeft: '0.5rem', color: colors.primary, fontWeight: 600 }}>View overview</Link>
            </div>
          ))}
        </section>
      )}

      <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.75rem', fontWeight: 700, textAlign: 'center' }}>Welcome, {currentUser.fullName}!</h2>
      <p style={{ marginTop: 0, marginBottom: '0.75rem', color: colors.textMuted }}>Monitor your loved one&apos;s medicines and recent health updates in one calm view.</p>

      {loadError && <p style={{ color: colors.errorText, marginBottom: '1rem', fontSize: '1rem' }}>{loadError}</p>}

      <div className="dashboard-hero-grid dashboard-hero-grid--family">
        <button
          type="button"
          onClick={() => navigate('/sos-alerts')}
          style={heroCardStyle('#dc2626')}
          aria-label="SOS Alerts"
          className={hoverSegment === 'sos' ? 'dashboard-hero-card--hover' : ''}
          onMouseEnter={() => onEnter('sos')}
          onMouseLeave={onLeave}
          onFocus={() => onEnter('sos')}
          onBlur={onLeave}
          tabIndex={0}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          SOS Alerts
        </button>
        <button
          type="button"
          onClick={() => navigate('/inactivity')}
          style={heroCardStyle('#d97706')}
          aria-label="Inactivity status"
          className={hoverSegment === 'inactivity' ? 'dashboard-hero-card--hover' : ''}
          onMouseEnter={() => onEnter('inactivity')}
          onMouseLeave={onLeave}
          onFocus={() => onEnter('inactivity')}
          onBlur={onLeave}
          tabIndex={0}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Inactivity
        </button>
        <button
          type="button"
          onClick={() => navigate('/medicines')}
          style={heroCardStyle('#f97316')}
          aria-label="Medicines"
          className={hoverSegment === 'medicines' ? 'dashboard-hero-card--hover' : ''}
          onMouseEnter={() => onEnter('medicines')}
          onMouseLeave={onLeave}
          onFocus={() => onEnter('medicines')}
          onBlur={onLeave}
          tabIndex={0}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4"/><path d="M12 9v11"/><path d="M8 14h8"/></svg>
          Medicines
        </button>
        <button
          type="button"
          onClick={() => navigate('/tasks')}
          style={heroCardStyle('#22c55e')}
          aria-label="Tasks"
          className={hoverSegment === 'tasks' ? 'dashboard-hero-card--hover' : ''}
          onMouseEnter={() => onEnter('tasks')}
          onMouseLeave={onLeave}
          onFocus={() => onEnter('tasks')}
          onBlur={onLeave}
          tabIndex={0}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          Tasks
        </button>
        <button
          type="button"
          onClick={() => navigate('/routine')}
          style={heroCardStyle('#8b5cf6')}
          aria-label="Routine summary"
          className={hoverSegment === 'routine' ? 'dashboard-hero-card--hover' : ''}
          onMouseEnter={() => onEnter('routine')}
          onMouseLeave={onLeave}
          onFocus={() => onEnter('routine')}
          onBlur={onLeave}
          tabIndex={0}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
          Routine
        </button>
        <button
          type="button"
          onClick={() => navigate('/voice-assistant')}
          style={heroCardStyle('#3b82f6')}
          aria-label="Voice assistant"
          className={hoverSegment === 'voice' ? 'dashboard-hero-card--hover' : ''}
          onMouseEnter={() => onEnter('voice')}
          onMouseLeave={onLeave}
          onFocus={() => onEnter('voice')}
          onBlur={onLeave}
          tabIndex={0}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
          Voice assistant
        </button>
        <button
          type="button"
          onClick={() => navigate('/overview')}
          style={heroCardStyle('#6366f1')}
          aria-label="Elder overview"
          className={hoverSegment === 'overview' ? 'dashboard-hero-card--hover' : ''}
          onMouseEnter={() => onEnter('overview')}
          onMouseLeave={onLeave}
          onFocus={() => onEnter('overview')}
          onBlur={onLeave}
          tabIndex={0}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          Elder overview
        </button>
        <button
          type="button"
          onClick={() => navigate('/calendar')}
          style={heroCardStyle('#0d9488')}
          aria-label="Calendar"
          className={hoverSegment === 'calendar' ? 'dashboard-hero-card--hover' : ''}
          onMouseEnter={() => onEnter('calendar')}
          onMouseLeave={onLeave}
          onFocus={() => onEnter('calendar')}
          onBlur={onLeave}
          tabIndex={0}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Calendar
        </button>
        <button
          type="button"
          onClick={() => navigate('/timeline')}
          style={heroCardStyle('#059669')}
          aria-label="Timeline"
          className={hoverSegment === 'timeline' ? 'dashboard-hero-card--hover' : ''}
          onMouseEnter={() => onEnter('timeline')}
          onMouseLeave={onLeave}
          onFocus={() => onEnter('timeline')}
          onBlur={onLeave}
          tabIndex={0}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
          Timeline
        </button>
      </div>
      {hoverSegment && FAMILY_SEGMENT_TOOLTIPS[hoverSegment] && (
        <p className="dashboard-hero-tooltip" role="status">{FAMILY_SEGMENT_TOOLTIPS[hoverSegment]}</p>
      )}
    </div>
  );
}

export default FamilyDashboard;
