import { useState, useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import {
    Sun,
    Cloud,
    CloudRain,
    CloudLightning,
    Snowflake,
    Moon,
    CloudSun,
    CloudFog,
    CloudDrizzle,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useWeather } from '@/hooks/useWeather'

export function LiveWeather() {
    const { data, loading } = useWeather()

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1 bg-white/50 border border-slate-200/60 rounded-full h-8 backdrop-blur-sm">
                <Skeleton className="w-4 h-4 rounded-full" />
                <Skeleton className="w-8 h-3 rounded-full" />
            </div>
        )
    }

    if (!data) return null;

    // Determine icon and animation based on condition code
    const code = data.conditionCode;
    const isDay = data.isDay;

    let Icon = Sun;
    let animateProps = {};
    let iconColor = "text-amber-500";
    let conditionText = data.conditionText;

    if (code === 0) {
        Icon = isDay ? Sun : Moon;
        iconColor = isDay ? "text-amber-500" : "text-indigo-400";
        animateProps = { rotate: isDay ? 360 : [0, 10, -10, 0] };
    } else if (code >= 1 && code <= 3) {
        Icon = isDay ? CloudSun : Cloud; // Simplified
        iconColor = "text-slate-400";
        animateProps = { translateY: [0, -2, 2, 0] };
    } else if (code === 45 || code === 48) {
        Icon = CloudFog;
        iconColor = "text-slate-400";
        animateProps = { opacity: [0.7, 1, 0.7] };
    } else if (code >= 51 && code <= 55) {
        Icon = CloudDrizzle;
        iconColor = "text-blue-400";
        animateProps = { translateY: [0, 2, 0] };
    } else if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) {
        Icon = CloudRain;
        iconColor = "text-blue-500";
        animateProps = { translateY: [0, 3, 0] };
    } else if (code >= 71 && code <= 77 || code === 85 || code === 86) {
        Icon = Snowflake;
        iconColor = "text-cyan-400";
        animateProps = { rotate: 360 };
    } else if (code >= 95 && code <= 99) {
        Icon = CloudLightning;
        iconColor = "text-violet-500";
        animateProps = { opacity: [1, 0.5, 1, 0.8, 1], scale: [1, 1.1, 1] };
    }

    return (
        <div className="flex items-center gap-2.5 px-3 py-1 bg-white/60 border border-slate-200 shadow-sm rounded-full h-8 backdrop-blur-md transition-colors hover:bg-white/80 cursor-default group" title={conditionText}>
            <AnimatePresence>
                <m.div
                    key="weather-icon"
                    animate={animateProps}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className={iconColor}
                >
                    <Icon className="w-4 h-4 fill-current/20" />
                </m.div>
            </AnimatePresence>
            <div className="flex items-center gap-1">
                <span className="text-slate-700 font-bold text-xs tracking-tight">{data.temp}°</span>
                <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">{conditionText}</span>
            </div>
        </div>
    )
}
