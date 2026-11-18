import { loadEnvFile } from 'node:process';

// =========================================================
// TYPES
// =========================================================

const supportedEnvironments = ['development', 'test', 'production'] as const;

type NodeEnvironment = (typeof supportedEnvironments)[number];

export interface EnvironmentVariables {
  // APPLICATION
  NODE_ENV: NodeEnvironment;
  PORT: number;
  TRUST_PROXY_HOPS: number;
  CORS_ORIGINS: string[];

  // FRONTEND
  ADMIN_FRONTEND_URL: string;

  // DATABASE
  DB_HOST: string;
  DB_PORT: number;
  DB_DATABASE: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;

  // EXTERNAL DATABASE
  EXTERNAL_DB_HOST: string;
  EXTERNAL_DB_PORT: number;
  EXTERNAL_DB_DATABASE: string;
  EXTERNAL_DB_USERNAME: string;
  EXTERNAL_DB_PASSWORD: string;

  // AUTHENTICATION
  JWT_SECRET: string;
  JWT_EXPIRES_IN_SECONDS: number;

  // CLOUDFLARE TURNSTILE
  TURNSTILE_SECRET_KEY: string;

  // CLOUDINARY
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;

  // SMTP
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SMTP_FROM_NAME: string;
  SMTP_FROM_EMAIL: string;
}

// =========================================================
// STRING VALIDATION
// =========================================================

function requireString(
  environment: Record<string, unknown>,
  key: string,
): string {
  const value = environment[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} is required`);
  }

  return value.trim();
}

// =========================================================
// BOOLEAN VALIDATION
// =========================================================

function requireBoolean(
  environment: Record<string, unknown>,
  key: string,
): boolean {
  const value = environment[key];

  if (value === 'true' || value === true) {
    return true;
  }

  if (value === 'false' || value === false) {
    return false;
  }

  throw new Error(`${key} must be true or false`);
}

// =========================================================
// URL VALIDATION
// =========================================================

function requireFrontendUrl(
  environment: Record<string, unknown>,
  key: string,
  nodeEnvironment: NodeEnvironment,
): string {
  const value = requireString(environment, key);

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }

  const isLocalhost = ['localhost', '127.0.0.1'].includes(url.hostname);

  const isHttps = url.protocol === 'https:';

  const isLocalHttp = url.protocol === 'http:' && isLocalhost;

  if (!isHttps && !isLocalHttp) {
    throw new Error(`${key} must use HTTPS or HTTP on localhost`);
  }

  if (nodeEnvironment === 'production' && !isHttps) {
    throw new Error(`${key} must use HTTPS in production`);
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      `${key} must not contain credentials, query parameters or fragments`,
    );
  }

  // Normalizar URL para utilizarla
  // al construir enlaces del frontend.
  return url.origin;
}

// =========================================================
// ENVIRONMENT VALIDATION
// =========================================================

export function validateEnvironment(
  environment: Record<string, unknown>,
): EnvironmentVariables {
  // =========================================================
  // NODE ENVIRONMENT
  // =========================================================

  const nodeEnvironmentValue = environment.NODE_ENV ?? 'development';

  if (typeof nodeEnvironmentValue !== 'string') {
    throw new Error('NODE_ENV must be a string');
  }

  if (
    !supportedEnvironments.includes(nodeEnvironmentValue as NodeEnvironment)
  ) {
    throw new Error(
      `NODE_ENV must be one of: ${supportedEnvironments.join(', ')}`,
    );
  }

  const nodeEnvironment = nodeEnvironmentValue as NodeEnvironment;

  // =========================================================
  // PORT
  // =========================================================

  const port = Number(environment.PORT ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  // =========================================================
  // TRUST PROXY
  // =========================================================

  const trustProxyHops = Number(environment.TRUST_PROXY_HOPS ?? 0);

  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
  }

  // =========================================================
  // CORS
  // =========================================================

  const corsOriginsValue = environment.CORS_ORIGINS ?? '*';

  if (typeof corsOriginsValue !== 'string') {
    throw new Error('CORS_ORIGINS must be a string');
  }

  const corsOrigins = corsOriginsValue
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one origin');
  }

  // =========================================================
  // DATABASE PORTS
  // =========================================================

  const databasePort = Number(environment.DB_PORT ?? 3306);

  if (
    !Number.isInteger(databasePort) ||
    databasePort < 1 ||
    databasePort > 65_535
  ) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }

  const externalDatabasePort = Number(environment.EXTERNAL_DB_PORT ?? 3306);

  if (
    !Number.isInteger(externalDatabasePort) ||
    externalDatabasePort < 1 ||
    externalDatabasePort > 65_535
  ) {
    throw new Error('EXTERNAL_DB_PORT must be an integer between 1 and 65535');
  }

  // =========================================================
  // JWT
  // =========================================================

  const jwtExpiresInSeconds = Number(
    environment.JWT_EXPIRES_IN_SECONDS ?? 28_800,
  );

  if (!Number.isInteger(jwtExpiresInSeconds) || jwtExpiresInSeconds < 60) {
    throw new Error('JWT_EXPIRES_IN_SECONDS must be an integer of at least 60');
  }

  // =========================================================
  // SMTP
  // =========================================================

  const smtpPort = Number(environment.SMTP_PORT);

  if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65_535) {
    throw new Error('SMTP_PORT must be an integer between 1 and 65535');
  }

  // =========================================================
  // RETURN
  // =========================================================

  return {
    // APPLICATION
    NODE_ENV: nodeEnvironment,
    PORT: port,
    TRUST_PROXY_HOPS: trustProxyHops,
    CORS_ORIGINS: corsOrigins,

    // FRONTEND
    ADMIN_FRONTEND_URL: requireFrontendUrl(
      environment,
      'ADMIN_FRONTEND_URL',
      nodeEnvironment,
    ),

    // DATABASE
    DB_HOST: requireString(environment, 'DB_HOST'),
    DB_PORT: databasePort,
    DB_DATABASE: requireString(environment, 'DB_DATABASE'),
    DB_USERNAME: requireString(environment, 'DB_USERNAME'),
    DB_PASSWORD: requireString(environment, 'DB_PASSWORD'),

    // EXTERNAL DATABASE
    EXTERNAL_DB_HOST: requireString(environment, 'EXTERNAL_DB_HOST'),
    EXTERNAL_DB_PORT: externalDatabasePort,
    EXTERNAL_DB_DATABASE: requireString(environment, 'EXTERNAL_DB_DATABASE'),
    EXTERNAL_DB_USERNAME: requireString(environment, 'EXTERNAL_DB_USERNAME'),
    EXTERNAL_DB_PASSWORD: requireString(environment, 'EXTERNAL_DB_PASSWORD'),

    // AUTHENTICATION
    JWT_SECRET: requireString(environment, 'JWT_SECRET'),
    JWT_EXPIRES_IN_SECONDS: jwtExpiresInSeconds,

    // CLOUDFLARE TURNSTILE
    TURNSTILE_SECRET_KEY: requireString(environment, 'TURNSTILE_SECRET_KEY'),

    // CLOUDINARY
    CLOUDINARY_CLOUD_NAME: requireString(environment, 'CLOUDINARY_CLOUD_NAME'),
    CLOUDINARY_API_KEY: requireString(environment, 'CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: requireString(environment, 'CLOUDINARY_API_SECRET'),

    // SMTP
    SMTP_HOST: requireString(environment, 'SMTP_HOST'),
    SMTP_PORT: smtpPort,
    SMTP_SECURE: requireBoolean(environment, 'SMTP_SECURE'),
    SMTP_USER: requireString(environment, 'SMTP_USER'),
    SMTP_PASSWORD: requireString(environment, 'SMTP_PASSWORD'),
    SMTP_FROM_NAME: requireString(environment, 'SMTP_FROM_NAME'),
    SMTP_FROM_EMAIL: requireString(environment, 'SMTP_FROM_EMAIL'),
  };
}

// =========================================================
// LOAD ENVIRONMENT
// =========================================================

export function loadEnvironment(): EnvironmentVariables {
  try {
    loadEnvFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  return validateEnvironment(process.env);
}
