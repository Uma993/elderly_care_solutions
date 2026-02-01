import React from 'react';
import Button from './ui/Button.jsx';
import { colors } from '../design/tokens';
import { FamilyElderProvider } from '../context/FamilyElderContext.jsx';
import FamilyFlashAlert from './FamilyFlashAlert.jsx';

function DashboardLayout({ currentUser, token, onLogout, children }) {
  return (
    <>
      {currentUser?.role === 'family' ? (
        <FamilyElderProvider currentUser={currentUser} token={token}>
          <FamilyFlashAlert token={token} />
          {children}
        </FamilyElderProvider>
      ) : (
        children
      )}
      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: `1px solid ${colors.borderSubtle}` }}>
        <Button
          variant="secondary"
          onClick={onLogout}
          style={{
            width: '100%',
            minHeight: '56px',
            fontSize: '1.1rem',
            fontWeight: 600
          }}
        >
          Log out
        </Button>
      </div>
    </>
  );
}

export default DashboardLayout;
