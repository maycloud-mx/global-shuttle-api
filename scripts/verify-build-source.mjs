import { existsSync } from 'node:fs';

const requiredFiles = [
  'src/platform/rate-limit/rate-limit.config.ts',
  'src/platform/rate-limit/rate-limit.decorator.ts',
  'src/platform/rate-limit/rate-limit.module.ts',
  'src/platform/turnstile/turnstile.module.ts',
  'src/platform/turnstile/turnstile.service.ts',
  'src/email/views/auth/account-activation.template.ts',
  'src/email/views/auth/password-changed.template.ts',
  'src/email/views/auth/password-reset.template.ts',
  'src/email/views/reservation/reservation-quote.template.ts',
  'src/http/api-exception.filter.ts',
  'src/http/api-message.decorator.ts',
  'src/http/api-response.interceptor.ts',
  'src/main.ts',
  'src/prisma/prisma.service.ts',
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
if (missingFiles.length > 0) {
  throw new Error(`Build source is incomplete: ${missingFiles.join(', ')}`);
}

console.log('Build source verified');
