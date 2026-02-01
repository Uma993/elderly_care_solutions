import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ElderDashboard from './dashboards/ElderDashboard.jsx';
import FamilyDashboard from './dashboards/FamilyDashboard.jsx';

/**
 * Renders the full Elder or Family dashboard as the index route (temporary until grid-only + pages).
 */
function IndexDashboard() {
  const { currentUser, token, onLogout } = useOutletContext();
  if (!currentUser) return null;
  if (currentUser.role === 'elderly') {
    return <ElderDashboard currentUser={currentUser} token={token} onLogout={onLogout} />;
  }
  return <FamilyDashboard currentUser={currentUser} token={token} onLogout={onLogout} />;
}

export default IndexDashboard;
