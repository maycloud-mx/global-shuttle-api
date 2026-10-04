import { existsSync } from 'node:fs';

const requiredFiles = [
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
