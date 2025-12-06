const { PrismaClient } = require('@prisma/client');

// Remove channel_binding and add connection timeouts for Neon pooler
const originalUrl = process.env.DATABASE_URL || '';
let databaseUrl = originalUrl.replace(/&?channel_binding=require/g, '');

// Add connection timeout parameters if not already present
if (!databaseUrl.includes('connect_timeout')) {
  const separator = databaseUrl.includes('?') ? '&' : '?';
  databaseUrl += `${separator}connect_timeout=30&pool_timeout=30`;
}

const prisma = globalThis.__prismaClient ?? new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prismaClient = prisma;
}

module.exports = prisma;
