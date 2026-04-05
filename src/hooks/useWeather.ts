import { useEffect, useState } from 'react';

export interface WeatherData {
    temp: number;
    conditionCode: number;
    isDay: boolean;
    conditionText: string;
}

const WEATHER_CACHE_KEY = 'prime_dashboard_weather_cache'

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

        const readCachedWeather = () => {
            try {
                const cached = localStorage.getItem(WEATHER_CACHE_KEY)
                if (!cached) return null
                const parsed = JSON.parse(cached) as { timestamp?: number; payload?: WeatherData }
                if (!parsed?.timestamp || !parsed.payload) return null
                const maxAgeMs = 1000 * 60 * 30
                if (Date.now() - parsed.timestamp > maxAgeMs) return null
                return parsed.payload
            } catch {
                return null
            }
        }

        const persistWeather = (payload: WeatherData) => {
            try {
                localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
                    timestamp: Date.now(),
                    payload
                }))
            } catch {
                // Ignore cache write failures.
            }
        }

        const cachedWeather = readCachedWeather()
        if (cachedWeather && mounted) {
            setData(cachedWeather)
            setLoading(false)
        }

        const fetchWeather = async (lat: number, lon: number) => {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000)

            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`
                const res = await fetch(url, { signal: controller.signal })
                if (!res.ok) {
                    throw new Error(`Weather request failed with ${res.status}`)
                }

                const json = await res.json()
                if (!json?.current) {
                    throw new Error('Weather response did not include current conditions')
                }

                if (mounted) {
                    const isDay = json.current.is_day === 1;
                    const code = json.current.weather_code;
                    const nextData = {
                        temp: Math.round(json.current.temperature_2m),
                        conditionCode: code,
                        isDay,
                        conditionText: getConditionText(code, isDay)
                    }

                    setData(nextData)
                    persistWeather(nextData)
                    setLoading(false)
                }
            } catch (error) {
                console.error("Failed to fetch weather:", error)
                if (mounted) {
                    const fallbackWeather = cachedWeather ?? readCachedWeather()
                    if (fallbackWeather) {
                        setData(fallbackWeather)
                    }
                    setLoading(false)
                }
            } finally {
                clearTimeout(timeoutId)
            }
        }

        let locationRequested = false;

        const requestWeatherWithLocation = async () => {
            if (!("geolocation" in navigator)) {
                if (mounted) fetchWeather(defaultLat, defaultLon)
                return
            }

            let permissionDenied = false
            
            // Check permission state first to avoid Chrome warnings
            if ("permissions" in navigator) {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: "geolocation" })
                    permissionDenied = permissionStatus.state === "denied"
                } catch {
                    // Permissions API failed, proceed with geolocation
                }
            }

            if (permissionDenied) {
                if (mounted && !locationRequested) {
                    locationRequested = true
                    fetchWeather(defaultLat, defaultLon)
                }
                return
            }

            // Try to get location
            const timeoutId = setTimeout(() => {
                if (!locationRequested && mounted) {
                    locationRequested = true
                    fetchWeather(defaultLat, defaultLon)
                }
            }, 3000)

            try {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        clearTimeout(timeoutId)
                        if (!locationRequested && mounted) {
                            locationRequested = true
                            fetchWeather(position.coords.latitude, position.coords.longitude)
                        }
                    },
                    () => {
                        clearTimeout(timeoutId)
                        if (!locationRequested && mounted) {
                            locationRequested = true
                            fetchWeather(defaultLat, defaultLon)
                        }
                    },
                    { timeout: 5000 }
                )
            } catch (e) {
                clearTimeout(timeoutId)
                if (!locationRequested && mounted) {
                    locationRequested = true
                    fetchWeather(defaultLat, defaultLon)
                }
            }
        }

        requestWeatherWithLocation()

        return () => {
            mounted = false;
        }
    }, [])

    return { data, loading }
}
