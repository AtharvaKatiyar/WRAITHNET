import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import logger from './logger';

// Load environment variables
dotenv.config();

// Parse DATABASE_URL to extract connection parameters
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const url = new URL(databaseUrl);

// Create PostgreSQL connection pool with explicit parameters
const pool = new Pool({
  host: url.hostname,
  port: parseInt(url.port || '5432'),
  database: url.pathname.slice(1), // Remove leading slash
  user: url.username,
  password: url.password,
  connectionTimeoutMillis: 5000,
});

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Create Prisma client with adapter
const prisma = new PrismaClient({
  adapter,
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'Database query');
  });
}

prisma.$on('error', (e) => {
  logger.error({ target: e.target, message: e.message }, 'Database error');
});

prisma.$on('warn', (e) => {
  logger.warn({ target: e.target, message: e.message }, 'Database warning');
});

export default prisma;
