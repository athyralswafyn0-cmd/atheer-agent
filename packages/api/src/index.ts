import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { config } from './config/index.js';

const app = Fastify({ logger: true });

app.decorate('prisma', new PrismaClient());

app.get('/health', async () => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`Server listening on ${config.HOST}:${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();