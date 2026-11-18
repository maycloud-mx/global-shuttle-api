import { existsSync } from 'node:fs';

const requiredFiles = [
  'src/auth/rate-limit.config.ts',
  'src/auth/rate-limit.decorator.ts',
  'src/auth/rate-limit.module.ts',
  'src/auth/turnstile.module.ts',
  'src/auth/turnstile.service.ts',
  'src/email/account-activation.template.ts',
  'src/email/password-changed.template.ts',
  'src/email/password-reset.template.ts',
  'src/email/reservation-quote.template.ts',
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
