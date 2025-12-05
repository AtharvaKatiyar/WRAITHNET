import { beforeAll, afterAll } from 'vitest';

// Suppress logger output during tests
beforeAll(() => {
  process.env.LOG_LEVEL = 'silent';
});

afterAll(() => {
  // Cleanup if needed
});
