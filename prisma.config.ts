import { defineConfig } from 'prisma/config';
import { buildDatabaseUrl } from './src/config/database.js';
import { loadEnvironment } from './src/config/environment.js';

const environment = loadEnvironment();
const databaseUrl = buildDatabaseUrl(environment);

// The schema still resolves env("DATABASE_URL") while Prisma validates it,
// even when the datasource URL is supplied through prisma.config.ts.
process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
