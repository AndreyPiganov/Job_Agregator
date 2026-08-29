import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  const required = {
    password: 'strong-password',
    first_name: 'Ivan',
    last_name: 'Petrov',
  };

  it.each([{ email: 'user@example.com' }, { phone_number: '+79991234567' }])(
    'accepts one registration identifier: %o',
    async (identifier) => {
      await expect(validate(plainToInstance(RegisterDto, { ...required, ...identifier }))).resolves.toHaveLength(0);
    },
  );

  it.each([{}, { email: 'user@example.com', phone_number: '+79991234567' }])(
    'rejects a missing or ambiguous registration identifier: %o',
    async (identifier) => {
      const errors = await validate(plainToInstance(RegisterDto, { ...required, ...identifier }));
      expect(errors.some((error) => error.property === 'identifierSelection')).toBe(true);
    },
  );
});
