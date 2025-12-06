const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const prisma = require('./lib/prisma');

const app = express();
const PORT = process.env.PORT || 4123;
const databaseUrl = process.env.DATABASE_URL || '';

if (!databaseUrl) {
  console.warn('DATABASE_URL is not set. Prisma will fail to connect.');
}

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/stores', require('./routes/storeRoutes'));
app.use('/api/ingestion', require('./routes/ingestionRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));

app.get('/', (req, res) => {
  res.send('Xeno FDE Task API is running');
});

// Connection health monitoring
let healthCheckInterval;

async function checkDatabaseHealth() {
  try {
    // Simple query to keep connection alive
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database health check: OK');
  } catch (error) {
    console.error('Database health check failed:', error.message);
    // Try to reconnect
    try {
      await prisma.$disconnect();
      await prisma.$connect();
      console.log('Database reconnected successfully');
    } catch (reconnectError) {
      console.error('Failed to reconnect to database:', reconnectError.message);
    }
  }
}

async function start() {
  try {
    if (databaseUrl) {
      try {
        const dbUrl = new URL(databaseUrl);
        console.log(`Connecting to database at ${dbUrl.host}`);
      } catch (error) {
        console.warn('Invalid DATABASE_URL format:', error.message);
      }
    }
    await prisma.$connect();
    console.log('Connected to database');

    // Start periodic health checks (every 5 minutes)
    healthCheckInterval = setInterval(checkDatabaseHealth, 5 * 60 * 1000);
    console.log('Database health monitoring started (5 min interval)');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

start();

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (healthCheckInterval) clearInterval(healthCheckInterval);
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  if (healthCheckInterval) clearInterval(healthCheckInterval);
  await prisma.$disconnect();
  process.exit(0);
});
