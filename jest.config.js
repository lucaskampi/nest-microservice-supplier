module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/packages/**/*.spec.ts'],
      transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
      },
      collectCoverageFrom: [
        'src/**/*.(t|j)s',
        'packages/**/*.(t|j)s',
      ],
      coverageDirectory: 'coverage/unit',
      coveragePathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/prisma/',
        'main.ts',
      ],
    },
    {
      displayName: 'e2e',
      testEnvironment: 'node',
      rootDir: 'test',
      testMatch: ['**/*.e2e-spec.ts'],
      transform: {
        '^.+\\.(t|j)s$': 'ts-jest',
      },
      collectCoverageFrom: ['../src/**/*.(t|j)s'],
      coverageDirectory: '../coverage/e2e',
      coveragePathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/prisma/',
        'main.ts',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: {
        '^@nest-microservices/shared$': '<rootDir>/../packages/shared/src/index.ts',
      },
    },
  ],
}
