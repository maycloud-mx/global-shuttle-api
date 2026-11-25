import { minutes } from '@nestjs/throttler';

export interface RateLimitOptions {
  limit: number;
  ttl: number;
  blockDuration?: number;
}

/**
 * Centralized rate-limit policies.
 *
 * Policies are applied only to endpoints
 * that explicitly use the RateLimit decorator.
 */
export const RATE_LIMIT_POLICIES = {
  // =========================================================
  // GENERAL
  // =========================================================

  standard: {
    limit: 60,
    ttl: minutes(1),
  },

  contactSubmission: {
    limit: 5,
    ttl: minutes(15),
  },

  // =========================================================
  // AUTHENTICATION
  // =========================================================

  auth: {
    limit: 10,
    ttl: minutes(15),
  },

  authStrict: {
    limit: 5,
    ttl: minutes(15),
    blockDuration: minutes(15),
  },

  // =========================================================
  // PASSWORD RECOVERY
  // =========================================================

  passwordForgot: {
    limit: 3,
    ttl: minutes(15),
    blockDuration: minutes(15),
  },

  passwordReset: {
    limit: 5,
    ttl: minutes(15),
    blockDuration: minutes(15),
  },

  passwordChange: {
    limit: 5,
    ttl: minutes(15),
    blockDuration: minutes(15),
  },

  // =========================================================
  // ACCOUNT ACTIVATION
  // =========================================================

  accountActivation: {
    limit: 5,
    ttl: minutes(15),
    blockDuration: minutes(15),
  },

  // =========================================================
  // TOKEN VALIDATION
  // =========================================================

  tokenValidation: {
    limit: 20,
    ttl: minutes(1),
  },

  // =========================================================
  // USER INVITATIONS
  // =========================================================

  invitationResend: {
    limit: 10,
    ttl: minutes(15),
    blockDuration: minutes(15),
  },
} as const satisfies Record<string, RateLimitOptions>;
