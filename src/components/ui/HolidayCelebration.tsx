import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Sparkles, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { useTranslation } from 'react-i18next';

export type HolidayEvent = 'RAMADAN' | 'EID_FITR' | 'EID_ADHA' | 'SAUDI_NATIONAL' | 'SAUDI_FOUNDING' | null;

function useWindowSize() {
  const [size, setSize] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }));

  useEffect(() => {
    const updateSize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return size;
}

export function HolidayCelebration() {
  const { i18n } = useTranslation('common');
  const [activeEvent, setActiveEvent] = useState<HolidayEvent>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  useEffect(() => {
    // Check local storage so we don't spam confetti every page reload, just the banner
    const hasSeenConfettiThisYear = localStorage.getItem('phg_holiday_confetti_year');
    const currentYear = new Date().getFullYear().toString();

    const d = new Date();
    const gMonth = d.getMonth() + 1; // 1-12
    const gDay = d.getDate();
    
    // Cache key for the API hijri date. Only fetch once per day.
    const dateStr = `${gDay.toString().padStart(2, '0')}-${gMonth.toString().padStart(2, '0')}-${currentYear}`;
    const cacheKey = `phg_hijri_date_${dateStr}`;

    const determineEvent = async () => {
      let event: HolidayEvent = null;

      // Check fixed Gregorian events
      if (gMonth === 9 && gDay === 23) {
        event = 'SAUDI_NATIONAL';
      } else if (gMonth === 2 && gDay === 22) {
        event = 'SAUDI_FOUNDING';
      } else {
        let hMonth: number | null = null;
        let hDay: number | null = null;

        // 1. Check strict cache
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
             const parsed = JSON.parse(cached);
             hMonth = parsed.hMonth;
             hDay = parsed.hDay;
          } catch(_e) {
            // Ignore invalid cached holiday metadata.
          }
        }
        
        // 2. Fetch from strict authoritative online API if not cached today
        if (!hMonth || !hDay) {
          try {
            // Using HTTP over HTTPS just in case of strictly mapped API endpoints, but HTTPS preferred.
            // AlAdhan API properly supports HTTPS.
            const res = await fetch(`https://api.aladhan.com/v1/gToH?date=${dateStr}&adjustment=0`);
            const data = await res.json();
            if (data?.data?.hijri) {
              hMonth = data.data.hijri.month.number;
              hDay = parseInt(data.data.hijri.day, 10);
              
              localStorage.setItem(cacheKey, JSON.stringify({ hMonth, hDay }));
            }
          } catch (err) {
            console.error("Hijri API fetch failed", err);
          }
        }

        // 3. Fallback to offline native local OS calculation if API failed completely
        if (!hMonth || !hDay) {
          try {
            const hijriDate = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
                day: 'numeric',
                month: 'numeric',
            }).format(d);
            const parts = hijriDate.split('/');
            if (parts.length >= 2) {
              hMonth = parseInt(parts[0], 10);
              hDay = parseInt(parts[1], 10);
            }
          } catch(err) {
            console.error("Hijri local fallback failed", err);
          }
        }

        if (hMonth && hDay) {
          if (hMonth === 9) event = 'RAMADAN';
          // Eid Al-Fitr spans 3 days typically
          else if (hMonth === 10 && hDay >= 1 && hDay <= 3) event = 'EID_FITR';
          // Eid Al-Adha spans 3-4 days (10th to 12th/13th of Dhu al-Hijjah)
          else if (hMonth === 12 && hDay >= 10 && hDay <= 12) event = 'EID_ADHA';
        }
      }

      if (event) {
        setActiveEvent(event);
        setShowBanner(true);
        
        const confettiKey = `${event}_${currentYear}`;
        if (hasSeenConfettiThisYear !== confettiKey) {
          setShowConfetti(true);
          localStorage.setItem('phg_holiday_confetti_year', confettiKey);
          
          // Turn off confetti after 8 seconds
          setTimeout(() => setShowConfetti(false), 8000);
        }
      }
    };

    determineEvent();
  }, []);

  if (!activeEvent || !showBanner) return null;

  const isRtl = i18n.language === 'ar';

  let bannerConfig = {
    bg: 'bg-gradient-to-r from-[#0B1C3E] to-[#1a365d]',
    border: 'border-[#D4AF37]/30',
    icon: <Sparkles className="w-5 h-5 text-[#D4AF37]" />,
    textEn: '',
    textAr: '',
    textColor: 'text-white',
    accentColor: 'text-[#D4AF37]',
    colors: ['#D4AF37', '#ffffff', '#0B1C3E'] // Confetti colors
  };

  switch (activeEvent) {
    case 'RAMADAN':
      bannerConfig = {
        bg: 'bg-gradient-to-r from-[#0A2540] to-[#1e3a8a]',
        border: 'border-[#E6C27A]/40',
        icon: <Moon className="w-5 h-5 text-[#E6C27A]" fill="currentColor" />,
        textEn: 'Ramadan Kareem! Wishing you and your family a blessed month.',
        textAr: 'رمضان كريم! نتمنى لكم ولعائلاتكم شهراً مباركاً.',
        textColor: 'text-white',
        accentColor: 'text-[#E6C27A]',
        colors: ['#E6C27A', '#1e3a8a', '#ffffff']
      };
      break;
    case 'EID_FITR':
      bannerConfig = {
        bg: 'bg-gradient-to-r from-[#0B1C3E] to-[#2563eb]',
        border: 'border-[#D4AF37]/40',
        icon: <Star className="w-5 h-5 text-[#D4AF37]" fill="currentColor" />,
        textEn: 'Eid Al-Fitr Mubarak! May this joyous occasion bring happiness to your home.',
        textAr: 'عيد فطر مبارك! تقبل الله طاعاتكم وأعاده عليكم باليمن والبركات.',
        textColor: 'text-white',
        accentColor: 'text-[#D4AF37]',
        colors: ['#D4AF37', '#2563eb', '#ffffff']
      };
      break;
    case 'EID_ADHA':
      bannerConfig = {
        bg: 'bg-gradient-to-r from-[#0A1F30] to-[#1e40af]',
        border: 'border-[#D4AF37]/40',
        icon: <Star className="w-5 h-5 text-[#D4AF37]" fill="currentColor" />,
        textEn: 'Eid Al-Adha Mubarak! Wishing you health, happiness, and prosperity.',
        textAr: 'عيد أضحى مبارك! كل عام وأنتم بخير وصحة وعافية.',
        textColor: 'text-white',
        accentColor: 'text-[#D4AF37]',
        colors: ['#D4AF37', '#1e40af', '#ffffff']
      };
      break;
    case 'SAUDI_NATIONAL':
      bannerConfig = {
        bg: 'bg-gradient-to-r from-[#006C35] to-[#004d26]',
        border: 'border-[#D4AF37]/40',
        icon: <Sparkles className="w-5 h-5 text-[#D4AF37]" fill="currentColor" />,
        textEn: 'Happy Saudi National Day! We celebrate the glory and vision of the Kingdom.',
        textAr: 'اليوم الوطني السعودي! دام عزك يا وطن، ونحتفل برؤية مملكتنا الحبيبة.',
        textColor: 'text-white',
        accentColor: 'text-[#D4AF37]',
        colors: ['#006C35', '#ffffff', '#D4AF37'] // Saudi Green & White & Gold
      };
      break;
    case 'SAUDI_FOUNDING':
      bannerConfig = {
        bg: 'bg-gradient-to-r from-[#2A1813] to-[#4a2e25]',
        border: 'border-[#D0A45D]/40',
        icon: <Sparkles className="w-5 h-5 text-[#D0A45D]" fill="currentColor" />,
        textEn: 'Happy Saudi Founding Day! Celebrating three centuries of profound heritage.',
        textAr: 'يوم التأسيس! ثلاثة قرون من المجد والاعتزاز بتاريخ مملكتنا العريقة.',
        textColor: 'text-white',
        accentColor: 'text-[#D0A45D]',
        colors: ['#2A1813', '#D0A45D', '#ffffff']
      };
      break;
  }

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`relative z-50 overflow-hidden shadow-md ${bannerConfig.bg} border-b ${bannerConfig.border}`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {/* Ambient pattern overlay */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none" />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-4 rtl:space-x-reverse flex-1">
                  <div className={`p-2 bg-white/10 rounded-full backdrop-blur-sm shadow-inner`}>
                    {bannerConfig.icon}
                  </div>
                  <div className="flex flex-col gap-1 sm:gap-0.5 max-w-[85%]">
                    <p className={`font-medium leading-snug ${bannerConfig.textColor}`}>
                      {isRtl ? bannerConfig.textAr : bannerConfig.textEn}
                    </p>
                    <p className={`text-sm opacity-80 leading-snug ${bannerConfig.textColor}`}>
                      {isRtl ? bannerConfig.textEn : bannerConfig.textAr}
                    </p>
                  </div>
                </div>
                
                <div className="flex-shrink-0 ms-4 rtl:ms-0 rtl:me-4">
                  <Button
                    variant="ghost"
                    onClick={() => setShowBanner(false)}
                    className={`h-8 w-8 hover:bg-white/20 ${bannerConfig.textColor} rounded-full p-0`}
                    aria-label="Close celebration banner"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <Confetti 
            width={width} 
            height={height} 
            colors={bannerConfig.colors}
            recycle={false} // Only shoot once 
            numberOfPieces={600}
            gravity={0.15}
          />
        </div>
      )}
    </>
  );
}
