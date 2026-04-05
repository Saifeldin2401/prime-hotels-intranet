import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Home, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

/**
 * NotFound Page
 * Displayed when authenticated users navigate to non-existent routes
 */
export default function NotFound() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoHome = () => {
    navigate(user ? '/dashboard' : '/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold text-foreground mb-2">
          404
        </h1>
        
        <h2 className="text-xl font-semibold text-foreground mb-4">
          {t('notFound.title', 'Page Not Found')}
        </h2>
        
        <p className="text-muted-foreground mb-8">
          {t('notFound.description', 'The page you are looking for does not exist or has been moved.')}
        </p>
        
        <Button 
          onClick={handleGoHome}
          className="gap-2"
        >
          <Home className="w-4 h-4" />
          {user 
            ? t('notFound.goToDashboard', 'Go to Dashboard')
            : t('notFound.goToLogin', 'Go to Login')
          }
        </Button>
      </div>
    </div>
  );
}
