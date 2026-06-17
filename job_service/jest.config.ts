import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    rootDir: '.',
    moduleFileExtensions: ['ts', 'js'],
    testMatch: ['<rootDir>/tests/**/*.test.ts'],
    clearMocks: true,
    setupFilesAfterEnv: ['<rootDir>/tests/singleton.ts'],
    moduleNameMapper: {
        '^@src/(.*)$': '<rootDir>/src/$1' // Поддержка алиасов из tsconfig
    },
    collectCoverageFrom: [
        '<rootDir>/src/controllers/*.ts',
        '<rootDir>/src/services/*.ts',
        '<rootDir>/src/exceptions/*.ts',
        '<rootDir>/src/routes/*.ts',
        '<rootDir>/src/main.ts',
        '<rootDir>/src/middlewares/*.ts'
    ],
    coverageDirectory: '<rootDir>/coverage',
    coveragePathIgnorePatterns: ['/src/services/rabbitMQ.service.ts']
};

export default config;
