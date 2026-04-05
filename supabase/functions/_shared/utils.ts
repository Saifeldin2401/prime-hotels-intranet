// Shared utilities for Supabase Edge Functions

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID
 */
export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Zod schema for UUID validation
 */
export const uuidSchema = z.string().regex(UUID_REGEX, "Invalid UUID format");

/**
 * Generate a request ID for tracing
 */
export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with exponential backoff retry logic
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  requestId?: string,
): Promise<Response> {
  const logPrefix = requestId ? `[${requestId}]` : "";
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      // Success case
      if (response.ok) {
        return response;
      }
      
      // Server errors (5xx) should be retried
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      // Client errors (4xx) should not be retried (except 429 rate limit)
      if (response.status === 429) {
        const delay = 1000 * Math.pow(2, i);
        console.warn(`${logPrefix} Rate limited, retrying after ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      
      // Other 4xx errors - return without retry
      return response;
      
    } catch (err) {
      const isLastAttempt = i === maxRetries - 1;
      
      if (isLastAttempt) {
        console.error(`${logPrefix} Fetch failed after ${maxRetries} retries:`, err);
        throw err;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = 1000 * Math.pow(2, i);
      console.warn(`${logPrefix} Fetch attempt ${i + 1} failed, retrying after ${delay}ms:`, err);
      await sleep(delay);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw new Error("Unexpected end of retry loop");
}

/**
 * Simple in-memory rate limiter (for edge functions)
 * Note: In production with multiple workers, use Redis or similar
 */
export class SimpleRateLimiter {
  private requests = new Map<string, number[]>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a key is rate limited
   * Returns { allowed: boolean, remaining: number, resetAt: number }
   */
  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing timestamps for this key
    let timestamps = this.requests.get(key) || [];
    
    // Filter to only include timestamps within the window
    timestamps = timestamps.filter((ts) => ts > windowStart);
    
    // Clean up old entries periodically
    if (timestamps.length === 0) {
      this.requests.delete(key);
    } else {
      this.requests.set(key, timestamps);
    }
    
    const allowed = timestamps.length < this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - timestamps.length - 1);
    const resetAt = timestamps.length > 0 ? timestamps[0] + this.windowMs : now + this.windowMs;
    
    if (allowed) {
      timestamps.push(now);
      this.requests.set(key, timestamps);
    }
    
    return { allowed, remaining, resetAt };
  }

  /**
   * Clear all rate limit data (useful for testing)
   */
  clear(): void {
    this.requests.clear();
  }
}

// Global rate limiter instance
export const globalRateLimiter = new SimpleRateLimiter(100, 60000);
