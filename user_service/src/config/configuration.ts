export const developmentDatabaseUrl = 'postgresql://root:example@localhost:5425/job?schema=user';

export default () => ({
  environment: process.env.NODE_ENV ?? 'development',
  grpc: {
    host: process.env.GRPC_HOST ?? '0.0.0.0',
    port: Number.parseInt(process.env.GRPC_PORT ?? '5000', 10),
  },
  database: {
    url: process.env.DATABASE_URL ?? developmentDatabaseUrl,
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
    directory: process.env.LOG_DIR ?? 'logs',
  },
});
