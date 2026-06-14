/**
 * MFA Verification Page
 * 
 * Full-page MFA verification for users who have 2FA enabled.
 * This is shown during login when MFA verification is required.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Shield, AlertCircle, Loader2, Lock, ArrowLeft, Smartphone, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export default function MFAVerifyPage() {
  const { t } = useTranslation('auth');
  const { verifyMFA, user, isMFAVerified } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const redirectTo = searchParams.get('redirect') || '/home';
  
  // Redirect if not logged in or already verified
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    
    if (isMFAVerified) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, isMFAVerified, navigate, redirectTo]);
  
  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);
  
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
        navigate(redirectTo, { replace: true });
      } else {
        setError(t('mfa.verification_failed', { defaultValue: 'Invalid code. Please try again.' }));
        setCode('');
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError(t('mfa.verification_error', { defaultValue: 'An error occurred. Please try again.' }));
    } finally {
      setIsVerifying(false);
    }
  }, [code, verifyMFA, navigate, redirectTo, t]);
  
  // Handle individual digit input
  const handleDigitChange = useCallback((index: number, value: string) => {
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
        inputRefs.current[index - 1]?.focus();
        const newCode = code.split('');
        newCode[index - 1] = '';
        setCode(newCode.join('').replace(/\s/g, ''));
      } else {
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
      const focusIndex = Math.min(pasted.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  }, []);
  
  const handleBackToLogin = useCallback(() => {
    navigate('/login', { replace: true });
  }, [navigate]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {t('mfa.verification_title', { defaultValue: 'Two-Factor Authentication' })}
            </CardTitle>
            <CardDescription>
              {t('mfa.verification_description', {
                defaultValue: 'Enter the 6-digit code from your authenticator app to continue.',
              })}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* User Info */}
            {user && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-semibold text-primary">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('mfa.awaiting_verification', { defaultValue: 'Awaiting verification' })}
                  </p>
                </div>
              </div>
            )}
            
            {/* Code Input */}
            <div className="space-y-3">
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
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
            
            {/* Setup Instructions */}
            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium">
                <Smartphone className="h-4 w-4" />
                <span>New to 2FA? Set up Google Authenticator:</span>
              </div>
              
              {/* App Store Links */}
              <div className="flex gap-2 flex-wrap">
                <a
                  href="https://apps.apple.com/us/app/google-authenticator/id388497605"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-md text-sm text-gray-700 dark:text-gray-200 border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  App Store
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-md text-sm text-gray-700 dark:text-gray-200 border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.5,12.92 20.16,13.19L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                  </svg>
                  Google Play
                </a>
              </div>
              
              {/* Easy Setup Steps */}
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                <li>Download Google Authenticator from the links above</li>
                <li>Open the app and tap "Begin setup"</li>
                <li>Choose "Scan barcode" or "Enter a provided key"</li>
                <li>Scan the QR code or enter the secret key shown during setup</li>
                <li>Enter the 6-digit code below to verify</li>
              </ol>
            </div>
            
            {/* Help Text */}
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>
                {t('mfa.help_text', {
                  defaultValue: 'Open your authenticator app to view the current code.',
                })}
              </p>
              <p>
                {t('mfa.backup_code_info', {
                  defaultValue: 'Lost access? Use one of your backup codes.',
                })}
              </p>
            </div>
            
            {/* Actions */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={() => void handleVerify()}
                disabled={isVerifying || code.length !== 6}
                className="w-full"
                size="lg"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 me-2 animate-spin" />
                    {t('mfa.verifying', { defaultValue: 'Verifying...' })}
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 me-2" />
                    {t('mfa.verify', { defaultValue: 'Verify' })}
                  </>
                )}
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleBackToLogin}
                className="w-full"
                disabled={isVerifying}
              >
                <ArrowLeft className="h-4 w-4 me-2" />
                {t('mfa.back_to_login', { defaultValue: 'Back to Login' })}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t('mfa.security_notice', { defaultValue: 'This adds an extra layer of security to your account.' })}
        </p>
      </motion.div>
    </div>
  );
}
