import * as bcrypt from 'bcrypt';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('creates salted bcrypt hashes and verifies only the original password', async () => {
    const first = await service.hash('strong-password');
    const second = await service.hash('strong-password');

    expect(first).not.toBe(second);
    expect(bcrypt.getRounds(first)).toBe(12);
    await expect(service.verify('strong-password', first)).resolves.toBe(true);
    await expect(service.verify('wrong-password', first)).resolves.toBe(false);
  });

  it('rejects malformed stored hashes', async () => {
    await expect(service.verify('strong-password', 'not-a-password-hash')).resolves.toBe(false);
  });
});
