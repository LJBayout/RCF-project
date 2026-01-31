/**
 * Redis client and cache utilities for CFR data caching.
 * Falls back gracefully if Redis is unavailable.
 */

import Redis from "ioredis";
import { ENV } from "./env";

let _redis: Redis | null = null;
let _redisAvailable = false;

/**
 * Get or create Redis client instance.
 * Returns null if Redis is unavailable (connection failed or not configured).
 */
export async function getRedis(): Promise<Redis | null> {
  if (_redis !== null) {
    return _redisAvailable ? _redis : null;
  }

  const redisUrl = ENV.redisUrl;
  const redisPassword = ENV.redisPassword;

  if (!redisUrl && !redisPassword) {
    // Redis not configured - cache will be disabled
    if (process.env.NODE_ENV === "development") {
      console.warn("[Redis] Not configured - caching disabled");
    }
    return null;
  }

  try {
    const options: Redis.RedisOptions = {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          return null; // Stop retrying after 3 attempts
        }
        return Math.min(times * 200, 1000);
      },
      enableReadyCheck: true,
    };

    if (redisUrl) {
      _redis = new Redis(redisUrl, options);
    } else {
      // Fallback: use host/port from docker-compose defaults
      _redis = new Redis({
        host: "redis",
        port: 6379,
        password: redisPassword,
        ...options,
      });
    }

    // Test connection (ioredis connects automatically)
    await _redis.ping();
    _redisAvailable = true;

    if (process.env.NODE_ENV === "development") {
      console.log("[Redis] Connected successfully");
    }

    // Handle connection errors gracefully
    _redis.on("error", (err) => {
      console.warn("[Redis] Connection error:", err.message);
      _redisAvailable = false;
    });

    _redis.on("connect", () => {
      _redisAvailable = true;
    });

    return _redis;
  } catch (error: any) {
    console.warn("[Redis] Failed to connect:", error?.message || error);
    _redisAvailable = false;
    _redis = null;
    return null;
  }
}

/**
 * Cache version prefix for future invalidation.
 */
const CACHE_VERSION = "v1";

/**
 * Build a cache key from prefix and params.
 */
function buildCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => {
      const v = params[k];
      if (v === undefined || v === null) return "";
      return `${k}=${String(v)}`;
    })
    .filter(Boolean)
    .join(":");

  return `cfr:${CACHE_VERSION}:${prefix}${sortedParams ? `:${sortedParams}` : ""}`;
}

/**
 * Get value from cache, or compute and set it if missing.
 * Falls back to direct DB call if Redis is unavailable.
 *
 * @param keyPrefix - Cache key prefix (e.g., "listTitles")
 * @param params - Parameters for key generation
 * @param computeFn - Function to compute the value if cache miss
 * @param ttlSeconds - Time to live in seconds
 * @returns Cached or computed value
 */
export async function getOrSetCache<T>(
  keyPrefix: string,
  params: Record<string, any>,
  computeFn: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const redis = await getRedis();
  if (!redis) {
    // Redis unavailable - bypass cache
    return computeFn();
  }

  const key = buildCacheKey(keyPrefix, params);

  try {
    // Try to get from cache
    const cached = await redis.get(key);
    if (cached) {
      if (process.env.NODE_ENV === "development") {
        const ttl = await redis.ttl(key);
        console.log(`[Cache] HIT: ${key} (TTL remaining: ${ttl}s)`);
      }
      return JSON.parse(cached) as T;
    }

    // Cache miss - compute value
    if (process.env.NODE_ENV === "development") {
      console.log(`[Cache] MISS: ${key}`);
    }

    const value = await computeFn();

    // Store in cache
    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttlSeconds, serialized);
      if (process.env.NODE_ENV === "development") {
        console.log(`[Cache] SET: ${key} (TTL: ${ttlSeconds}s, size: ${serialized.length} bytes)`);
      }
    } catch (setError: any) {
      console.warn(`[Cache] Failed to set cache for key ${key}:`, setError?.message || setError);
    }

    return value;
  } catch (error: any) {
    // If cache operation fails, fall back to direct DB call
    console.warn(`[Cache] Error for key ${key}:`, error?.message || error);
    return computeFn();
  }
}

/**
 * Invalidate cache entries matching a prefix pattern.
 * Useful for cache invalidation when data changes.
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;

  try {
    const keys = await redis.keys(`cfr:${CACHE_VERSION}:${pattern}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      if (process.env.NODE_ENV === "development") {
        console.log(`[Cache] Invalidated ${keys.length} keys matching: ${pattern}`);
      }
    }
  } catch (error: any) {
    console.warn(`[Cache] Invalidation error for pattern ${pattern}:`, error?.message || error);
  }
}
