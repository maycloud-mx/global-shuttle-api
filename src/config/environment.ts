const supportedEnvironments = ['development', 'test', 'production'] as const;

type NodeEnvironment = (typeof supportedEnvironments)[number];

export interface EnvironmentVariables {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  CORS_ORIGINS: string[];
  DB_HOST: string;
  DB_PORT: number;
  DB_DATABASE: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN_SECONDS: number;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SMTP_FROM_NAME: string;
  SMTP_FROM_EMAIL: string;
}

function requireString(
  environment: Record<string, unknown>,
  key: string,
): string {
  const value = environment[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} is required`);
  }
  return value;
}

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

export function validateEnvironment(environment: Record<string, unknown>): EnvironmentVariables {
  const nodeEnvironmentValue = environment.NODE_ENV ?? 'development';
  if (typeof nodeEnvironmentValue !== 'string') {
    throw new Error('NODE_ENV must be a string');
  }
  const nodeEnvironment = nodeEnvironmentValue;
  if (!supportedEnvironments.includes(nodeEnvironment as NodeEnvironment)) {
    throw new Error(
      `NODE_ENV must be one of: ${supportedEnvironments.join(', ')}`,
    );
  }

  const port = Number(environment.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

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

  const databasePort = Number(environment.DB_PORT ?? 3306);
  if (
    !Number.isInteger(databasePort) ||
    databasePort < 1 ||
    databasePort > 65_535
  ) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }

  const jwtExpiresInSeconds = Number(
    environment.JWT_EXPIRES_IN_SECONDS ?? 28_800,
  );
  if (!Number.isInteger(jwtExpiresInSeconds) || jwtExpiresInSeconds < 60) {
    throw new Error('JWT_EXPIRES_IN_SECONDS must be an integer of at least 60');
  }

  const smtpPort = Number(environment.SMTP_PORT);

  if (
    !Number.isInteger(smtpPort) ||
    smtpPort < 1 ||
    smtpPort > 65_535
  ) {
    throw new Error('SMTP_PORT must be an integer between 1 and 65535');
  }

  return {
    NODE_ENV: nodeEnvironment as NodeEnvironment,
    PORT: port,
    CORS_ORIGINS: corsOrigins,
    DB_HOST: requireString(environment, 'DB_HOST'),
    DB_PORT: databasePort,
    DB_DATABASE: requireString(environment, 'DB_DATABASE'),
    DB_USERNAME: requireString(environment, 'DB_USERNAME'),
    DB_PASSWORD: requireString(environment, 'DB_PASSWORD'),
    JWT_SECRET: requireString(environment, 'JWT_SECRET'),
    JWT_EXPIRES_IN_SECONDS: jwtExpiresInSeconds,
    CLOUDINARY_CLOUD_NAME: requireString(environment, 'CLOUDINARY_CLOUD_NAME'),
    CLOUDINARY_API_KEY: requireString(environment, 'CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: requireString(environment, 'CLOUDINARY_API_SECRET'),
    SMTP_HOST: requireString(environment, 'SMTP_HOST'),
    SMTP_PORT: smtpPort,
    SMTP_SECURE: requireBoolean(environment, 'SMTP_SECURE'),
    SMTP_USER: requireString(environment, 'SMTP_USER'),
    SMTP_PASSWORD: requireString(environment, 'SMTP_PASSWORD'),
    SMTP_FROM_NAME: requireString(environment, 'SMTP_FROM_NAME'),
    SMTP_FROM_EMAIL: requireString(environment, 'SMTP_FROM_EMAIL'),
  };
}
import { loadEnvFile } from 'node:process';

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
