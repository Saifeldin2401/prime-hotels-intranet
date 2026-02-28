import { m } from 'framer-motion'
import { Sun, Cloud, Snowflake, Moon } from 'lucide-react'

interface WeatherBackgroundProps {
    code: number;
    isDay: boolean;
}

export function WeatherBackground({ code, isDay }: WeatherBackgroundProps) {
    let mode = 'clear';
    if (code >= 1 && code <= 3) mode = 'cloudy';
    if (code === 45 || code === 48) mode = 'foggy';
    if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82)) mode = 'rain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) mode = 'snow';
    if (code >= 95 && code <= 99) mode = 'storm';

    // Generate stable random items based on mode
    const count = 30; // 30 rain/snow particles
    const particles = Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100 + '%',
        delay: Math.random() * 2,
        duration: 1 + Math.random() // for rain
    }))

    const snowParticles = Array.from({ length: count }).map((_, i) => ({
        id: i,
        left: Math.random() * 100 + '%',
        delay: Math.random() * 5,
        duration: 4 + Math.random() * 4 // for snow
    }))

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 rounded-[20px]">
            {/* The base gradient is controlled by the parent or we can add subtle tints here */}
            {mode === 'clear' && isDay && (
                <m.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 200, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-32 -right-32 text-amber-500/10"
                >
                    <Sun className="w-96 h-96" strokeWidth={1} />
                </m.div>
            )}

            {mode === 'clear' && !isDay && (
                <m.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 300, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-16 -right-16 text-indigo-400/10"
                >
                    <Moon className="w-64 h-64" strokeWidth={1} />
                </m.div>
            )}

            {mode === 'cloudy' && (
                <>
                    <m.div
                        initial={{ x: '-20%' }}
                        animate={{ x: '120%' }}
                        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
                        className="absolute -top-10 text-slate-500/5 w-full h-[300px]"
                    >
                        <Cloud className="w-96 h-96" strokeWidth={0.5} />
                    </m.div>
                    <m.div
                        initial={{ x: '-50%' }}
                        animate={{ x: '150%' }}
                        transition={{ duration: 160, repeat: Infinity, ease: 'linear' }}
                        className="absolute top-10 text-slate-400/5 w-full"
                    >
                        <Cloud className="w-64 h-64" strokeWidth={0.5} />
                    </m.div>
                </>
            )}

            {mode === 'rain' && (
                <div className="absolute inset-0 opacity-40">
                    <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-slate-400/10" />
                    {particles.map((p) => (
                        <m.div
                            key={`rain-${p.id}`}
                            initial={{ y: -50, left: p.left, opacity: 0 }}
                            animate={{ y: '120%', opacity: [0, 1, 0] }}
                            transition={{ duration: p.duration, repeat: Infinity, ease: 'linear', delay: p.delay }}
                            className="absolute -top-10 text-blue-500"
                        >
                            <div className="w-[1.5px] h-8 bg-gradient-to-b from-transparent to-blue-500/40 rotate-[15deg]" />
                        </m.div>
                    ))}
                </div>
            )}

            {mode === 'snow' && (
                <div className="absolute inset-0 opacity-40">
                    <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-slate-300/10" />
                    {snowParticles.map((p) => (
                        <m.div
                            key={`snow-${p.id}`}
                            initial={{ y: -50, left: p.left, opacity: 0 }}
                            animate={{ y: '120%', opacity: [0, 1, 0], rotate: 360 }}
                            transition={{ duration: p.duration, repeat: Infinity, ease: 'linear', delay: p.delay }}
                            className="absolute -top-10 text-slate-300"
                        >
                            <Snowflake className="w-5 h-5 text-slate-400/30" />
                        </m.div>
                    ))}
                </div>
            )}

            {mode === 'storm' && (
                <>
                    <m.div
                        animate={{ opacity: [0, 0, 0.4, 0, 0, 0, 0.6, 0, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-0 bg-violet-500/5 mix-blend-color-burn"
                    />
                    <m.div
                        initial={{ x: '-20%' }}
                        animate={{ x: '120%' }}
                        transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
                        className="absolute top-0 text-slate-600/5 w-full"
                    >
                        <Cloud className="w-96 h-96" strokeWidth={0.5} />
                    </m.div>
                    <div className="absolute inset-0 opacity-40">
                        {particles.map((p) => (
                            <m.div
                                key={`storm-rain-${p.id}`}
                                initial={{ y: -50, left: p.left, opacity: 0 }}
                                animate={{ y: '120%', opacity: [0, 1, 0] }}
                                transition={{ duration: p.duration * 0.7, repeat: Infinity, ease: 'linear', delay: p.delay }}
                                className="absolute -top-10 text-blue-600"
                            >
                                <div className="w-[2px] h-10 bg-gradient-to-b from-transparent to-blue-600/40 rotate-[20deg]" />
                            </m.div>
                        ))}
                    </div>
                </>
            )}

            {mode === 'foggy' && (
                <m.div
                    initial={{ opacity: 0.3, x: '-5%' }}
                    animate={{ opacity: 0.7, x: '5%' }}
                    transition={{ duration: 10, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
                    className="absolute inset-0 bg-gradient-to-b from-slate-200/10 via-slate-100/30 to-slate-200/10 blur-xl"
                />
            )}

            {/* Subtle tint based on condition */}
            <div className={`absolute inset-0 mix-blend-multiply transition-colors duration-1000 z-0
                ${mode === 'clear' && isDay ? 'bg-amber-100/5' : ''}
                ${mode === 'cloudy' ? 'bg-slate-300/10' : ''}
                ${mode === 'rain' ? 'bg-blue-300/10' : ''}
                ${mode === 'snow' ? 'bg-slate-200/20' : ''}
                ${mode === 'storm' ? 'bg-slate-500/10' : ''}
                ${mode === 'foggy' ? 'bg-slate-100/30' : ''}
                ${!isDay && mode === 'clear' ? 'bg-slate-900/10' : ''}
            `} />
        </div>
    )
}
