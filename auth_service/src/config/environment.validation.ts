import { plainToInstance, Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min, MinLength, validateSync } from 'class-validator';
import { createPrivateKey } from 'node:crypto';
import { developmentDatabaseUrl, developmentRefreshSecret } from './configuration';
import { developmentAccessPrivateKeyBase64 } from './jwt.constants';

const environments = ['development', 'test', 'production'] as const;
const logLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug'] as const;

class EnvironmentVariables {
  @IsIn(environments)
  NODE_ENV = 'development';

  @IsString()
  @IsNotEmpty()
  GRPC_HOST = '0.0.0.0';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  GRPC_PORT = 5005;

  @IsString()
  @IsNotEmpty()
  USER_GRPC_URL = '127.0.0.1:5000';

  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(60000)
  USER_GRPC_TIMEOUT_MS = 3000;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_PRIVATE_KEY_BASE64 = developmentAccessPrivateKeyBase64;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET = developmentRefreshSecret;

  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86400)
  JWT_ACCESS_TTL_SECONDS = 600;

  @Type(() => Number)
  @IsInt()
  @Min(3600)
  @Max(31536000)
  JWT_REFRESH_TTL_SECONDS = 2592000;

  @IsString()
  @IsNotEmpty()
  JWT_ISSUER = 'job-aggregator-auth';

  @IsString()
  @IsNotEmpty()
  JWT_AUDIENCE = 'job-aggregator-services';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL = developmentDatabaseUrl;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST = '127.0.0.1';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT = 6379;

  @IsString()
  @IsNotEmpty()
  REDIS_PASSWORD = 'change-me';

  @Type(() => Number)
  @IsInt()
  @Min(0)
  REDIS_DB = 1;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(60000)
  REDIS_CONNECT_TIMEOUT_MS = 1000;

  @IsString()
  @IsNotEmpty()
  AUTH_SESSION_NAMESPACE = 'job-aggregator:auth';

  @IsIn(logLevels)
  LOG_LEVEL = 'info';

  @IsString()
  @IsNotEmpty()
  LOG_DIR = 'logs';
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  if (
    validated.NODE_ENV === 'production' &&
    (validated.JWT_ACCESS_PRIVATE_KEY_BASE64 === developmentAccessPrivateKeyBase64 ||
      validated.JWT_REFRESH_SECRET === developmentRefreshSecret)
  ) {
    throw new Error('JWT access private key and refresh secret must be changed in production');
  }

  if (validated.NODE_ENV === 'production' && validated.DATABASE_URL === developmentDatabaseUrl) {
    throw new Error('DATABASE_URL must be configured in production');
  }

  try {
    const key = createPrivateKey(Buffer.from(validated.JWT_ACCESS_PRIVATE_KEY_BASE64, 'base64'));
    if (key.asymmetricKeyType !== 'rsa' || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
      throw new Error('unsupported access key');
    }
  } catch {
    throw new Error('JWT_ACCESS_PRIVATE_KEY_BASE64 must contain a base64-encoded 2048-bit RSA private key');
  }

  return { ...config, ...validated };
}
