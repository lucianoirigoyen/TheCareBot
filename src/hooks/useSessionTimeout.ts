import { useState, useEffect, useCallback, useRef } from 'react';
import { MedicalSessionUI } from '@/types/medical';

interface UseSessionTimeoutOptions {
  timeoutDuration?: number; // milliseconds, default 20 minutes
  warningDuration?: number; // milliseconds, default 2 minutes
  onTimeout?: () => void;
  onWarning?: () => void;
  onExtend?: () => void;
  demoMode?: boolean;
}

const DEFAULT_TIMEOUT_DURATION = 20 * 60 * 1000; // 20 minutes
const DEFAULT_WARNING_DURATION = 2 * 60 * 1000; // 2 minutes

export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const {
    timeoutDuration = DEFAULT_TIMEOUT_DURATION,
    warningDuration = DEFAULT_WARNING_DURATION,
    onTimeout,
    onWarning,
    onExtend,
    demoMode = false,
  } = options;

  const [sessionState, setSessionState] = useState<MedicalSessionUI>({
    remainingTime: timeoutDuration,
    warningShown: false,
    countdownVisible: false,
    demoMode,
    isActive: true,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastActivityRef = useRef<number>(Date.now());

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Reset session if we were in warning state
    if (sessionState.warningShown && sessionState.isActive) {
      setSessionState(prev => ({
        ...prev,
        remainingTime: timeoutDuration,
        warningShown: false,
        countdownVisible: false,
      }));
      startTimeRef.current = Date.now();
      onExtend?.();
    }
  }, [sessionState.warningShown, sessionState.isActive, timeoutDuration, onExtend]);

  // Start session timer
  const startSession = useCallback(() => {
    const now = Date.now();
    startTimeRef.current = now;
    lastActivityRef.current = now;
    
    setSessionState(prev => ({
      ...prev,
      remainingTime: timeoutDuration,
      warningShown: false,
      countdownVisible: false,
      isActive: true,
    }));
  }, [timeoutDuration]);

  // End session
  const endSession = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      remainingTime: 0,
      warningShown: false,
      countdownVisible: false,
      isActive: false,
    }));
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    onTimeout?.();
  }, [onTimeout]);

  // Extend session
  const extendSession = useCallback(() => {
    updateActivity();
  }, [updateActivity]);

  // Format remaining time for display
  const formatRemainingTime = useCallback((timeInMs: number): string => {
    if (timeInMs <= 0) return '00:00';
    
    const minutes = Math.floor(timeInMs / (1000 * 60));
    const seconds = Math.floor((timeInMs % (1000 * 60)) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Get warning message based on remaining time
  const getWarningMessage = useCallback((timeInMs: number): string => {
    if (timeInMs <= 0) {
      return 'La sesión ha expirado por seguridad';
    }
    
    const minutes = Math.ceil(timeInMs / (1000 * 60));
    
    if (minutes === 1) {
      return `Su sesión expirará en menos de 1 minuto. Haga clic para extender.`;
    }
    
    return `Su sesión expirará en ${minutes} minutos. Haga clic para extender.`;
  }, []);

  // Main timer effect
  useEffect(() => {
    if (!sessionState.isActive) return;

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      const remaining = Math.max(0, timeoutDuration - elapsed);
      
      setSessionState(prev => {
        const newState = { ...prev, remainingTime: remaining };
        
        // Check if we should show warning
        if (remaining <= warningDuration && !prev.warningShown) {
          newState.warningShown = true;
          newState.countdownVisible = true;
          onWarning?.();
        }
        
        // Check if session has expired
        if (remaining <= 0 && prev.isActive) {
          newState.isActive = false;
          // endSession will be called in the next effect
        }
        
        return newState;
      });
    }, 1000); // Update every second

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionState.isActive, timeoutDuration, warningDuration, onWarning]);

  // Handle session expiration
  useEffect(() => {
    if (sessionState.remainingTime <= 0 && sessionState.isActive) {
      endSession();
    }
  }, [sessionState.remainingTime, sessionState.isActive, endSession]);

  // Activity listeners for extending session
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    let throttleTimeout: NodeJS.Timeout | null = null;
    
    const throttledUpdateActivity = () => {
      if (throttleTimeout) return;
      
      throttleTimeout = setTimeout(() => {
        updateActivity();
        throttleTimeout = null;
      }, 5000); // Throttle to every 5 seconds
    };

    events.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity);
      });
      
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [updateActivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...sessionState,
    startSession,
    endSession,
    extendSession,
    updateActivity,
    formatRemainingTime: (time?: number) => formatRemainingTime(time ?? sessionState.remainingTime),
    getWarningMessage: (time?: number) => getWarningMessage(time ?? sessionState.remainingTime),
    isExpired: sessionState.remainingTime <= 0,
    isWarningPhase: sessionState.remainingTime <= warningDuration && sessionState.remainingTime > 0,
    timeUntilWarning: Math.max(0, sessionState.remainingTime - warningDuration),
  };
}