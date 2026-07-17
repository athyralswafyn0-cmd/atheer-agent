import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { config } from './config/index.js';

const app = Fastify({ logger: true });

app.decorate('prisma', new PrismaClient());

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

app.listen(
  { port: config.PORT, host: config.HOST },
  (err, address) => {
    if (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
    console.log(`Server listening on ${address}`);
  }
);