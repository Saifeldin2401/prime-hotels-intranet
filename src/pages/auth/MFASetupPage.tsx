/**
 * MFA Setup Page
 * 
 * Full-page MFA setup for users who need to configure 2FA.
 * This is shown when MFA is required but not yet enabled.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Shield, Copy, Check, RefreshCw, AlertCircle, Download, Key, ArrowRight, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { generateMFASecret, enableMFA, type MFASecret } from '@/lib/authSecurityService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

export default function MFASetupPage() {
  const { t } = useTranslation('auth');
  const { user, securityRequirements, isMFAVerified } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'complete'>('intro');
  const [mfaSecret, setMfaSecret] = useState<MFASecret | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState<number[]>([]);
  
  // Redirect if MFA not required or already verified
  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    
    // If MFA is not required or already enabled and verified, redirect to home
    if (securityRequirements) {
      if (!securityRequirements.mfaRequired || (securityRequirements.mfaEnabled && isMFAVerified)) {
        navigate('/home', { replace: true });
      }
    }
  }, [user, securityRequirements, isMFAVerified, navigate]);
  
  const handleStartSetup = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const secret = await generateMFASecret(user.id);
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
  }, [user, t]);
  
  const handleVerify = useCallback(async () => {
    if (!user || verificationCode.length !== 6) {
      setError(t('mfa.invalid_code', { defaultValue: 'Please enter a valid 6-digit code.' }));
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await enableMFA(user.id, verificationCode);
      if (success) {
        setStep('complete');
        toast({
          title: t('mfa.enabled_title', { defaultValue: 'Two-Factor Authentication Enabled' }),
          description: t('mfa.enabled_description', { defaultValue: 'Your account is now more secure.' }),
        });
      } else {
        setError(t('mfa.verification_failed', { defaultValue: 'Invalid verification code. Please try again.' }));
      }
    } catch {
      setError(t('mfa.verification_failed', { defaultValue: 'Invalid verification code. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  }, [user, verificationCode, t, toast]);
  
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
  
  const handleComplete = useCallback(() => {
    navigate('/home', { replace: true });
  }, [navigate]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-full max-w-[200px] flex items-center justify-center mb-6">
              <img src="/altus-logo-light.png" alt="Altus" className="h-24 w-auto object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === 'intro' && t('mfa.title', { defaultValue: 'Set Up Two-Factor Authentication' })}
              {step === 'setup' && t('mfa.scan_qr_title', { defaultValue: 'Scan QR Code' })}
              {step === 'verify' && t('mfa.verify_title', { defaultValue: 'Verify Setup' })}
              {step === 'complete' && t('mfa.complete_title', { defaultValue: 'Setup Complete!' })}
            </CardTitle>
            <CardDescription>
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
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Progress Indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {['intro', 'setup', 'verify', 'complete'].map((s, i) => (
                <div
                  key={s}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    ['intro', 'setup', 'verify', 'complete'].indexOf(step) >= i
                      ? 'w-8 bg-primary'
                      : 'w-2 bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
            
            {/* Intro Step */}
            {step === 'intro' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="bg-primary/5 rounded-xl p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{t('mfa.benefit_1_title', { defaultValue: 'Enhanced Security' })}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('mfa.benefit_1_desc', { defaultValue: 'Protects against unauthorized access even if your password is compromised.' })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{t('mfa.benefit_2_title', { defaultValue: 'Required for Your Role' })}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('mfa.benefit_2_desc', { defaultValue: 'Your administrative role requires two-factor authentication.' })}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    {t('mfa.required_message', {
                      defaultValue: 'Two-factor authentication is required for your role. Please set it up to continue.',
                    })}
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={handleStartSetup} 
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4 me-2" />
                  )}
                  {t('mfa.start_setup', { defaultValue: 'Start Setup' })}
                </Button>
              </motion.div>
            )}
            
            {/* Setup Step */}
            {step === 'setup' && mfaSecret && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Google Authenticator Instructions */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium">
                    <Smartphone className="h-4 w-4" />
                    <span>Download Google Authenticator:</span>
                  </div>
                  
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
                  
                  <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
                    <li>Download Google Authenticator from above</li>
                    <li>Open the app and tap "Begin setup"</li>
                    <li>Tap "Scan a QR code" and scan the code below</li>
                    <li>Or tap "Enter a setup key" and enter the secret key</li>
                  </ol>
                </div>

                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-xl shadow-lg border">
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
                
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    {t('mfa.manual_entry', { defaultValue: 'Can\'t scan? Enter this code:' })}
                  </Label>
                  <div className="flex gap-2">
                    <code className="flex-1 p-3 bg-muted rounded-lg text-sm font-mono break-all">
                      {mfaSecret.secret}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopySecret}
                      className="shrink-0"
                    >
                      {copiedCode ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('intro')}
                    className="flex-1"
                  >
                    {t('common.back', { defaultValue: 'Back' })}
                  </Button>
                  <Button 
                    onClick={() => setStep('verify')}
                    className="flex-1"
                  >
                    {t('mfa.continue', { defaultValue: 'Continue' })}
                    <ArrowRight className="h-4 w-4 ms-2" />
                  </Button>
                </div>
              </motion.div>
            )}
            
            {/* Verify Step */}
            {step === 'verify' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
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
                    className="text-center text-3xl tracking-widest font-mono h-16"
                    autoComplete="one-time-code"
                  />
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('setup')}
                    className="flex-1"
                  >
                    {t('common.back', { defaultValue: 'Back' })}
                  </Button>
                  <Button 
                    onClick={handleVerify} 
                    disabled={isLoading || verificationCode.length !== 6}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <RefreshCw className="h-4 w-4 me-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 me-2" />
                    )}
                    {t('mfa.verify', { defaultValue: 'Verify' })}
                  </Button>
                </div>
              </motion.div>
            )}
            
            {/* Complete Step */}
            {step === 'complete' && mfaSecret && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <Alert className="bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {t('mfa.success_message', { defaultValue: 'Two-factor authentication is now enabled!' })}
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-3">
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
                  
                  <p className="text-sm text-muted-foreground">
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
                          className="flex items-center gap-1 p-2 bg-muted rounded font-mono text-sm"
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
                
                <Button 
                  onClick={handleComplete}
                  className="w-full"
                  size="lg"
                >
                  <Check className="h-4 w-4 me-2" />
                  {t('mfa.go_to_dashboard', { defaultValue: 'Go to Dashboard' })}
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
        
        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t('mfa.help_text', { defaultValue: 'Need help? Contact your system administrator.' })}
        </p>
      </motion.div>
    </div>
  );
}
