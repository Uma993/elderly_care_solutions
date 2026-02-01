import React, { createContext, useContext, useEffect, useState } from 'react';
import { getFamilyDashboardData } from '../firebase/dashboardData.js';

const FamilyElderContext = createContext(null);

export function useFamilyElder() {
  const ctx = useContext(FamilyElderContext);
  return ctx;
}

/**
 * Provides elders list and selectedElderId for family users.
 * Wrap dashboard content when currentUser.role === 'family'.
 */
export function FamilyElderProvider({ currentUser, token, children }) {
  const [elders, setElders] = useState([]);
  const [selectedElderId, setSelectedElderIdState] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!currentUser?.id || currentUser.role !== 'family' || !token) {
      setElders([]);
      setSelectedElderIdState(null);
      setLoadError('');
      return;
    }
    let isMounted = true;
    setLoadError('');
    (async () => {
      try {
        const data = await getFamilyDashboardData(currentUser.id, token);
        if (!isMounted || !data) return;
        const elderList = Array.isArray(data.elders) ? data.elders : [];
        setElders(elderList);
        setSelectedElderIdState((prev) => {
          if (elderList.length === 0) return null;
          if (elderList.some((e) => e.id === prev)) return prev;
          return elderList[0].id;
        });
      } catch (err) {
        if (isMounted) setLoadError("Could not load elder. Make sure you're linked.");
      }
    })();
    return () => { isMounted = false; };
  }, [currentUser?.id, currentUser?.role, token, refreshTrigger]);

  const setSelectedElderId = (id) => {
    setSelectedElderIdState(id);
  };

  const value = {
    elders,
    selectedElderId,
    setSelectedElderId,
    loadError,
    refreshTrigger,
    setRefreshTrigger
  };

  return (
    <FamilyElderContext.Provider value={value}>
      {children}
    </FamilyElderContext.Provider>
  );
}

export default FamilyElderContext;
