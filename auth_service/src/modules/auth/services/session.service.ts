import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { REVOKE_SESSION_SCRIPT, ROTATE_SESSION_SCRIPT } from '../constants/session.constants';
import type {
  CreateSessionInput,
  RevokeSessionInput,
  RotateSessionInput,
  StoredSession,
} from '../interfaces/auth.interfaces';

@Injectable()
export class SessionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionService.name);
  private readonly client: ReturnType<typeof createClient>;
  private readonly namespace: string;

  constructor(config: ConfigService) {
    this.namespace = config.getOrThrow<string>('redis.namespace');
    this.client = createClient({
      password: config.getOrThrow<string>('redis.password'),
      database: config.getOrThrow<number>('redis.database'),
      socket: {
        host: config.getOrThrow<string>('redis.host'),
        port: config.getOrThrow<number>('redis.port'),
        connectTimeout: config.getOrThrow<number>('redis.connectTimeoutMs'),
        reconnectStrategy: false,
      },
    });

    this.client.on('error', (error: Error) => {
      this.logger.error({ message: 'redis session store error', error: error.message });
    });
  }

  async onModuleInit(): Promise<void> {
    await this.client.connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async create(input: CreateSessionInput): Promise<void> {
    await this.client
      .multi()
      .hSet(this.key(input.sessionId), {
        user_id: input.userId,
        refresh_fingerprint: input.refreshTokenFingerprint,
      })
      .expire(this.key(input.sessionId), input.ttlSeconds)
      .exec();
  }

  async find(sessionId: string): Promise<StoredSession | null> {
    const [userId, refreshTokenFingerprint] = await this.client.hmGet(this.key(sessionId), [
      'user_id',
      'refresh_fingerprint',
    ]);
    if (!userId || !refreshTokenFingerprint) {
      return null;
    }

    return {
      userId: valueToString(userId),
      refreshTokenFingerprint: valueToString(refreshTokenFingerprint),
    };
  }

  async rotate(input: RotateSessionInput): Promise<boolean> {
    const result = await this.client.eval(ROTATE_SESSION_SCRIPT, {
      keys: [this.key(input.sessionId)],
      arguments: [
        input.expectedRefreshTokenFingerprint,
        input.nextRefreshTokenFingerprint,
        input.userId,
        String(input.ttlSeconds),
      ],
    });
    return Number(result) === 1;
  }

  async revoke(input: RevokeSessionInput): Promise<boolean> {
    const result = await this.client.eval(REVOKE_SESSION_SCRIPT, {
      keys: [this.key(input.sessionId)],
      arguments: [input.refreshTokenFingerprint, input.userId],
    });
    return Number(result) === 1;
  }

  private key(sessionId: string): string {
    return `${this.namespace}:session:${sessionId}`;
  }
}

function valueToString(value: string | Buffer): string {
  return typeof value === 'string' ? value : value.toString('utf8');
}
