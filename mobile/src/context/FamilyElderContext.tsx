import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

export type ElderSummary = {
  id: string;
  name: string;
  age?: number | string;
  gender?: string;
  location?: string;
  primaryCondition?: string;
  bloodType?: string;
  emergencyContact1?: { name?: string; relationship?: string; phone?: string };
  emergencyContact2?: { name?: string; relationship?: string; phone?: string };
  primaryDoctor?: { name?: string; phone?: string };
  preferredHospital?: { name?: string; phone?: string };
  allergies?: string;
  dietaryRestrictions?: string;
  mobilityAids?: string;
  hasProfileAdded: boolean;
  lastActivityAt?: string | null;
  healthUpdates?: unknown[];
  updates?: unknown[];
  medicineIntakeLogs?: unknown[];
  tasks?: unknown[];
  sosAlerts?: unknown[];
};

type FamilyElderContextValue = {
  elders: ElderSummary[];
  selectedElderId: string | null;
  setSelectedElderId: (id: string | null) => void;
  loadError: string;
  refresh: () => Promise<void>;
  isLoading: boolean;
};

const FamilyElderContext = createContext<FamilyElderContextValue | null>(null);

export function useFamilyElder(): FamilyElderContextValue | null {
  return useContext(FamilyElderContext);
}

type Props = {
  token: string | null;
  userId: string | null;
  children: React.ReactNode;
};

export function FamilyElderProvider({ token, userId, children }: Props) {
  const [elders, setElders] = useState<ElderSummary[]>([]);
  const [selectedElderId, setSelectedElderIdState] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !token) {
      setElders([]);
      setSelectedElderIdState(null);
      setLoadError('');
      return;
    }
    setIsLoading(true);
    setLoadError('');
    try {
      const res = await apiFetch('/users/me/elders', { token });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(data.message || "Could not load elders.");
        setElders([]);
        return;
      }
      const list = Array.isArray(data.elders) ? data.elders : [];
      setElders(list);
      setSelectedElderIdState((prev) => {
        if (list.length === 0) return null;
        if (list.some((e: ElderSummary) => e.id === prev)) return prev;
        return list[0].id;
      });
    } catch {
      setLoadError("Could not load elder. Make sure you're linked.");
      setElders([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    load();
  }, [load]);

  const setSelectedElderId = useCallback((id: string | null) => {
    setSelectedElderIdState(id);
  }, []);

  const value: FamilyElderContextValue = {
    elders,
    selectedElderId,
    setSelectedElderId,
    loadError,
    refresh: load,
    isLoading,
  };

  return (
    <FamilyElderContext.Provider value={value}>
      {children}
    </FamilyElderContext.Provider>
  );
}
