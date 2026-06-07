/**
 * Session Timeout Warning Component
 * 
 * Displays a warning dialog when the session is about to expire
 * and allows the user to extend their session.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { recordAuthEvent } from '@/lib/authMonitor';

interface SessionTimeoutWarningProps {
  /** Warning threshold in minutes (default: 5) */
  warningThreshold?: number;
  /** Total session timeout in minutes (default: 60) */
  sessionTimeout?: number;
  /** Callback when session expires */
  onSessionExpired?: () => void;
}

export function SessionTimeoutWarning({
  warningThreshold = 5,
  sessionTimeout = 60,
  onSessionExpired,
}: SessionTimeoutWarningProps) {
  const { t } = useTranslation('auth');
  const { refreshSession, signOut, user } = useAuth();
  
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(warningThreshold * 60);
  const [isExtending, setIsExtending] = useState(false);
  
  const lastActivityRef = useRef(Date.now());
  const warningShownRef = useRef(false);
  const intervalRef = useRef<number | null>(null);
  
  // Track user activity
  const updateLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);
  
  // Listen for user activity
  useEffect(() => {
    if (!user) return;
    
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      updateLastActivity();
      
      // Reset warning if user becomes active
      if (warningShownRef.current) {
        warningShownRef.current = false;
        setShowWarning(false);
      }
    };
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user, updateLastActivity]);
  
  // Check for session timeout
  useEffect(() => {
    if (!user) {
      setShowWarning(false);
      return;
    }
    
    const checkInterval = 1000; // Check every second
    const warningTime = warningThreshold * 60 * 1000; // Convert to ms
    const timeoutTime = sessionTimeout * 60 * 1000; // Convert to ms
    
    intervalRef.current = window.setInterval(() => {
      const idleTime = Date.now() - lastActivityRef.current;
      
      // Show warning when approaching timeout
      if (idleTime > timeoutTime - warningTime && !warningShownRef.current) {
        warningShownRef.current = true;
        setShowWarning(true);
        setRemainingSeconds(Math.ceil((timeoutTime - idleTime) / 1000));
      }
      
      // Update countdown
      if (warningShownRef.current) {
        const remaining = Math.ceil((timeoutTime - idleTime) / 1000);
        setRemainingSeconds(Math.max(0, remaining));
        
        // Session expired
        if (remaining <= 0) {
          handleSessionExpired();
        }
      }
    }, checkInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, warningThreshold, sessionTimeout]);
  
  const handleSessionExpired = useCallback(async () => {
    setShowWarning(false);
    
    recordAuthEvent({
      type: 'logout',
      success: true,
      details: { reason: 'session_timeout' },
    });
    
    await signOut();
    onSessionExpired?.();
  }, [signOut, onSessionExpired]);
  
  const handleExtendSession = useCallback(async () => {
    setIsExtending(true);
    
    try {
      await refreshSession();
      
      lastActivityRef.current = Date.now();
      warningShownRef.current = false;
      setShowWarning(false);
      
      recordAuthEvent({
        type: 'token_refresh',
        success: true,
        details: { reason: 'user_initiated_extension' },
      });
    } catch (error) {
      recordAuthEvent({
        type: 'token_refresh',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { reason: 'extension_failed' },
      });
      
      // If refresh fails, sign out
      await handleSessionExpired();
    } finally {
      setIsExtending(false);
    }
  }, [refreshSession, handleSessionExpired]);
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Don't render if no user
  if (!user) return null;
  
  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            {t('session_timeout.title', { defaultValue: 'Session Expiring Soon' })}
          </DialogTitle>
          <DialogDescription>
            {t('session_timeout.description', {
              defaultValue: 'Your session is about to expire due to inactivity. Would you like to stay logged in?',
            })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key="countdown"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="h-10 w-10 text-amber-600" />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-amber-200"
                  animate={{ scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">
                  {t('session_timeout.time_remaining', { defaultValue: 'Time remaining' })}
                </p>
                <p className={`text-3xl font-bold font-mono ${
                  remainingSeconds < 60 ? 'text-red-600' : 'text-amber-600'
                }`}>
                  {formatTime(remainingSeconds)}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSessionExpired}
            className="w-full sm:w-auto"
            disabled={isExtending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('session_timeout.logout', { defaultValue: 'Logout' })}
          </Button>
          
          <Button
            onClick={handleExtendSession}
            className="w-full sm:w-auto"
            disabled={isExtending}
          >
            {isExtending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('session_timeout.extending', { defaultValue: 'Extending...' })}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('session_timeout.stay_logged_in', { defaultValue: 'Stay Logged In' })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SessionTimeoutWarning;
