/**
 * MFA Setup Component
 * 
 * Allows users to set up TOTP-based Multi-Factor Authentication
 * with QR code scanning and backup codes.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Copy, Check, RefreshCw, AlertCircle, Download, Key } from 'lucide-react';
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
import { generateMFASecret, enableMFA, type MFASecret } from '@/lib/authSecurityService';

interface MFASetupProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  isRequired?: boolean;
}

export function MFASetup({ userId, isOpen, onClose, onComplete, isRequired = false }: MFASetupProps) {
  const { t } = useTranslation('auth');
  
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'complete'>('intro');
  const [mfaSecret, setMfaSecret] = useState<MFASecret | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState<number[]>([]);
  
  const handleStartSetup = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const secret = await generateMFASecret(userId);
      if (secret) {
        setMfaSecret(secret);
        setStep('setup');
      } else {
        setError(t('mfa.setup_error', { defaultValue: 'Failed to generate MFA secret. Please try again.' }));
      }
    } catch {
      setError(t('mfa.setup_error', { defaultValue: 'Failed to generate MFA secret. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  }, [userId, t]);
  
  const handleVerify = useCallback(async () => {
    if (verificationCode.length !== 6) {
      setError(t('mfa.invalid_code', { defaultValue: 'Please enter a valid 6-digit code.' }));
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await enableMFA(userId, verificationCode);
      if (success) {
        setStep('complete');
      } else {
        setError(t('mfa.verification_failed', { defaultValue: 'Invalid verification code. Please try again.' }));
      }
    } catch {
      setError(t('mfa.verification_failed', { defaultValue: 'Invalid verification code. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  }, [userId, verificationCode, t]);
  
  const handleCopySecret = useCallback(() => {
    if (mfaSecret?.secret) {
      navigator.clipboard.writeText(mfaSecret.secret);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }, [mfaSecret]);
  
  const handleCopyBackupCode = useCallback((code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedBackupCodes(prev => [...prev, index]);
    setTimeout(() => {
      setCopiedBackupCodes(prev => prev.filter(i => i !== index));
    }, 2000);
  }, []);
  
  const handleDownloadBackupCodes = useCallback(() => {
    if (!mfaSecret?.backupCodes.length) return;
    
    const content = `
${t('mfa.backup_codes_title', { defaultValue: 'MFA Backup Codes' })}
${t('mfa.backup_codes_warning', { defaultValue: 'Keep these codes safe. Each code can only be used once.' })}

${mfaSecret.backupCodes.join('\n')}

Generated: ${new Date().toLocaleString()}
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [mfaSecret, t]);
  
  const handleClose = useCallback(() => {
    if (step === 'complete' || !isRequired) {
      setStep('intro');
      setMfaSecret(null);
      setVerificationCode('');
      setError(null);
      onClose();
      if (step === 'complete') {
        onComplete();
      }
    }
  }, [step, isRequired, onClose, onComplete]);
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t('mfa.title', { defaultValue: 'Set Up Two-Factor Authentication' })}
          </DialogTitle>
          <DialogDescription>
            {step === 'intro' && t('mfa.intro_description', {
              defaultValue: 'Add an extra layer of security to your account by enabling two-factor authentication.',
            })}
            {step === 'setup' && t('mfa.setup_description', {
              defaultValue: 'Scan the QR code with your authenticator app or enter the secret key manually.',
            })}
            {step === 'verify' && t('mfa.verify_description', {
              defaultValue: 'Enter the 6-digit code from your authenticator app to verify setup.',
            })}
            {step === 'complete' && t('mfa.complete_description', {
              defaultValue: 'Two-factor authentication has been enabled. Save your backup codes in a safe place.',
            })}
          </DialogDescription>
        </DialogHeader>
        
        <AnimatePresence mode="wait">
          {/* Intro Step */}
          {step === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-4"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t('mfa.benefits_title', { defaultValue: 'Why enable 2FA?' })}</p>
                    <ul className="text-sm text-gray-600 mt-2 space-y-1">
                      <li>• {t('mfa.benefit_1', { defaultValue: 'Protects against unauthorized access' })}</li>
                      <li>• {t('mfa.benefit_2', { defaultValue: 'Required for administrative roles' })}</li>
                      <li>• {t('mfa.benefit_3', { defaultValue: 'Adds an extra layer of security' })}</li>
                    </ul>
                  </div>
                </div>
                
                {isRequired && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t('mfa.required_message', {
                        defaultValue: 'Two-factor authentication is required for your role. Please set it up to continue.',
                      })}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </motion.div>
          )}
          
          {/* Setup Step */}
          {step === 'setup' && mfaSecret && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-4"
            >
              <div className="space-y-4">
                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-lg shadow-sm border">
                    {mfaSecret.qrCodeUrl ? (
                      <img
                        src={mfaSecret.qrCodeUrl}
                        alt="MFA QR Code"
                        className="w-48 h-48"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-gray-400">
                        <RefreshCw className="h-8 w-8 animate-spin" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Manual Entry */}
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">
                    {t('mfa.manual_entry', { defaultValue: 'Can\'t scan? Enter this code:' })}
                  </Label>
                  <div className="flex gap-2">
                    <code className="flex-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                      {mfaSecret.secret}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopySecret}
                    >
                      {copiedCode ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Verify Step */}
          {step === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-4"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mfa-code">
                    {t('mfa.code_label', { defaultValue: '6-digit Code' })}
                  </Label>
                  <Input
                    id="mfa-code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-widest font-mono"
                    autoComplete="one-time-code"
                  />
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </motion.div>
          )}
          
          {/* Complete Step */}
          {step === 'complete' && mfaSecret && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-4"
            >
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {t('mfa.success_message', { defaultValue: 'Two-factor authentication is now enabled!' })}
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      {t('mfa.backup_codes_title', { defaultValue: 'Backup Codes' })}
                    </Label>
                    {mfaSecret.backupCodes.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadBackupCodes}
                      >
                        <Download className="h-4 w-4 me-1" />
                        {t('mfa.download', { defaultValue: 'Download' })}
                      </Button>
                    ) : null}
                  </div>
                  
                  <p className="text-sm text-gray-600">
                    {mfaSecret.backupCodes.length > 0
                      ? t('mfa.backup_codes_description', {
                          defaultValue: 'Save these codes in a secure location. Each code can be used once if you lose access to your authenticator app.',
                        })
                      : t('mfa.backup_codes_unavailable', {
                          defaultValue: 'Backup codes are not available in this Supabase MFA flow. Keep access to your authenticator app before leaving this screen.',
                        })}
                  </p>
                  
                  {mfaSecret.backupCodes.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {mfaSecret.backupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 p-2 bg-gray-100 rounded font-mono text-sm"
                        >
                          <code className="flex-1">{code}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleCopyBackupCode(code, index)}
                          >
                            {copiedBackupCodes.includes(index) ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <DialogFooter>
          {step === 'intro' && (
            <>
              {!isRequired && (
                <Button variant="ghost" onClick={handleClose}>
                  {t('mfa.skip', { defaultValue: 'Skip for now' })}
                </Button>
              )}
              <Button onClick={handleStartSetup} disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4 me-2" />
                )}
                {t('mfa.start_setup', { defaultValue: 'Start Setup' })}
              </Button>
            </>
          )}
          
          {step === 'setup' && (
            <>
              <Button variant="ghost" onClick={() => setStep('intro')}>
                {t('common.back', { defaultValue: 'Back' })}
              </Button>
              <Button onClick={() => setStep('verify')}>
                {t('mfa.continue', { defaultValue: 'Continue' })}
              </Button>
            </>
          )}
          
          {step === 'verify' && (
            <>
              <Button variant="ghost" onClick={() => setStep('setup')}>
                {t('common.back', { defaultValue: 'Back' })}
              </Button>
              <Button onClick={handleVerify} disabled={isLoading || verificationCode.length !== 6}>
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 me-2" />
                )}
                {t('mfa.verify', { defaultValue: 'Verify' })}
              </Button>
            </>
          )}
          
          {step === 'complete' && (
            <Button onClick={handleClose}>
              <Check className="h-4 w-4 me-2" />
              {t('mfa.done', { defaultValue: 'Done' })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MFASetup;
