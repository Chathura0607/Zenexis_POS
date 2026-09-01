import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, UserRole } from '../types';
import { authenticateWithPin, logAuditEvent } from '../services/authService';
import { db } from '../db/db';

interface AuthContextType {
  currentUser: Employee | null;
  isLocked: boolean;
  isOwner: boolean;
  loginWithPin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  lockScreen: () => void;
  unlockScreen: (pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Restore or load default user on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedUserId = localStorage.getItem('zenexis_user_id');
      if (savedUserId) {
        const user = await db.employees.get(savedUserId);
        if (user && user.active) {
          setCurrentUser(user);
          return;
        }
      }
      // If none saved, default prompt for PIN by setting locked
      setIsLocked(true);
    };
    initAuth();
  }, []);

  const loginWithPin = async (pin: string) => {
    const res = await authenticateWithPin(pin);
    if (res.success && res.employee) {
      setCurrentUser(res.employee);
      setIsLocked(false);
      localStorage.setItem('zenexis_user_id', res.employee.id);
      return { success: true };
    }
    return { success: false, error: res.error || 'Authentication failed' };
  };

  const lockScreen = () => {
    setIsLocked(true);
  };

  const unlockScreen = async (pin: string) => {
    const res = await authenticateWithPin(pin);
    if (res.success && res.employee) {
      // If another user logged in on unlock, switch active user
      setCurrentUser(res.employee);
      setIsLocked(false);
      localStorage.setItem('zenexis_user_id', res.employee.id);
      return { success: true };
    }
    return { success: false, error: res.error || 'Incorrect PIN' };
  };

  const logout = async () => {
    if (currentUser) {
      await logAuditEvent({
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'LOGOUT',
        details: `${currentUser.name} logged out`
      });
    }
    setCurrentUser(null);
    setIsLocked(true);
    localStorage.removeItem('zenexis_user_id');
  };

  const switchUser = () => {
    setIsLocked(true);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLocked,
        isOwner: currentUser?.role === 'owner',
        loginWithPin,
        lockScreen,
        unlockScreen,
        logout,
        switchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
