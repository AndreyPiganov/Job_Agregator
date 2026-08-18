export default () => ({
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  environment: process.env.NODE_ENV ?? 'development',
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
    directory: process.env.LOG_DIR ?? 'logs',
  },
  grpc: {
    vacancy: {
      url: process.env.VACANCY_GRPC_URL ?? 'localhost:50051',
      timeoutMs: Number.parseInt(process.env.VACANCY_GRPC_TIMEOUT_MS ?? '3000', 10),
    },
  },
});
