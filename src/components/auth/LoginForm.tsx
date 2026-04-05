import { useAuth } from '@/hooks/useAuth';
import { showSuccessToast } from '@/lib/toastHelpers';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LoginView } from './LoginView';
import { ForgotPasswordView } from './ForgotPasswordView';
import { ForgotPasswordSuccessView } from './ForgotPasswordSuccessView';
import { SuccessView } from './SuccessView';

type AuthView = 'login' | 'forgot' | 'forgot_success';

export function LoginForm() {
  const { t, i18n } = useTranslation('auth');
  const [authView, setAuthView] = useState<AuthView>('login');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  const isRTL = i18n.dir() === 'rtl';

  const handleSuccess = useCallback(() => {
    setSuccess(true);
    showSuccessToast(t('welcome_back'), t('redirecting'));
    // Redirect handled by AuthContext/AppRouter
  }, [t]);

  const openForgotPassword = useCallback(() => {
    setResetEmail(email.trim());
    setAuthView('forgot');
  }, [email]);

  const handleBackToLogin = useCallback(() => {
    setAuthView('login');
  }, []);

  const handleForgotSuccess = useCallback((email: string) => {
    setResetEmail(email);
    setAuthView('forgot_success');
  }, []);

  const handleTryDifferentEmail = useCallback(() => {
    setResetEmail('');
    setAuthView('forgot');
  }, []);

  // Handle successful login from LoginView
  const handleLoginSuccess = useCallback(() => {
    handleSuccess();
  }, [handleSuccess]);

  if (success) {
    return <SuccessView />;
  }

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
          onForgotPassword={openForgotPassword}
        />
      </m.div>
    </LazyMotion>
  );
}

export default LoginForm;
