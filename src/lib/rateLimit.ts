if (typeof window !== 'undefined') {
  throw new Error('src/lib/rateLimit.ts is a server-only module and cannot be imported in client components.');
}
import { NextRequest } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitOptions {
  windowMs: number;   // Time window in milliseconds
  maxRequests: number; // Max requests allowed in the window for the primary key
  /**
   * If true, block the request when the Redis backend is unavailable.
   * Defaults to:
   *   - true  in production  (no silent per-instance fallback allowed)
   *   - false in development (in-memory fallback is acceptable)
   *
   * You may set this explicitly to override auto-detection.
   */
  failClosed?: boolean;
}

export interface SecondaryRateLimit {
  /** Secondary identifier (e.g., IP for authenticated endpoints). */
  identifier: string;
  /**
   * Max requests for the secondary key.
   * Typically a multiple of the primary limit (e.g., 3×) to allow
   * multiple users from the same school NAT without over-restricting.
   */
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Time in ms until the current window resets (for Retry-After header). */
  resetMs: number;
  distributed: boolean;
  /** Explains which backend and which key triggered a block, if any. */
  blockedBy?: 'primary' | 'secondary' | 'production-misconfiguration';
  provider: 'Upstash Redis / Vercel KV' | 'Server In-Memory Fallback' | 'Blocked: Production Misconfiguration';
}

// ─── In-Memory Sliding Window Store (Development / Fallback) ─────────────────
// NOTE: This store is NOT shared across serverless instances. It provides
// meaningful protection only in single-process environments (local dev, single
// server). In production, Upstash Redis / Vercel KV must be configured.

const memoryStore = new Map<string, { count: number; resetTime: number }>();

function memoryCheck(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetMs: windowMs };
  }

  record.count += 1;
  return {
    allowed: record.count <= maxRequests,
    remaining: Math.max(0, maxRequests - record.count),
    resetMs: Math.max(0, record.resetTime - now),
  };
}

// ─── Redis / KV REST Helper ───────────────────────────────────────────────────

async function redisCheck(
  key: string,
  maxRequests: number,
  windowMs: number,
  redisUrl: string,
  redisToken: string,
): Promise<{ allowed: boolean; remaining: number; resetMs: number } | null> {
  try {
    const res = await fetch(`${redisUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redisToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['PTTL', key],
      ]),
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data = await res.json();
    const count = Number(data[0]?.result ?? 1);
    let pttl = Number(data[1]?.result ?? -1);

    if (count === 1 || pttl < 0) {
      await fetch(`${redisUrl}/pexpire/${encodeURIComponent(key)}/${windowMs}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${redisToken}` },
        cache: 'no-store',
      });
      pttl = windowMs;
    }

    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetMs: pttl > 0 ? pttl : windowMs,
    };
  } catch {
    return null; // Redis unreachable
  }
}

// ─── Client Identifier Helpers ────────────────────────────────────────────────

/** Extract the caller's IP from request headers. */
export function getIpIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const raw = forwarded ? forwarded.split(',')[0].trim() : realIp || '127.0.0.1';
  return `ip_${raw.replace(/[^\w.:-]/g, '')}`;
}

/**
 * Returns the primary rate-limit identifier.
 * - Authenticated endpoints: user_{userId}
 * - Unauthenticated endpoints (e.g., login): ip_{ip}
 */
export function getClientIdentifier(req: NextRequest, userId?: string): string {
  if (userId) return `user_${userId}`;
  return getIpIdentifier(req);
}

// ─── Main Rate-Limit Check ────────────────────────────────────────────────────

/**
 * Distributed Serverless-Safe Rate Limiter.
 *
 * PRODUCTION BEHAVIOR:
 *   - Uses Upstash Redis / Vercel KV REST API when UPSTASH_REDIS_REST_URL +
 *     UPSTASH_REDIS_REST_TOKEN (or KV_REST_API_URL + KV_REST_API_TOKEN) are set.
 *   - If Redis is NOT configured in production → FAIL CLOSED (blocks request).
 *     This prevents silent degradation to a per-instance in-memory limiter that
 *     provides no distributed protection across serverless replicas.
 *   - Redis configuration error (credentials set but unreachable) → respects
 *     the `failClosed` option.
 *
 * DEVELOPMENT BEHAVIOR:
 *   - Falls back to server-side in-memory sliding window store.
 *   - This store is per-process and NOT shared across instances.
 *
 * DUAL-KEY STRATEGY (authenticated endpoints):
 *   - Pass `secondary` to enforce an additional IP-based limit alongside the
 *     per-user primary limit. Allows schools behind shared NAT to use their full
 *     individual quota while still preventing IP-level abuse (e.g., from attackers
 *     who rotate accounts).
 *   - secondary.maxRequests should be a multiple of options.maxRequests
 *     (e.g., 3× primary) so legitimate school users are not unfairly blocked.
 */
export async function checkRateLimit(
  endpointKey: string,
  primaryIdentifier: string,
  options: RateLimitOptions,
  secondary?: SecondaryRateLimit,
): Promise<RateLimitResult> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const isProduction = process.env.NODE_ENV === 'production';

  // Determine effective failClosed: if caller didn't set it explicitly,
  // default to true in production so there's no silent per-instance fallback.
  const failClosed =
    options.failClosed !== undefined ? options.failClosed : isProduction;

  const primaryKey = `ratelimit:${endpointKey}:${primaryIdentifier}`;
  const { windowMs, maxRequests } = options;

  // ── PRODUCTION WITHOUT REDIS → HARD FAIL (if failClosed is true) ───────────
  if (isProduction && !redisUrl && failClosed) {
    console.error(
      `[SECURITY MISCONFIGURATION] Rate limiting for endpoint "${endpointKey}" is running ` +
      `in PRODUCTION without a distributed Redis backend (UPSTASH_REDIS_REST_URL / ` +
      `KV_REST_API_URL is not set). Blocking request to prevent unprotected resource ` +
      `consumption. Configure Upstash Redis or Vercel KV before production deployment.`
    );
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetMs: windowMs,
      distributed: false,
      blockedBy: 'production-misconfiguration',
      provider: 'Blocked: Production Misconfiguration',
    };
  }

  // ── DISTRIBUTED REDIS / KV PATH ───────────────────────────────────────────
  if (redisUrl && redisToken) {
    // Check primary key
    const primaryResult = await redisCheck(primaryKey, maxRequests, windowMs, redisUrl, redisToken);

    if (!primaryResult) {
      // Redis is configured but unreachable — apply failClosed policy
      console.warn(
        `[RateLimit Warning] Redis unreachable for key "${primaryKey}". ` +
        `Applying ${failClosed ? 'fail-closed (blocking)' : 'fail-open (allowing)'} policy.`
      );
      if (failClosed) {
        return {
          allowed: false,
          limit: maxRequests,
          remaining: 0,
          resetMs: windowMs,
          distributed: true,
          provider: 'Upstash Redis / Vercel KV',
        };
      }
      // Fail-open: fall through to in-memory below
    } else {
      // Primary Redis check succeeded; now check secondary if provided
      if (!primaryResult.allowed) {
        return {
          allowed: false,
          limit: maxRequests,
          remaining: 0,
          resetMs: primaryResult.resetMs,
          distributed: true,
          blockedBy: 'primary',
          provider: 'Upstash Redis / Vercel KV',
        };
      }

      if (secondary) {
        const secondaryKey = `ratelimit:${endpointKey}:${secondary.identifier}`;
        const secondaryResult = await redisCheck(
          secondaryKey,
          secondary.maxRequests,
          windowMs,
          redisUrl,
          redisToken,
        );

        if (secondaryResult && !secondaryResult.allowed) {
          return {
            allowed: false,
            limit: secondary.maxRequests,
            remaining: 0,
            resetMs: secondaryResult.resetMs,
            distributed: true,
            blockedBy: 'secondary',
            provider: 'Upstash Redis / Vercel KV',
          };
        }
      }

      return {
        allowed: true,
        limit: maxRequests,
        remaining: primaryResult.remaining,
        resetMs: primaryResult.resetMs,
        distributed: true,
        provider: 'Upstash Redis / Vercel KV',
      };
    }
  }

  // ── IN-MEMORY FALLBACK (Development / Fail-Open Path) ────────────────────
  // Only reached if: (a) not production, and (b) Redis is not configured or
  // Redis errored and failClosed is false.
  const primary = memoryCheck(primaryKey, maxRequests, windowMs);

  if (!primary.allowed) {
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetMs: primary.resetMs,
      distributed: false,
      blockedBy: 'primary',
      provider: 'Server In-Memory Fallback',
    };
  }

  if (secondary) {
    const secondaryKey = `ratelimit:${endpointKey}:${secondary.identifier}`;
    const secondaryResult = memoryCheck(secondaryKey, secondary.maxRequests, windowMs);

    if (!secondaryResult.allowed) {
      return {
        allowed: false,
        limit: secondary.maxRequests,
        remaining: 0,
        resetMs: secondaryResult.resetMs,
        distributed: false,
        blockedBy: 'secondary',
        provider: 'Server In-Memory Fallback',
      };
    }
  }

  return {
    allowed: true,
    limit: maxRequests,
    remaining: primary.remaining,
    resetMs: primary.resetMs,
    distributed: false,
    provider: 'Server In-Memory Fallback',
  };
}
