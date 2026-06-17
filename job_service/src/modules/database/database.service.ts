import { INestApplication, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        const databaseUrl = process.env.DATABASE_URL;

        if (!databaseUrl) {
            throw new Error('DATABASE_URL is not defined');
        }

        super({
            adapter: new PrismaPg(databaseUrl)
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    async enableShutdownHooks(app: INestApplication) {
        this.$on('beforeExit' as never, async () => {
            await app.close();
        });
    }
}
