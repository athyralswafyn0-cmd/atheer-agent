import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import cookie from '@fastify/cookie';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from './config/index.js';
import { paypalWebhookRoutes } from './routes/paypal-webhook.js';
import { partnersRoutes } from './routes/partners.js';
import { organizationsRoutes } from './routes/organizations/route.js';
import { authRoutes } from './routes/auth.js';
import { botRoutes } from './routes/bots.js';
import { conversationRoutes } from './routes/conversations.js';
import { knowledgeRoutes } from './routes/knowledge.js';
import { leadRoutes } from './routes/leads.js';
import { analyticsRoutes } from './routes/analytics.js';
import { embedRoutes } from './routes/embed.js';
import { integrationRoutes } from './routes/integrations.js';
import { widgetRoutes } from './routes/widget.js';
import { errorHandler } from './middleware/errorHandler.js';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const app = Fastify({ logger: true });

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Decorate the fastify instance with prisma and bcrypt
app.decorate('prisma', prisma);
app.decorate('bcrypt', bcrypt);

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register plugins
app.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});
app.register(helmet);
app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});
app.register(jwt, {
  secret: config.JWT_SECRET,
});
app.register(multipart);
app.register(staticFiles, {
  root: join(__dirname, 'public'),
  prefix: '/public/',
});
app.register(cookie);

// Register routes
app.register(authRoutes, { prefix: '/api/v1/auth' });
app.register(botRoutes, { prefix: '/api/v1/bots' });
app.register(conversationRoutes, { prefix: '/api/v1/conversations' });
app.register(knowledgeRoutes, { prefix: '/api/v1/knowledge' });
app.register(leadRoutes, { prefix: '/api/v1/leads' });
app.register(analyticsRoutes, { prefix: '/api/v1/analytics' });
app.register(embedRoutes, { prefix: '/api/v1/embed' });
app.register(integrationRoutes, { prefix: '/api/v1/integrations' });
app.register(widgetRoutes, { prefix: '/api/v1/widget' });
app.register(paypalWebhookRoutes, { prefix: '/api/v1/billing' });
app.register(partnersRoutes, { prefix: '/api/v1/partners' });
app.register(organizationsRoutes, { prefix: '/api/v1/organizations' });

app.setErrorHandler(errorHandler);

const start = async () => {
  try {
    await app.listen({ port: Number(config.PORT), host: config.HOST });
    console.log(`Server running on http://${config.HOST}:${config.PORT}`);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    app.log.error(errMsg);
    process.exit(1);
  }
};

start();

export { app };