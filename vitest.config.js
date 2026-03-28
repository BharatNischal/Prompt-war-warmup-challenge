import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['server/**/*.js'],
      exclude: ['server/index.js'],
      thresholds: {
        lines: 60,
        functions: 55,
        branches: 45,
        statements: 60,
      },
    },
    testTimeout: 15000,
  },
});
