/**
 * Executable Rate-Limiter Verification Suite
 * Run with: npx tsx scripts/test-rate-limits.ts
 */

import { checkRateLimit } from '../src/lib/rateLimit';

async function runTests() {
  console.log('────────────────────────────────────────────────────────────');
  console.log('⚡ Running Executable Rate Limiter Verification Suite');
  console.log('────────────────────────────────────────────────────────────\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, title: string, details?: string) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS [Test ${total}]: ${title}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL [Test ${total}]: ${title}`);
      if (details) console.error(`     Details: ${details}`);
    }
  }

  const origEnv = process.env.NODE_ENV;
  const origUrl = process.env.UPSTASH_REDIS_REST_URL;
  const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Clear redis env for local dev testing
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  (process.env as any).NODE_ENV = 'development';

  const testId = `test_${Date.now()}`;

  // ── Test 1: Single request under limit ──────────────────────────────────
  const res1 = await checkRateLimit('unit_test', testId, { windowMs: 10000, maxRequests: 3 });
  assert(res1.allowed === true && res1.remaining === 2, 'Under limit request is allowed with correct remaining count');

  // ── Test 2: Request at limit ─────────────────────────────────────────────
  await checkRateLimit('unit_test', testId, { windowMs: 10000, maxRequests: 3 });
  const res3 = await checkRateLimit('unit_test', testId, { windowMs: 10000, maxRequests: 3 });
  assert(res3.allowed === true && res3.remaining === 0, 'Request at max limit is allowed with remaining=0');

  // ── Test 3: Request over limit ───────────────────────────────────────────
  const res4 = await checkRateLimit('unit_test', testId, { windowMs: 10000, maxRequests: 3 });
  assert(
    res4.allowed === false && res4.remaining === 0 && res4.resetMs > 0 && res4.blockedBy === 'primary',
    'Request over max limit is BLOCKED with Retry-After resetMs > 0'
  );

  // ── Test 4: Dual-key secondary (IP limit) triggers ──────────────────────
  const userKey = `user_dual_${Date.now()}`;
  const ipKey = `ip_dual_${Date.now()}`;
  
  // Fill secondary IP bucket (limit: 2)
  await checkRateLimit('dual_test', userKey, { windowMs: 10000, maxRequests: 10 }, { identifier: ipKey, maxRequests: 2 });
  await checkRateLimit('dual_test', `user_other_${Date.now()}`, { windowMs: 10000, maxRequests: 10 }, { identifier: ipKey, maxRequests: 2 });
  
  // Third request from same IP with fresh user ID should be blocked by secondary IP key
  const dualRes = await checkRateLimit('dual_test', `user_third_${Date.now()}`, { windowMs: 10000, maxRequests: 10 }, { identifier: ipKey, maxRequests: 2 });
  assert(
    dualRes.allowed === false && dualRes.blockedBy === 'secondary',
    'Dual-key secondary IP limit blocks multi-account abuse from single IP'
  );

  // ── Test 5: Production Mode without Redis HARD FAILS ───────────────────
  (process.env as any).NODE_ENV = 'production';
  const prodRes = await checkRateLimit('prod_test', `prod_user_${Date.now()}`, { windowMs: 10000, maxRequests: 5 });
  assert(
    prodRes.allowed === false && prodRes.blockedBy === 'production-misconfiguration',
    'Production environment WITHOUT Redis hard-fails (prevents silent per-instance degradation)'
  );

  // Restore env
  (process.env as any).NODE_ENV = origEnv;
  if (origUrl) process.env.UPSTASH_REDIS_REST_URL = origUrl;
  if (origToken) process.env.UPSTASH_REDIS_REST_TOKEN = origToken;

  console.log('\n────────────────────────────────────────────────────────────');
  console.log(`📊 Rate Limiter Assertion Suite Results: ${passed} / ${total} PASSED`);
  console.log('────────────────────────────────────────────────────────────\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Rate limit test suite error:', err);
  process.exit(1);
});
