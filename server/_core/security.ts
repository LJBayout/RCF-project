/**
 * SOC 2 - Security Controls (CC6.1 - CC6.8)
 */

import crypto from "crypto";

/**
 * SOC 2 CC6.7 - Encryption at rest
 * Encrypt sensitive data before storage
 */
export function encryptData(data: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || "default-dev-key-change-in-prod";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    crypto.scryptSync(encryptionKey, "salt", 32),
    iv
  );
  
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt data
 */
export function decryptData(encryptedData: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || "default-dev-key-change-in-prod";
  const [ivHex, encrypted] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    crypto.scryptSync(encryptionKey, "salt", 32),
    iv
  );
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * SOC 2 CC6.1 - API Key generation
 * Generate secure API keys for customers
 */
export function generateApiKey(): string {
  return "cfr_" + crypto.randomBytes(32).toString("hex");
}

/**
 * SOC 2 CC6.6 - Hash API keys before storage
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * SOC 2 CC6.1 - Rate limiting check
 * Prevent abuse and ensure availability
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetAt) {
    // New window
    const resetAt = now + config.windowMs;
    requestCounts.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt };
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * SOC 2 CC6.7 - Data masking for PII
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) return "*".repeat(data.length);
  return data.slice(0, visibleChars) + "*".repeat(data.length - visibleChars);
}

/**
 * SOC 2 CC6.6 - Input validation
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove HTML tags
    .slice(0, 1000); // Limit length
}

/**
 * SOC 2 CC6.8 - Security headers
 */
export const securityHeaders = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Content-Security-Policy": "default-src 'self'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};
