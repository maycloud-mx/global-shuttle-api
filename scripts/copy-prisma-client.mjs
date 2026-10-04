import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('src/generated/prisma');
const destination = resolve('dist/generated/prisma');

if (!existsSync(source)) {
  throw new Error(
    'Prisma Client was not generated. Run "npm run db:generate" before building.',
  );
}

cpSync(source, destination, { recursive: true, force: true });
console.log('Prisma Client copied to dist/generated/prisma');
