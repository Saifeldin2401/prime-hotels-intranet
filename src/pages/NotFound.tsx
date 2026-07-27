import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoHome = () => {
    navigate(user ? '/dashboard' : '/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-hotel-navy p-4 relative overflow-hidden">
      {/* Background orb */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-hotel-gold/5 rounded-full blur-[120px]" />
      </div>

      <div className="text-center max-w-sm relative z-10">
        {/* REMAL Emblem */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-center mb-8"
        >
          <img
            src="/remal-emblem-icon.png"
            alt="REMAL"
            className="h-20 w-20 object-contain opacity-60"
          />
        </motion.div>

        {/* 404 Number */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-8xl font-bold text-hotel-gold/20 font-sans leading-none mb-4 select-none"
        >
          404
        </motion.h1>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl font-semibold text-white mb-3"
        >
          {t('notFound.title', 'Page Not Found')}
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-white/50 text-sm mb-8 leading-relaxed"
        >
          {t('notFound.description', 'The page you are looking for does not exist or has been moved.')}
        </motion.p>

        {/* Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Button
            onClick={handleGoHome}
            className="gap-2 bg-hotel-gold hover:bg-hotel-gold-dark text-hotel-navy font-semibold px-8 py-2.5 rounded-full shadow-lg shadow-hotel-gold/20 transition-all"
          >
            <Home className="w-4 h-4" />
            {user
              ? t('notFound.goToDashboard', 'Go to Dashboard')
              : t('notFound.goToLogin', 'Go to Login')
            }
          </Button>
        </motion.div>

        {/* Watermark */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 text-[10px] text-white/20 uppercase tracking-[0.3em]"
        >
          REMAL HOSPITALITY
        </motion.p>
      </div>
    </div>
  );
}
