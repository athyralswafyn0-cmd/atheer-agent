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
import logger from './utils/logger.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import OpenAI from 'openai';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const prisma = new PrismaClient({
    log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
const app = Fastify({
    logger: config.NODE_ENV === 'development' ? logger : false,
    bodyLimit: 10 * 1024 * 1024, // 10MB
});
// ========== Add prisma, bcrypt, openai as decorators ==========
app.decorate('prisma', prisma);
app.decorate('bcrypt', bcrypt);
app.decorate('openai', new OpenAI({
    apiKey: config.OPENAI_API_KEY,
}));
// ====================================================
app.register(cors, {
    origin: config.CORS_ORIGINS.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});
app.register(helmet, {
    contentSecurityPolicy: false,
});
app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
});
app.register(jwt, {
    secret: config.JWT_SECRET,
    sign: { expiresIn: config.JWT_EXPIRES_IN },
});
app.register(multipart, {
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 5,
    },
});
app.register(cookie);
app.register(staticFiles, {
    root: join(__dirname, '../public'),
    prefix: '/public/',
});
// Add global auth middleware hook (must be after jwt plugin)
app.addHook('preHandler', async (request, reply) => {
    console.log('[AUTH HOOK] URL:', request.url, 'Auth header:', request.headers.authorization ? 'present' : 'missing');
    // Skip auth for public routes
    const publicPaths = [
        '/health',
        '/api/v1/auth/login',
        '/api/v1/auth/register',
        '/api/v1/auth/forgot-password',
        '/api/v1/auth/reset-password',
        '/api/v1/billing/webhooks/paypal',
    ];
    const isWidgetPublic = request.url.startsWith('/widget/bots/') &&
        (request.url.includes('/conversations') || request.url.includes('/chat') || request.url.includes('/config') || request.url.includes('/leads'));
    const isEmbedPublic = request.url.startsWith('/embed/bots/') || request.url.startsWith('/api/v1/embed/bots/');
    if (publicPaths.some(path => request.url.startsWith(path)) || isWidgetPublic || isEmbedPublic) {
        return;
    }
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' });
        }
        const token = authHeader.substring(7);
        const decoded = app.jwt.verify(token);
        const user = await app.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true, role: true, organizationId: true },
        });
        if (!user) {
            return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'User not found' });
        }
        request.user = {
            userId: user.id,
            organizationId: user.organizationId,
            role: user.role,
        };
    }
    catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Invalid token' });
        }
        if (err.name === 'TokenExpiredError') {
            return reply.code(401).send({ error: 'TOKEN_EXPIRED', message: 'Token has expired' });
        }
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication failed' });
    }
});
// Add authenticate decorator for route-level auth
app.decorate('authenticate', async (request, reply) => {
    if (!request.user) {
        return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    }
});
// Add validateBotAccess decorator
app.decorate('validateBotAccess', async (botId, organizationId) => {
    const bot = await app.prisma.bot.findFirst({
        where: { id: botId, organizationId },
        select: { id: true },
    });
    if (!bot) {
        throw new Error('Bot not found or access denied');
    }
});
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
app.register(paypalWebhookRoutes, { prefix: '/api/v1/billing/webhooks' });
app.register(partnersRoutes, { prefix: '/api/v1/partners' });
app.register(organizationsRoutes, { prefix: '/api/v1/organizations' });
app.register(authRoutes, { prefix: '/api/v1/auth' });
app.register(botRoutes, { prefix: '/api/v1/bots' });
app.register(conversationRoutes, { prefix: '/api/v1/conversations' });
app.register(knowledgeRoutes, { prefix: '/api/v1/knowledge' });
app.register(leadRoutes, { prefix: '/api/v1/leads' });
app.register(analyticsRoutes, { prefix: '/api/v1/analytics' });
app.register(embedRoutes, { prefix: '/api/v1/embed' });
app.register(integrationRoutes, { prefix: '/api/v1/integrations' });
app.register(widgetRoutes, { prefix: '/widget' });
app.setErrorHandler(errorHandler);
async function start() {
    try {
        await app.listen({ port: config.PORT, host: config.HOST });
        logger.info(`Server running on http://${config.HOST}:${config.PORT}`);
    }
    catch (err) {
        logger.error(err);
        process.exit(1);
    }
}
start();
export { app };
