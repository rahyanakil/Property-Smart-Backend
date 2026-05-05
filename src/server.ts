import 'dotenv/config';
import app from './app';
import { config } from './config';
import { prisma } from './lib/prisma';

const start = async () => {
  try {
    await prisma.$connect();
    console.log('Database connected.');

    app.listen(config.port, () => {
      console.log(`PropertySmart API running on http://localhost:${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
