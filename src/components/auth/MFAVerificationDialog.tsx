/**
 * MFA Verification Dialog
 * 
 * Prompts users for their MFA code during login when MFA is enabled.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertCircle, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';

interface MFAVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MFAVerificationDialog({ isOpen, onClose, onSuccess }: MFAVerificationDialogProps) {
  const { t } = useTranslation('auth');
  const { verifyMFA } = useAuth();
  
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError(null);
      setIsVerifying(false);
      // Focus first input after a short delay
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);
  
  const handleVerify = useCallback(async () => {
    if (code.length !== 6) {
      setError(t('mfa.invalid_code', { defaultValue: 'Please enter a valid 6-digit code.' }));
      return;
    }
    
    setIsVerifying(true);
    setError(null);
    
    try {
      const success = await verifyMFA(code);
      if (success) {
        onSuccess();
      } else {
        setError(t('mfa.verification_failed', { defaultValue: 'Invalid code. Please try again.' }));
        setCode('');
        // Reset focus to first input
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError(t('mfa.verification_error', { defaultValue: 'An error occurred. Please try again.' }));
    } finally {
      setIsVerifying(false);
    }
  }, [code, verifyMFA, onSuccess, t]);
  
  // Handle individual digit input
  const handleDigitChange = useCallback((index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    
    if (digit) {
      const newCode = code.split('');
      newCode[index] = digit;
      const updatedCode = newCode.join('').padEnd(6, ' ').slice(0, 6);
      setCode(updatedCode.replace(/\s/g, ''));
      
      // Move to next input
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  }, [code]);
  
  // Handle key navigation
  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
        const newCode = code.split('');
        newCode[index - 1] = '';
        setCode(newCode.join('').replace(/\s/g, ''));
      } else {
        // Clear current input
        const newCode = code.split('');
        newCode[index] = '';
        setCode(newCode.join('').replace(/\s/g, ''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter' && code.length === 6) {
      void handleVerify();
    }
  }, [code, handleVerify]);
  
  // Handle paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      setCode(pasted);
      // Focus the appropriate input
      const focusIndex = Math.min(pasted.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  }, []);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            {t('mfa.verification_title', { defaultValue: 'Two-Factor Authentication' })}
          </DialogTitle>
          <DialogDescription>
            {t('mfa.verification_description', {
              defaultValue: 'Enter the 6-digit code from your authenticator app to continue.',
            })}
          </DialogDescription>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="py-4"
          >
            <div className="space-y-6">
              {/* Code Input */}
              <div className="space-y-2">
                <Label className="text-center block">
                  {t('mfa.code_label', { defaultValue: 'Verification Code' })}
                </Label>
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={code[index] || ''}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-mono"
                      disabled={isVerifying}
                      autoComplete="one-time-code"
                    />
                  ))}
                </div>
              </div>
              
              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Help Text */}
              <div className="text-center text-sm text-gray-500">
                <p>
                  {t('mfa.help_text', {
                    defaultValue: 'Open your authenticator app to view the current code.',
                  })}
                </p>
                <p className="mt-2">
                  {t('mfa.backup_code_info', {
                    defaultValue: 'Lost access? Use one of your backup codes.',
                  })}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
            disabled={isVerifying}
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          
          <Button
            onClick={() => void handleVerify()}
            disabled={isVerifying || code.length !== 6}
            className="w-full sm:w-auto"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('mfa.verifying', { defaultValue: 'Verifying...' })}
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                {t('mfa.verify', { defaultValue: 'Verify' })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MFAVerificationDialog;
