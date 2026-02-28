import { useState, useEffect } from 'react'

export interface WeatherData {
    temp: number;
    conditionCode: number;
    isDay: boolean;
    conditionText: string;
}

export function useWeather() {
    const [data, setData] = useState<WeatherData | null>(null)
    const [loading, setLoading] = useState(true)

    // Default coordinates (Riyadh, KSA)
    const defaultLat = 24.7136
    const defaultLon = 46.6753

    const getConditionText = (code: number, isDay: boolean) => {
        if (code === 0) return isDay ? "Sunny" : "Clear";
        if (code >= 1 && code <= 3) return "Cloudy";
        if (code === 45 || code === 48) return "Foggy";
        if (code >= 51 && code <= 55) return "Drizzle";
        if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return "Raining";
        if (code >= 71 && code <= 77 || code === 85 || code === 86) return "Snowing";
        if (code >= 95 && code <= 99) return "Stormy";
        return isDay ? "Sunny" : "Clear";
    }

    useEffect(() => {
        let mounted = true;

        const fetchWeather = async (lat: number, lon: number) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`
                const res = await fetch(url)
                const json = await res.json()

                if (mounted && json.current) {
                    const isDay = json.current.is_day === 1;
                    const code = json.current.weather_code;
                    setData({
                        temp: Math.round(json.current.temperature_2m),
                        conditionCode: code,
                        isDay,
                        conditionText: getConditionText(code, isDay)
                    })
                    setLoading(false)
                }
            } catch (error) {
                console.error("Failed to fetch weather:", error)
                if (mounted) setLoading(false)
            }
        }

        let locationRequested = false;

        if ("geolocation" in navigator) {
            const timeoutId = setTimeout(() => {
                if (!locationRequested && mounted) {
                    locationRequested = true;
                    fetchWeather(defaultLat, defaultLon);
                }
            }, 3000);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeoutId);
                    if (!locationRequested && mounted) {
                        locationRequested = true;
                        fetchWeather(position.coords.latitude, position.coords.longitude)
                    }
                },
                () => {
                    clearTimeout(timeoutId);
                    if (!locationRequested && mounted) {
                        locationRequested = true;
                        fetchWeather(defaultLat, defaultLon)
                    }
                },
                { timeout: 5000 }
            )
        } else {
            if (mounted) fetchWeather(defaultLat, defaultLon)
        }

        return () => {
            mounted = false;
        }
    }, [])

    return { data, loading }
}
