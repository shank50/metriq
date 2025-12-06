const { PrismaClient } = require('@prisma/client');

const prisma = globalThis.__prismaClient ?? new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'query', emit: 'event' },
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'connection_limit=5&pool_timeout=10&connect_timeout=5&pgbouncer=true',
    },
  },
});

// Event listeners for logging
prisma.$on('warn', (e) => {
  console.warn('Prisma Warning:', e);
});

prisma.$on('error', (e) => {
  console.error('Prisma Error:', e);
});

prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    console.warn(`Slow query (${e.duration}ms):`, e.query.substring(0, 100));
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prismaClient = prisma;
}

module.exports = prisma;
