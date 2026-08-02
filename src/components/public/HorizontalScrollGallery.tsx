import React, { useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, MapPin, Star } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface GalleryItem {
  id: string;
  title: string;
  location: string;
  category: string;
  image: string;
  tag: string;
  metrics: string;
}

interface HorizontalScrollGalleryProps {
  items?: GalleryItem[];
}

const DEFAULT_ITEMS: GalleryItem[] = [
  {
    id: 'prop-1',
    title: 'PRIME Royal Palace Resort',
    location: 'Riyadh, KSA',
    category: 'LUXURY HERITAGE',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    tag: '5-Star Superior',
    metrics: '320 Suites • 4 Signature Restaurants',
  },
  {
    id: 'prop-2',
    title: 'The Corniche Grand Hotel',
    location: 'Jeddah, KSA',
    category: 'WATERFRONT OASIS',
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    tag: 'Coastal Sanctuary',
    metrics: '210 Bay Rooms • Royal Spa',
  },
  {
    id: 'prop-3',
    title: 'Al Alula Luxury Pavilion',
    location: 'AlUla, KSA',
    category: 'DESERT HAVEN',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
    tag: 'Eco-Luxury Retreat',
    metrics: '85 Private Villas • Wellness Sanctuary',
  },
  {
    id: 'prop-4',
    title: 'PRIME Financial Tower Suites',
    location: 'King Abdullah Financial District, Riyadh',
    category: 'EXECUTIVE URBAN',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80',
    tag: 'Corporate Elite',
    metrics: '150 Residence Suites • Sky Lounge',
  },
];

export function HorizontalScrollGallery({ items = DEFAULT_ITEMS }: HorizontalScrollGalleryProps) {
  const { t } = useTranslation('public');
  const triggerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    let ctx: gsap.Context | null = null;

    // Technical Requirement: Include safety check & delay inside useLayoutEffect
    // to ensure DOM is fully rendered and widths are accurate before ScrollTrigger calculates pinning logic.
    const timer = setTimeout(() => {
      if (!triggerRef.current || !sectionRef.current) return;

      const container = sectionRef.current;
      const totalWidth = container.scrollWidth;
      const viewportWidth = window.innerWidth;
      const scrollDistance = totalWidth - viewportWidth;

      if (scrollDistance <= 0) return;

      ctx = gsap.context(() => {
        gsap.to(container, {
          x: () => -scrollDistance,
          ease: 'none',
          scrollTrigger: {
            trigger: triggerRef.current,
            pin: true,
            scrub: 1,
            end: () => `+=${scrollDistance}`,
            invalidateOnRefresh: true,
          },
        });
      }, triggerRef);
    }, 120);

    return () => {
      clearTimeout(timer);
      if (ctx) ctx.revert();
    };
  }, [items]);

  return (
    <section ref={triggerRef} className="relative overflow-hidden bg-[#fdf8f3] text-[#262626]">
      <div className="h-screen w-full flex flex-col justify-center py-12">
        {/* Header Header */}
        <div className="px-8 md:px-16 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#e4a4bd] block mb-2">
              {t('gallery.badge', 'SUPER TRAVEL COLLECTION')}
            </span>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-[#262626] leading-none">
              {t('gallery.title', 'CURATED DESTINATIONS')}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#262626]/60">
            <span>{t('gallery.drag_hint', 'SCROLL DOWN TO EXPLORE')}</span>
            <ArrowRight className="w-4 h-4 text-[#e4a4bd]" />
          </div>
        </div>

        {/* Sliding Horizontal Container */}
        <div className="w-full overflow-hidden shrink-0">
          <div
            ref={sectionRef}
            className="flex gap-8 px-8 md:px-16 w-max items-center"
          >
            {items.map((item, index) => (
              <div
                key={item.id}
                className="w-[320px] sm:w-[420px] md:w-[520px] shrink-0 group super-travel-card cursor-pointer"
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] bg-[#f5f0eb] mb-6 super-travel-img-wrapper border border-[#262626]/5 shadow-xl">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover super-travel-img"
                  />
                  <div className="absolute top-4 left-4 bg-[#262626]/90 backdrop-blur-md text-[#fdf8f3] px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-[#e4a4bd] fill-[#e4a4bd]" />
                    <span>{item.tag}</span>
                  </div>
                  <div className="absolute bottom-4 right-4 bg-[#e4a4bd] text-[#262626] w-12 h-12 rounded-full flex items-center justify-center font-black text-sm shadow-md">
                    0{index + 1}
                  </div>
                </div>

                <div className="space-y-2 px-1">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.3em] text-[#e4a4bd]">
                    <span>{item.category}</span>
                    <span className="flex items-center gap-1 text-[#262626]/50">
                      <MapPin className="w-3 h-3" />
                      {item.location}
                    </span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#262626] group-hover:text-[#e4a4bd] transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#262626]/70 font-medium">
                    {item.metrics}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
