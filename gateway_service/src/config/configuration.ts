export default () => ({
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  environment: process.env.NODE_ENV ?? 'development',
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
    directory: process.env.LOG_DIR ?? 'logs',
  },
  cache: {
    ttlMs: Number.parseInt(process.env.CACHE_TTL_MS ?? '15000', 10),
    namespace: process.env.CACHE_NAMESPACE ?? 'job-aggregator:gateway',
    failureCooldownMs: Number.parseInt(process.env.CACHE_FAILURE_COOLDOWN_MS ?? '5000', 10),
    connectionTimeoutMs: Number.parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS ?? '500', 10),
    redis: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD ?? 'change-me',
      database: Number.parseInt(process.env.REDIS_DB ?? '0', 10),
    },
  },
  grpc: {
    vacancy: {
      url: process.env.VACANCY_GRPC_URL ?? 'localhost:50051',
      timeoutMs: Number.parseInt(process.env.VACANCY_GRPC_TIMEOUT_MS ?? '3000', 10),
    },
  },
});
