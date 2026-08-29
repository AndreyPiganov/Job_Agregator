import { createPublicKey } from 'node:crypto';
import { developmentAccessPrivateKeyBase64 } from './jwt.constants';

export const developmentRefreshSecret = 'development-refresh-secret-change-before-production';
export const developmentDatabaseUrl = 'postgresql://root:example@localhost:5425/job?schema=auth';

export default () => {
  const accessPrivateKey = decodePem(process.env.JWT_ACCESS_PRIVATE_KEY_BASE64 ?? developmentAccessPrivateKeyBase64);
  const accessPublicKey = createPublicKey(accessPrivateKey).export({ type: 'spki', format: 'pem' }).toString();

  return {
    environment: process.env.NODE_ENV ?? 'development',
    grpc: {
      host: process.env.GRPC_HOST ?? '0.0.0.0',
      port: Number.parseInt(process.env.GRPC_PORT ?? '5005', 10),
      user: {
        url: process.env.USER_GRPC_URL ?? '127.0.0.1:5000',
        timeoutMs: Number.parseInt(process.env.USER_GRPC_TIMEOUT_MS ?? '3000', 10),
      },
    },
    jwt: {
      accessPrivateKey,
      accessPublicKey,
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? developmentRefreshSecret,
      accessTtlSeconds: Number.parseInt(process.env.JWT_ACCESS_TTL_SECONDS ?? '600', 10),
      refreshTtlSeconds: Number.parseInt(process.env.JWT_REFRESH_TTL_SECONDS ?? '2592000', 10),
      issuer: process.env.JWT_ISSUER ?? 'job-aggregator-auth',
      audience: process.env.JWT_AUDIENCE ?? 'job-aggregator-services',
    },
    database: {
      url: process.env.DATABASE_URL ?? developmentDatabaseUrl,
    },
    redis: {
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number.parseInt(process.env.REDIS_PORT ?? '6379', 10),
      password: process.env.REDIS_PASSWORD ?? 'change-me',
      database: Number.parseInt(process.env.REDIS_DB ?? '1', 10),
      connectTimeoutMs: Number.parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS ?? '1000', 10),
      namespace: process.env.AUTH_SESSION_NAMESPACE ?? 'job-aggregator:auth',
    },
    logging: {
      level: process.env.LOG_LEVEL ?? 'info',
      directory: process.env.LOG_DIR ?? 'logs',
    },
  };
};

function decodePem(value: string): string {
  return Buffer.from(value, 'base64').toString('utf8');
}
