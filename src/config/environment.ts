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

export function validateEnvironment(
  environment: Record<string, unknown>,
): EnvironmentVariables {
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

  return {
    NODE_ENV: nodeEnvironment as NodeEnvironment,
    PORT: port,
    CORS_ORIGINS: corsOrigins,
    DB_HOST: requireString(environment, 'DB_HOST'),
    DB_PORT: databasePort,
    DB_DATABASE: requireString(environment, 'DB_DATABASE'),
    DB_USERNAME: requireString(environment, 'DB_USERNAME'),
    DB_PASSWORD: requireString(environment, 'DB_PASSWORD'),
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
