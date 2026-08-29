import { plainToInstance, Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, Min, validateSync } from 'class-validator';
import { developmentDatabaseUrl } from './configuration';

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
  GRPC_PORT = 5000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL = developmentDatabaseUrl;

  @IsIn(logLevels)
  LOG_LEVEL = 'info';

  @IsString()
  @IsNotEmpty()
  LOG_DIR = 'logs';
}

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  if (validated.NODE_ENV === 'production' && validated.DATABASE_URL === developmentDatabaseUrl) {
    throw new Error('DATABASE_URL must be configured in production');
  }

  return { ...config, ...validated };
}
