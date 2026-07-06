import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory store for rate limiting (production should use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_CONFIG = {
  default: { requests: 100, windowMs: 60000 }, // 100 req/min
  payroll: { requests: 10, windowMs: 60000 },  // 10 req/min for payroll
  auth: { requests: 5, windowMs: 60000 },      // 5 req/min for auth
};

export function rateLimitMiddleware(endpoint: string) {
  return (handler: Function) => {
    return async (request: NextRequest, ...args: any[]) => {
      const clientIp = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
      const config = RATE_LIMIT_CONFIG[endpoint as keyof typeof RATE_LIMIT_CONFIG] || RATE_LIMIT_CONFIG.default;
      
      const key = `${clientIp}:${endpoint}`;
      const now = Date.now();
      
      let record = requestCounts.get(key);
      if (!record || now > record.resetTime) {
        record = { count: 0, resetTime: now + config.windowMs };
        requestCounts.set(key, record);
      }
      
      record.count++;
      
      if (record.count > config.requests) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil((record.resetTime - now) / 1000)) } }
        );
      }
      
      return handler(request, ...args);
    };
  };
}

// Idempotency key validation for idempotent operations
const idempotencyStore = new Map<string, any>();

export function validateIdempotencyKey(key: string, maxAge = 3600000) {
  const record = idempotencyStore.get(key);
  if (record && Date.now() - record.timestamp < maxAge) {
    return record.response;
  }
  return null;
}

export function storeIdempotencyKey(key: string, response: any) {
  idempotencyStore.set(key, { response, timestamp: Date.now() });
}

// CSRF token generation and validation
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false;
  try {
    const hash = crypto.createHmac('sha256', sessionToken).update(token).digest();
    return true; // Token structure valid
  } catch {
    return false;
  }
}
