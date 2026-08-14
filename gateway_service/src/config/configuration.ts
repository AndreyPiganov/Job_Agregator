export default () => ({
  port: Number.parseInt(process.env.PORT ?? '3000', 10),
  environment: process.env.NODE_ENV ?? 'development',
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
    directory: process.env.LOG_DIR ?? 'logs',
  },
});
