import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class AppCacheService {
  private readonly failureCooldownMs: number;
  private unavailableUntil = 0;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    config: ConfigService,
  ) {
    this.failureCooldownMs = config.get<number>('cache.failureCooldownMs', 5000);
    this.cache.on('get', ({ key, error }) => {
      if (error) {
        this.markUnavailable('read', key, error);
      }
    });
  }

  async get<Value>(key: string): Promise<Value | undefined> {
    if (this.isTemporarilyUnavailable()) {
      return undefined;
    }

    try {
      return await this.cache.get<Value>(key);
    } catch (error) {
      this.markUnavailable('read', key, error);
      return undefined;
    }
  }

  async set<Value>(key: string, value: Value, ttlMs?: number): Promise<void> {
    if (this.isTemporarilyUnavailable()) {
      return;
    }

    try {
      await this.cache.set(key, value, ttlMs);
    } catch (error) {
      this.markUnavailable('write', key, error);
    }
  }

  async delete(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    try {
      await this.cache.mdel(keys);
    } catch (error) {
      this.markUnavailable('delete', keys.join(','), error);
    }
  }

  private isTemporarilyUnavailable(): boolean {
    return Date.now() < this.unavailableUntil;
  }

  private markUnavailable(operation: 'read' | 'write' | 'delete', key: string | undefined, error: unknown): void {
    this.unavailableUntil = Date.now() + this.failureCooldownMs;
    this.logger.warn({
      message: 'cache operation failed',
      operation,
      key,
      error: error instanceof Error ? error.message : error,
    });
  }
}
