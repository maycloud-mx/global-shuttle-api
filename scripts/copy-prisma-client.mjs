import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('src/generated/prisma');
const destination = resolve('dist/generated/prisma');

if (!existsSync(source)) {
  throw new Error(
    'Prisma Client was not generated. Run "npm run db:generate" before building.',
  );
}

try {
  cpSync(source, destination, { recursive: true, force: true });
  console.log('Prisma Client copied to dist/generated/prisma');
} catch (error) {
  const existingClient = resolve(destination, 'index.js');
  if (error?.code === 'EPERM' && existsSync(existingClient)) {
    console.warn(
      'Prisma engine is in use; keeping the existing generated client in dist.',
    );
  } else {
    throw error;
  }
}
