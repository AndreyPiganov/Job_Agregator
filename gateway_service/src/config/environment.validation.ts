import { plainToInstance, Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min, validateSync } from 'class-validator';

const environments = ['development', 'test', 'production'] as const;
const logLevels = ['error', 'warn', 'info', 'http', 'verbose', 'debug'] as const;

class EnvironmentVariables {
  @IsIn(environments)
  NODE_ENV = 'development';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  @IsIn(logLevels)
  LOG_LEVEL = 'info';

  @IsString()
  LOG_DIR = 'logs';

  @IsString()
  @IsNotEmpty()
  REDIS_HOST = 'localhost';

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
  @Max(15)
  REDIS_DB = 0;

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(3600000)
  CACHE_TTL_MS = 15000;

  @IsString()
  @IsNotEmpty()
  CACHE_NAMESPACE = 'job-aggregator:gateway';

  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(60000)
  REDIS_CONNECT_TIMEOUT_MS = 500;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(60000)
  CACHE_FAILURE_COOLDOWN_MS = 5000;

  @IsString()
  @IsNotEmpty()
  VACANCY_GRPC_URL = 'localhost:50051';

  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(60000)
  VACANCY_GRPC_TIMEOUT_MS = 3000;
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return { ...config, ...validated };
}
