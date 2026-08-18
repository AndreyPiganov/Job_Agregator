import 'reflect-metadata';
import { validateEnvironment } from './environment.validation';

describe('validateEnvironment', () => {
  it('applies defaults', () => {
    const config = validateEnvironment({});

    expect(config).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'info',
      LOG_DIR: 'logs',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      REDIS_PASSWORD: 'change-me',
      REDIS_DB: 0,
      CACHE_TTL_MS: 15000,
      CACHE_NAMESPACE: 'job-aggregator:gateway',
      REDIS_CONNECT_TIMEOUT_MS: 500,
      CACHE_FAILURE_COOLDOWN_MS: 5000,
      VACANCY_GRPC_URL: 'localhost:50051',
      VACANCY_GRPC_TIMEOUT_MS: 3000,
    });
  });

  it('converts a valid port to number', () => {
    const config = validateEnvironment({ PORT: '4000' });

    expect(config.PORT).toBe(4000);
  });

  it('rejects an invalid port', () => {
    expect(() => validateEnvironment({ PORT: 'invalid' })).toThrow();
  });

  it('rejects an invalid gRPC timeout', () => {
    expect(() => validateEnvironment({ VACANCY_GRPC_TIMEOUT_MS: 'too-fast' })).toThrow();
  });

  it('rejects invalid Redis and cache settings', () => {
    expect(() => validateEnvironment({ REDIS_PORT: 'invalid' })).toThrow();
    expect(() => validateEnvironment({ REDIS_DB: '16' })).toThrow();
    expect(() => validateEnvironment({ CACHE_TTL_MS: '999' })).toThrow();
  });
});
