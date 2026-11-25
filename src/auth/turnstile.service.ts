import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

interface TurnstileVerifyResponse {
  success: boolean;
  hostname?: string;
  action?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
}

export interface VerifyTurnstileOptions {
  expectedAction: string;
  expectedHostname?: string;
  remoteIp?: string;
}

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  private readonly verifyUrl =
    'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  private readonly secretKey: string;
  private readonly expectedHostname: string;

  constructor() {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;
    const frontendUrl = process.env.ADMIN_FRONTEND_URL;

    if (!secretKey) {
      throw new Error('TURNSTILE_SECRET_KEY is not configured');
    }

    if (!frontendUrl) {
      throw new Error('ADMIN_FRONTEND_URL is not configured');
    }

    this.secretKey = secretKey;
    this.expectedHostname = new URL(frontendUrl).hostname;
  }

  async verify(token: string, options: VerifyTurnstileOptions): Promise<void> {
    if (!token || token.length > 2048 || !options.expectedAction) {
      throw new BadRequestException('Invalid security verification');
    }

    const body = new URLSearchParams({
      secret: this.secretKey,
      response: token,
    });

    if (options.remoteIp) {
      body.set('remoteip', options.remoteIp);
    }

    let result: TurnstileVerifyResponse;

    try {
      const response = await fetch(this.verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`Turnstile HTTP status: ${response.status}`);
      }

      result = (await response.json()) as TurnstileVerifyResponse;
    } catch (error) {
      this.logger.error(
        'Turnstile verification service unavailable',
        error instanceof Error ? error.stack : undefined,
      );

      throw new ServiceUnavailableException(
        'Security verification is temporarily unavailable',
      );
    }

    if (!result.success) {
      this.logger.warn(
        `Turnstile verification rejected: ${
          result['error-codes']?.join(', ') ?? 'unknown'
        }`,
      );

      throw new BadRequestException('Security verification failed');
    }

    if (
      result.hostname !== (options.expectedHostname ?? this.expectedHostname) ||
      result.action !== options.expectedAction
    ) {
      this.logger.warn('Turnstile hostname or action mismatch');

      throw new BadRequestException('Security verification failed');
    }
  }
}
