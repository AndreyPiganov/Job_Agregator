import { defineConfig } from 'prisma/config';

const developmentDatabaseUrl = 'postgresql://root:example@localhost:5425/job?schema=auth';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? developmentDatabaseUrl,
  },
});
