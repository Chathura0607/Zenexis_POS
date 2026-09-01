import React, { createContext, useContext, useState, useEffect } from 'react';
import { Shift } from '../types';
import { db } from '../db/db';
import { useAuth } from './AuthContext';
import { openNewShift, closeCurrentShift } from '../services/payrollService';

interface ShiftContextType {
  activeShift: Shift | null;
  isOpenDrawerModal: boolean;
  openDrawerModal: () => void;
  closeDrawerModal: () => void;
  startShift: (openingCash: number) => Promise<{ success: boolean; error?: string }>;
  endShift: (countedCash: number, notes?: string) => Promise<{ success: boolean; error?: string }>;
  refreshShift: () => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [isOpenDrawerModal, setIsOpenDrawerModal] = useState<boolean>(false);

  const refreshShift = async () => {
    if (!currentUser) {
      setActiveShift(null);
      return;
    }
    const current = await db.shifts.where('status').equals('Open').first();
    setActiveShift(current || null);
  };

  useEffect(() => {
    refreshShift();
  }, [currentUser]);

  const startShift = async (openingCash: number) => {
    if (!currentUser) return { success: false, error: 'User not logged in' };
    const res = await openNewShift(currentUser.id, currentUser.name, openingCash);
    if (res.success && res.shift) {
      setActiveShift(res.shift);
      setIsOpenDrawerModal(false);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const endShift = async (countedCash: number, notes?: string) => {
    if (!activeShift) return { success: false, error: 'No active shift to close' };
    const res = await closeCurrentShift(activeShift.id, countedCash, notes);
    if (res.success) {
      setActiveShift(null);
      setIsOpenDrawerModal(false);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  return (
    <ShiftContext.Provider
      value={{
        activeShift,
        isOpenDrawerModal,
        openDrawerModal: () => setIsOpenDrawerModal(true),
        closeDrawerModal: () => setIsOpenDrawerModal(false),
        startShift,
        endShift,
        refreshShift,
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
};

export const useShift = () => {
  const context = useContext(ShiftContext);
  if (!context) throw new Error('useShift must be used within a ShiftProvider');
  return context;
};
