export default () => ({
    port: parseInt(process.env.PORT, 10) || 5003,
    environment: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL || '',
    logLevel: process.env.LOG_LEVEL
});
