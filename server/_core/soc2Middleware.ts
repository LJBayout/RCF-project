/**
 * SOC 2 - Middleware for compliance enforcement
 */

import type { Request, Response, NextFunction } from "express";
import { logAuditEvent, auditSecurityViolation } from "./auditLog";
import { checkRateLimit, securityHeaders } from "./security";

/**
 * SOC 2 CC6.8 - Security Headers Middleware
 * Add security headers to all responses
 */
export function securityHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
}

/**
 * SOC 2 CC6.1 - Rate Limiting Middleware
 * Protect against abuse and ensure availability
 */
export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const identifier = req.ip || req.socket.remoteAddress || "unknown";
  const result = checkRateLimit(identifier);

  // Add rate limit headers
  res.setHeader("X-RateLimit-Limit", "100");
  res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
  res.setHeader("X-RateLimit-Reset", new Date(result.resetAt).toISOString());

  if (!result.allowed) {
    // Log security violation
    auditSecurityViolation(
      "security.violation",
      { reason: "rate_limit_exceeded", ip: identifier },
      identifier
    );

    res.status(429).json({
      error: "Rate limit exceeded",
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    });
    return;
  }

  next();
}

/**
 * SOC 2 CC6.8, CC7.2 - Request Logging Middleware
 * Log all API requests for audit trail
 */
export function auditLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    res.send = originalSend;

    // Log after response
    const duration = Date.now() - startTime;
    const success = res.statusCode < 400;

    logAuditEvent({
      userId: (req as any).user?.id,
      action: "api.access",
      resource: "system",
      resourceId: `${req.method} ${req.path}`,
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
      metadata: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        query: req.query,
      },
      success,
      errorMessage: success ? undefined : `HTTP ${res.statusCode}`,
    });

    return originalSend.call(this, data);
  };

  next();
}

/**
 * SOC 2 CC6.1 - API Key Authentication Middleware
 */
export async function apiKeyAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    auditSecurityViolation(
      "security.violation",
      { reason: "missing_api_key", path: req.path },
      req.ip
    );
    return res.status(401).json({ error: "API key required" });
  }

  // Validate API key (simplified - implement full validation)
  // In production: hash key, check against database, verify rate limits

  // Log successful auth
  logAuditEvent({
    action: "user.login",
    resource: "api_key",
    resourceId: apiKey.slice(0, 10) + "...",
    ipAddress: req.ip,
    success: true,
  });

  next();
}
