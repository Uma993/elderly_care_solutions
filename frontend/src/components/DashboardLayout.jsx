import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { colors } from '../design/tokens';
import { FamilyElderProvider } from '../context/FamilyElderContext.jsx';
import FamilyFlashAlert from './FamilyFlashAlert.jsx';

function DashboardLayout({ currentUser, token, onLogout, children }) {
  const location = useLocation();
  const isDashboard = location.pathname === '/' || location.pathname === '/wellbeing-check';

  const content = currentUser?.role === 'family' ? (
    <FamilyElderProvider currentUser={currentUser} token={token}>
      <FamilyFlashAlert token={token} />
      {children}
    </FamilyElderProvider>
  ) : (
    children
  );

  return (
    <div style={{ position: 'relative' }}>
      {isDashboard && (
        <button
          type="button"
          onClick={onLogout}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            padding: '0.35rem 0.6rem',
            fontSize: '0.8rem',
            fontWeight: 500,
            color: colors.textMuted,
            background: 'transparent',
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: '0.5rem',
            cursor: 'pointer'
          }}
        >
          Log out
        </button>
      )}
      {content}
      {!isDashboard && (
        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: `1px solid ${colors.borderSubtle}` }}>
          <Link
            to="/"
            style={{
              display: 'block',
              width: '100%',
              minHeight: '56px',
              padding: '1rem 1.5rem',
              fontSize: '1.1rem',
              fontWeight: 600,
              color: colors.primary,
              textDecoration: 'none',
              textAlign: 'center',
              border: `2px solid ${colors.primary}`,
              borderRadius: '0.75rem',
              background: colors.surface,
              lineHeight: '1.4',
              boxSizing: 'border-box'
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

export default DashboardLayout;
