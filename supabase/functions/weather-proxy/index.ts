import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const CACHE_DURATION_MS = 1000 * 60 * 15; // 15 minutes cache

// Simple in-memory cache (use Redis in production for multi-instance)
const cache = new Map<string, { data: unknown; timestamp: number }>();

interface WeatherRequest {
  lat?: number;
  lon?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey, x-csrf-token, x-requested-with, Prefer",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    let lat: number;
    let lon: number;

    // Parse request
    if (req.method === "POST") {
      const body = await req.json() as WeatherRequest;
      lat = body.lat ?? 24.7136; // Default: Riyadh
      lon = body.lon ?? 46.6753;
    } else {
      const url = new URL(req.url);
      lat = parseFloat(url.searchParams.get("lat") ?? "24.7136");
      lon = parseFloat(url.searchParams.get("lon") ?? "46.6753");
    }

    // Validate coordinates
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return new Response(
        JSON.stringify({ error: "Invalid coordinates" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Cache key
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      return new Response(JSON.stringify(cached.data), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "X-Cache": "HIT",
        },
      });
    }

    // Fetch from Open-Meteo (server-to-server, no CORS)
    const weatherUrl = `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    
    const response = await fetch(weatherUrl, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache the response
    cache.set(cacheKey, { data, timestamp: Date.now() });

    // Clean old cache entries periodically
    if (Math.random() < 0.01) { // 1% chance
      const now = Date.now();
      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > CACHE_DURATION_MS) {
          cache.delete(key);
        }
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Weather proxy error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Failed to fetch weather data",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
