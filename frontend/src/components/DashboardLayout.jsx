import React, { useEffect, useRef } from 'react';
import Button from './ui/Button.jsx';
import { colors } from '../design/tokens';
import { FamilyElderProvider, useFamilyElder } from '../context/FamilyElderContext.jsx';
import FamilyFlashAlert from './FamilyFlashAlert.jsx';
import AddElderProfileModal from './AddElderProfileModal.jsx';

function AddElderModalWrapper({ showAddElderModal, setShowAddElderModal, token }) {
  const { setRefreshTrigger } = useFamilyElder() || {};
  return (
    <AddElderProfileModal
      open={showAddElderModal}
      onClose={() => setShowAddElderModal(false)}
      onSuccess={() => {
        setRefreshTrigger?.((t) => t + 1);
        setShowAddElderModal(false);
      }}
      token={token}
    />
  );
}
/** Auto-show add elder modal when existing family user has no elders */
function ShowAddElderForExistingUser({ setShowAddElderModal, showAddElderModal }) {
  const { elders } = useFamilyElder() || {};
  const hasAutoShown = useRef(false);
  useEffect(() => {
    if ((elders || []).length === 0 && !hasAutoShown.current) {
      hasAutoShown.current = true;
      setShowAddElderModal(true);
    }
  }, [(elders || []).length, setShowAddElderModal]);
  useEffect(() => {
    if ((elders || []).length > 0 && showAddElderModal) {
      setShowAddElderModal(false);
    }
  }, [(elders || []).length, showAddElderModal, setShowAddElderModal]);
  return null;
}
function DashboardLayout({ currentUser, token, onLogout, children, showAddElderModal, setShowAddElderModal }) {
  return (
    <>
      {currentUser?.role === 'family' ? (
        <FamilyElderProvider currentUser={currentUser} token={token}>
                    <ShowAddElderForExistingUser
            setShowAddElderModal={setShowAddElderModal}
            showAddElderModal={showAddElderModal}
          />
          <FamilyFlashAlert token={token} />
          {showAddElderModal && (
            <AddElderModalWrapper
              showAddElderModal={showAddElderModal}
              setShowAddElderModal={setShowAddElderModal}
              token={token}
            />
          )}
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
