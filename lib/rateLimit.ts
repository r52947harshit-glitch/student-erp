const rateLimitMap = new Map<string, { count: number; windowStart: number }>()

interface RateLimitConfig {
  limit: number
  windowMs: number
}

// In-memory generic rate limiter designed for standard rapid API constraints (e.g. 60/min)
export function checkRateLimit(identifier: string, config: RateLimitConfig): { success: boolean, remaining: number } {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record) {
    rateLimitMap.set(identifier, { count: 1, windowStart: now })
    return { success: true, remaining: config.limit - 1 }
  }

  // If window has passed, reset counter
  if (now - record.windowStart > config.windowMs) {
    rateLimitMap.set(identifier, { count: 1, windowStart: now })
    return { success: true, remaining: config.limit - 1 }
  }

  // If within window, increment
  if (record.count < config.limit) {
    rateLimitMap.set(identifier, { count: record.count + 1, windowStart: record.windowStart })
    return { success: true, remaining: config.limit - record.count - 1 }
  }

  // Limit exceeded
  return { success: false, remaining: 0 }
}
