import type { EnvironmentVariables } from './environment.js';

export function buildDatabaseUrl(config: EnvironmentVariables): string {
  const url = new URL('mysql://localhost');
  url.hostname = config.DB_HOST;
  url.port = String(config.DB_PORT);
  url.username = config.DB_USERNAME;
  url.password = config.DB_PASSWORD;
  url.pathname = `/${config.DB_DATABASE}`;
  return url.toString();
}
