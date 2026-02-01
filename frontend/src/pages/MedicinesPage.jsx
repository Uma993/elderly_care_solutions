import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ElderMedicinesPage from './ElderMedicinesPage.jsx';
import FamilyMedicinesPage from './FamilyMedicinesPage.jsx';

/**
 * Route /medicines: elder sees today's medicines (mark taken); family sees elder's medicines (add/edit).
 */
function MedicinesPage() {
  const { currentUser } = useOutletContext();
  if (!currentUser) return null;
  if (currentUser.role === 'elderly') return <ElderMedicinesPage />;
  return <FamilyMedicinesPage />;
}

export default MedicinesPage;
