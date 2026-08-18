import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createKeyv } from '@keyv/redis';
import { AppCacheService } from './app-cache.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionTimeout = config.get<number>('cache.connectionTimeoutMs', 1000);

        return {
          stores: [
            createKeyv(
              {
                url: createRedisUrl(config),
                disableOfflineQueue: true,
                socket: { connectTimeout: connectionTimeout },
              },
              {
                namespace: config.get<string>('cache.namespace', 'job-aggregator:gateway'),
                connectionTimeout,
                throwOnConnectError: true,
                throwOnErrors: true,
                useUnlink: true,
              },
            ),
          ],
          ttl: config.get<number>('cache.ttlMs', 15000),
        };
      },
    }),
  ],
  providers: [AppCacheService],
  exports: [AppCacheService],
})
export class RedisCacheModule {}

function createRedisUrl(config: ConfigService): string {
  const url = new URL('redis://localhost');
  url.hostname = config.get<string>('cache.redis.host', 'localhost');
  url.port = String(config.get<number>('cache.redis.port', 6379));
  url.pathname = `/${config.get<number>('cache.redis.database', 0)}`;

  const password = config.get<string>('cache.redis.password');
  if (password) {
    url.username = 'default';
    url.password = password;
  }

  return url.toString();
}
