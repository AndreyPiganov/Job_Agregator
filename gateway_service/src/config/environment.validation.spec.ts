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
    });
  });

  it('converts a valid port to number', () => {
    const config = validateEnvironment({ PORT: '4000' });

    expect(config.PORT).toBe(4000);
  });

  it('rejects an invalid port', () => {
    expect(() => validateEnvironment({ PORT: 'invalid' })).toThrow();
  });
});
