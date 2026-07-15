import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCookie from '@fastify/cookie';
import { PrismaClient } from '@prisma/client';
import { authRoutes } from './routes/index';
import { PrismaAuthRepository } from './modules/auth/repository';
import { AuthService } from './modules/auth/service';

const app = Fastify({
  logger: true,
});

const prisma = new PrismaClient();

// Register plugins
app.register(fastifyHelmet);
app.register(fastifyCors, {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
});
app.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
});
app.register(fastifyCookie);
app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET!,
});

// Repositories and Services
const authRepository = new PrismaAuthRepository(prisma);
const authService = new AuthService(authRepository);

// Decorate the instance with our services
app.decorate('authService', authService);
app.decorate('prisma', prisma);

// Register routes
app.register(authRoutes, { prefix: '/api/v1/auth' });

// Health check
app.get('/health', async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', timestamp: new Date().toISOString() };
  } catch (error) {
    app.log.error(error);
    return { status: 'error', timestamp: new Date().toISOString() };
  }
});

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen({ port: PORT, host: HOST }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Auth Service listening at ${address}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  app.log.info('Shutting down gracefully...');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
});