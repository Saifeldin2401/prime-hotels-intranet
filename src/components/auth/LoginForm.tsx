
import { selfServiceUnlockAccount } from '@/lib/authSecurityService';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LoginView } from './LoginView';
import { ForgotPasswordView } from './ForgotPasswordView';
import { ForgotPasswordSuccessView } from './ForgotPasswordSuccessView';

type AuthView = 'login' | 'forgot' | 'forgot_success';

export function LoginForm() {
  const { i18n } = useTranslation('auth');
  const [authView, setAuthView] = useState<AuthView>('login');
  const [resetEmail, setResetEmail] = useState('');
  // Track whether the forgot-password flow was triggered by the unlock CTA
  const isUnlockFlow = useRef(false);

  const isRTL = i18n.dir() === 'rtl';

  const openForgotPassword = useCallback((email?: string) => {
    setResetEmail(email?.trim() ?? '');
    isUnlockFlow.current = false;
    setAuthView('forgot');
  }, []);

  /**
   * Triggered by the "Unlock Account via Password Reset" button on the lockout error.
   * Pre-fills the user's email and marks the flow as an unlock so we clear the
   * lockout state from the database as soon as the reset email is dispatched.
   */
  const openUnlockAccount = useCallback((email: string) => {
    setResetEmail(email.trim());
    isUnlockFlow.current = true;
    setAuthView('forgot');
  }, []);

  const handleBackToLogin = useCallback(() => {
    isUnlockFlow.current = false;
    setAuthView('login');
  }, []);

  const handleForgotSuccess = useCallback(async (email: string) => {
    setResetEmail(email);
    // If the user triggered this from the unlock CTA, clear their lockout immediately
    // so they can sign in as soon as they reset their password.
    if (isUnlockFlow.current) {
      await selfServiceUnlockAccount(email);
      isUnlockFlow.current = false;
    }
    setAuthView('forgot_success');
  }, []);

  const handleTryDifferentEmail = useCallback(() => {
    setResetEmail('');
    setAuthView('forgot');
  }, []);

  if (authView === 'forgot_success') {
    return (
      <ForgotPasswordSuccessView
        email={resetEmail}
        isRTL={isRTL}
        onBackToLogin={handleBackToLogin}
        onTryDifferentEmail={handleTryDifferentEmail}
      />
    );
  }

  if (authView === 'forgot') {
    return (
      <ForgotPasswordView
        isRTL={isRTL}
        initialEmail={resetEmail}
        onBackToLogin={handleBackToLogin}
        onSuccess={handleForgotSuccess}
      />
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <LoginView
          isRTL={isRTL}
          onForgotPassword={() => openForgotPassword()}
          onUnlockAccount={(email: string) => openUnlockAccount(email)}
        />
      </m.div>
    </LazyMotion>
  );
}

export default LoginForm;
