// Vitest setup file for API tests
import { beforeAll, afterAll } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';