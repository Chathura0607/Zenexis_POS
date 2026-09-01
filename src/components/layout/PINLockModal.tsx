import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Delete, ArrowRight, ShieldAlert } from 'lucide-react';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 30;

export const PINLockModal: React.FC = () => {
  const { isLocked, unlockScreen } = useAuth();
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  useEffect(() => {
    if (!isLocked) {
      setPin('');
      setErrorMsg('');
      setFailedAttempts(0);
      setLockoutSeconds(0);
    }
  }, [isLocked]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          setErrorMsg('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLocked || lockoutSeconds > 0) return;
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 6) {
          setPin(prev => prev + e.key);
          setErrorMsg('');
        }
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, pin, lockoutSeconds]);

  if (!isLocked) return null;

  const handleKeyClick = (digit: string) => {
    if (lockoutSeconds > 0) return;
    if (pin.length < 6) {
      setPin(prev => prev + digit);
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    if (lockoutSeconds > 0) return;
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (lockoutSeconds > 0) return;
    setPin('');
    setErrorMsg('');
  };

  const handleSubmit = async () => {
    if (lockoutSeconds > 0) return;
    if (pin.length < 4) {
      setErrorMsg('Please enter a valid 4-digit PIN');
      return;
    }
    setIsSubmitting(true);
    const res = await unlockScreen(pin);
    setIsSubmitting(false);

    if (res.success) {
      setFailedAttempts(0);
      setLockoutSeconds(0);
    } else {
      const nextFailed = failedAttempts + 1;
      setFailedAttempts(nextFailed);
      setPin('');

      if (nextFailed >= MAX_FAILED_ATTEMPTS) {
        setLockoutSeconds(LOCKOUT_DURATION_SECONDS);
        setErrorMsg(`Too many failed attempts! Terminal locked for ${LOCKOUT_DURATION_SECONDS}s.`);
      } else {
        setErrorMsg(`${res.error || 'Incorrect PIN code'} (${MAX_FAILED_ATTEMPTS - nextFailed} attempts left)`);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-sky-500/20 mb-4">
          <Lock className="w-8 h-8 text-white animate-pulse" />
        </div>

        <h2 className="text-2xl font-extrabold text-white tracking-wide">ZENEXIS POS</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">Enter your 4-digit Staff PIN to unlock</p>

        {/* PIN Indicators */}
        <div className="flex space-x-3 mb-6">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                pin.length > index
                  ? 'bg-sky-400 border-sky-400 scale-110 shadow-md shadow-sky-400/50'
                  : 'border-slate-700 bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Error / Lockout message */}
        {lockoutSeconds > 0 ? (
          <div className="text-xs text-amber-300 font-semibold mb-4 bg-amber-950/60 border border-amber-500/40 px-3.5 py-2 rounded-xl flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Security Lockout: Wait {lockoutSeconds}s</span>
          </div>
        ) : errorMsg ? (
          <div className="text-xs text-rose-400 font-medium mb-4 bg-rose-950/40 border border-rose-500/30 px-3 py-1.5 rounded-lg text-center">
            {errorMsg}
          </div>
        ) : (
          <div className="h-6 mb-4" />
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              disabled={lockoutSeconds > 0}
              onClick={() => handleKeyClick(num.toString())}
              className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-sky-600 disabled:opacity-30 disabled:cursor-not-allowed text-xl font-bold text-slate-100 border border-slate-700/60 shadow transition-all duration-100 flex items-center justify-center hover:scale-105"
            >
              {num}
            </button>
          ))}
          <button
            disabled={lockoutSeconds > 0}
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-800/50 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 transition flex items-center justify-center"
          >
            CLEAR
          </button>
          <button
            disabled={lockoutSeconds > 0}
            onClick={() => handleKeyClick('0')}
            className="h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-sky-600 disabled:opacity-30 disabled:cursor-not-allowed text-xl font-bold text-slate-100 border border-slate-700/60 shadow transition-all duration-100 flex items-center justify-center hover:scale-105"
          >
            0
          </button>
          <button
            disabled={lockoutSeconds > 0}
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-800/50 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-slate-200 border border-slate-800 transition flex items-center justify-center"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Unlock Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || pin.length < 4 || lockoutSeconds > 0}
          className="w-full h-12 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition"
        >
          <span>Unlock Terminal</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Quick Demo PIN Helper */}
        <div className="mt-6 pt-4 border-t border-slate-800 w-full text-center">
          <p className="text-[11px] text-slate-500">Default PINs:</p>
          <div className="flex justify-center space-x-4 mt-1">
            <span className="text-[11px] text-sky-400 bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/40">
              Owner: <strong className="font-mono">1234</strong>
            </span>
            <span className="text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
              Cashier: <strong className="font-mono">5678</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

