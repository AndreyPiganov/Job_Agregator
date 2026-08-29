import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PASSWORD_COST_FACTOR } from '../constants/password.constants';

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_COST_FACTOR);
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, encodedHash);
    } catch {
      return false;
    }
  }
}
