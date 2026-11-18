import { applyDecorators, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import type { RateLimitOptions } from './rate-limit.config.js';

/**
 * Enables IP-based rate limiting for a controller or endpoint.
 */
export function RateLimit(options: RateLimitOptions) {
  return applyDecorators(
    Throttle({ default: options }),
    UseGuards(ThrottlerGuard),
  );
}
