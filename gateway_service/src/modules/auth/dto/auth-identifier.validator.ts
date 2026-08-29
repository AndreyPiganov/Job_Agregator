import { isEmail, registerDecorator, ValidationOptions } from 'class-validator';
import { PHONE_PATTERN } from '../constants/auth.constants';
import type { AuthIdentifierObject } from '../interfaces/auth.interfaces';

export function IsExactlyOneAuthIdentifier(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'isExactlyOneAuthIdentifier',
      target: target.constructor,
      propertyName: String(propertyKey),
      options,
      validator: {
        validate(_value: unknown, args): boolean {
          const input = args.object as AuthIdentifierObject;
          const email = typeof input.email === 'string' ? input.email.trim() : '';
          const phone = typeof input.phone_number === 'string' ? input.phone_number.trim() : '';
          if (Boolean(email) === Boolean(phone)) return false;
          return email ? email.length <= 320 && isEmail(email) : PHONE_PATTERN.test(phone);
        },
        defaultMessage: () => 'provide exactly one valid email or phone_number in E.164 format',
      },
    });
  };
}

export function IsEmailOrPhone(options?: ValidationOptions): PropertyDecorator {
  return (target, propertyKey) => {
    registerDecorator({
      name: 'isEmailOrPhone',
      target: target.constructor,
      propertyName: String(propertyKey),
      options,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          const identifier = value.trim();
          return (identifier.length <= 320 && isEmail(identifier)) || PHONE_PATTERN.test(identifier);
        },
        defaultMessage: () => 'identifier must be a valid email or phone number in E.164 format',
      },
    });
  };
}
