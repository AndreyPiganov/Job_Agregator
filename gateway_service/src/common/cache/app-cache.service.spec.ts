import { Cache } from '@nestjs/cache-manager';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppCacheService } from './app-cache.service';

describe('AppCacheService', () => {
  let cache: jest.Mocked<Pick<Cache, 'get' | 'set' | 'mdel' | 'on'>>;
  let logger: jest.Mocked<Pick<LoggerService, 'warn'>>;
  let service: AppCacheService;

  beforeEach(() => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      mdel: jest.fn(),
      on: jest.fn(),
    };
    logger = { warn: jest.fn() };
    const config = { get: jest.fn((_key: string, defaultValue: number) => defaultValue) } as unknown as ConfigService;
    service = new AppCacheService(cache as unknown as Cache, logger as unknown as LoggerService, config);
  });

  it('reads and writes cached values', async () => {
    cache.get.mockResolvedValue({ id: '42' });

    await expect(service.get('vacancy:42')).resolves.toEqual({ id: '42' });
    await service.set('vacancy:42', { id: '42' }, 15000);
    await service.delete('vacancy:42', 'vacancy:43');

    expect(cache.set).toHaveBeenCalledWith('vacancy:42', { id: '42' }, 15000);
    expect(cache.mdel).toHaveBeenCalledWith(['vacancy:42', 'vacancy:43']);
  });

  it('fails open when Redis is unavailable', async () => {
    cache.get.mockRejectedValue(new Error('connection refused'));
    cache.set.mockRejectedValue(new Error('connection refused'));
    cache.mdel.mockRejectedValue(new Error('connection refused'));

    await expect(service.get('vacancy:42')).resolves.toBeUndefined();
    await expect(service.get('vacancy:43')).resolves.toBeUndefined();
    await expect(service.set('vacancy:42', { id: '42' })).resolves.toBeUndefined();
    await expect(service.delete('vacancy:42')).resolves.toBeUndefined();

    expect(cache.get).toHaveBeenCalledTimes(1);
    expect(cache.set.mock.calls).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });
});
