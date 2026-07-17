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
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRoutes } from './routes/health.js';
import { partnersRoutes } from './routes/partners.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { initializeModules } from './modules/index.js';
import type { ChatMessage } from './modules/interfaces.js';

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = Fastify({ logger: true });

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Decorate the fastify instance with prisma and bcrypt
app.decorate('prisma', prisma);
app.decorate('bcrypt', bcrypt);

// Debug: Test bcrypt decorator
console.log('[BOOT] bcrypt decorated on app:', typeof app.bcrypt);
console.log('[BOOT] bcrypt methods:', Object.keys(bcrypt));

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

// Decorate config on app instance for modules to access
app.decorate('config', config);

// Register auth middleware after JWT is registered
authMiddleware(app);

// Initialize Modular Monolith modules (Stage 2)
console.log('[BOOT] Initializing modules...');
await initializeModules(app);
console.log('[BOOT] Modules initialized');

// Register routes
app.register(healthRoutes);
app.register(partnersRoutes);

// Root route - API info page
app.get('/', async (_request, reply) => {
  return reply.type('text/html').send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Atheer Agent AI - API Server</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #e2e8f0;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 600px;
    }
    .logo { font-size: 3rem; font-weight: 800; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1rem; }
    .subtitle { color: #94a3b8; font-size: 1.25rem; margin-bottom: 2rem; }
    .status { display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 9999px; padding: 0.75rem 1.5rem; margin-bottom: 2rem; }
    .status-dot { width: 10px; height: 10px; background: #22c55e; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    .status-text { font-weight: 600; color: #22c55e; }
    .endpoints { text-align: right; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 12px; padding: 1.5rem; margin-top: 2rem; }
    .endpoint { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid rgba(148, 163, 184, 0.1); }
    .endpoint:last-child { border-bottom: none; }
    .endpoint-method { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 0.25rem 0.75rem; border-radius: 6px; font-size: 0.75rem; font-weight: 700; color: white; }
    .endpoint-path { font-family: 'SF Mono', 'Fira Code', monospace; color: #94a3b8; }
    .footer { margin-top: 2rem; color: #64748b; font-size: 0.875rem; }
    .version { color: #3b82f6; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Atheer Agent AI</div>
    <p class="subtitle">API Server - Modular Monolith (Stage 2)</p>
    <div class="status">
      <span class="status-dot"></span>
      <span class="status-text">الخادم يعمل بنجاح ✓</span>
    </div>
    <div class="endpoints">
      <div class="endpoint">
        <span class="endpoint-path">GET /health</span>
        <span class="endpoint-method">Health Check</span>
      </div>
      <div class="endpoint">
        <span class="endpoint-path">GET /ready</span>
        <span class="endpoint-method">Readiness Check</span>
      </div>
      <div class="endpoint">
        <span class="endpoint-path">GET /api/v1/partners</span>
        <span class="endpoint-method">Partners API</span>
      </div>
      <div class="endpoint">
        <span class="endpoint-path">GET /api/v1/organizations</span>
        <span class="endpoint-method">Organizations API</span>
      </div>
      <div class="endpoint">
        <span class="endpoint-path">POST /api/v1/auth/login</span>
        <span class="endpoint-method">Authentication</span>
      </div>
      <div class="endpoint">
        <span class="endpoint-path">POST /api/v1/auth/register</span>
        <span class="endpoint-method">Registration</span>
      </div>
    </div>
    <div class="footer">
      <p>إصدار API: <span class="version">v1.0.0</span> | النشر: Railway | الدومين: atheersolutions.online</p>
      <p>مرحلة 2: Modular Monolith مكتملة ✓ | مرحلة 3: Microservices قيد التخطيط</p>
    </div>
  </div>
</body>
</html>
  `);
});

// Auth Module routes (from Modular Monolith)
const authModule = app.modules.auth;
app.post('/api/v1/auth/register', async (request, reply) => {
  try {
    const result = await authModule.register(request.body as any);

    const accessToken = app.jwt.sign({
      userId: result.user.id,
      organizationId: result.user.organizationId,
      role: result.user.role,
      email: result.user.email,
    }, { expiresIn: '7d' });

    const refreshToken = app.jwt.sign({
      userId: result.user.id,
      type: 'refresh',
    }, { expiresIn: '30d' });

    return reply.code(201).send({
      user: result.user,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60,
      },
    });
  } catch (error: any) {
    if (error.message === 'EMAIL_ALREADY_REGISTERED') {
      return reply.code(409).send({ error: 'Email already registered' });
    }
    throw error;
  }
});

app.post('/api/v1/auth/login', async (request, reply) => {
  try {
    const result = await authModule.login(request.body as any);

    const accessToken = app.jwt.sign({
      userId: result.user.id,
      organizationId: result.user.organizationId,
      role: result.user.role,
      email: result.user.email,
      iss: 'atheer-agent',
    }, { expiresIn: '7d' });

    const refreshToken = app.jwt.sign({
      userId: result.user.id,
      type: 'refresh',
    }, { expiresIn: '30d' });

    return {
      user: result.user,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 7 * 24 * 60 * 60,
      },
    };
  } catch (error: any) {
    if (error.message === 'INVALID_CREDENTIALS' || error.message === 'USER_MISSING_ORGANIZATION') {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    throw error;
  }
});

app.post('/api/v1/auth/refresh', async (request, reply) => {
  const { refreshToken } = request.body as { refreshToken: string };

  try {
    const decoded = app.jwt.verify(refreshToken) as { userId: string; type: string };
    if (decoded.type !== 'refresh') {
      return reply.code(401).send({ error: 'Invalid token type' });
    }

    const user = await app.prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return reply.code(401).send({ error: 'User not found' });
    }

    const accessToken = app.jwt.sign({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
      iss: 'atheer-agent',
    }, { expiresIn: '7d' });

    const newRefreshToken = app.jwt.sign({
      userId: user.id,
      type: 'refresh',
    }, { expiresIn: '30d' });

    return { accessToken, refreshToken: newRefreshToken, expiresIn: 7 * 24 * 60 * 60 };
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired refresh token' });
  }
});

app.post('/api/v1/auth/logout', { preHandler: [app.authenticate] }, async (request, _reply) => {
  await authModule.logout(request.user!.userId);
  return { message: 'Logged out successfully' };
});

app.post('/api/v1/auth/forgot-password', async (request, _reply) => {
  await authModule.requestPasswordReset((request.body as any).email);
  return { message: 'If your email is registered, you will receive a password reset link' };
});

app.post('/api/v1/auth/reset-password', async (request, reply) => {
  try {
    await authModule.resetPassword((request.body as any).token, (request.body as any).password);
    return { message: 'Password has been reset' };
  } catch (error: any) {
    if (error.message === 'INVALID_OR_EXPIRED_TOKEN') {
      return reply.code(400).send({ error: 'Invalid or expired token' });
    }
    throw error;
  }
});

app.post('/api/v1/auth/change-password', { preHandler: [app.authenticate] }, async (request, _reply) => {
  try {
    await authModule.changePassword(request.user!.userId, (request.body as any).currentPassword, (request.body as any).newPassword);
    return { message: 'Password changed successfully' };
  } catch (error: any) {
    if (error.message === 'CURRENT_PASSWORD_INCORRECT') {
      return _reply.code(400).send({ error: 'Current password is incorrect' });
    }
    throw error;
  }
});

app.get('/api/v1/auth/me', { preHandler: [app.authenticate] }, async (request) => {
  const user = await app.prisma.user.findUnique({
    where: { id: request.user!.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      avatar: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  return { user };
});

app.get('/api/v1/auth/profile', { preHandler: [app.authenticate] }, async (request) => {
  const user = await app.prisma.user.findUnique({
    where: { id: request.user!.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationMembers: { take: 1, select: { organizationId: true } },
      avatar: true,
      emailVerified: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  return { user };
});

app.get('/api/v1/auth/sessions', { preHandler: [app.authenticate] }, async (request) => {
  const sessions = await authModule.getUserSessions(request.user!.userId);
  return { sessions };
});

app.delete('/api/v1/auth/sessions/:sessionId', { preHandler: [app.authenticate] }, async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string };
  await authModule.revokeSession(request.user!.userId, sessionId);
  return { message: 'Session revoked' };
});

app.delete('/api/v1/auth/sessions', { preHandler: [app.authenticate] }, async (request) => {
  await authModule.revokeAllSessions(request.user!.userId);
  return { message: 'All sessions revoked' };
});

// New Modular Monolith routes (Stage 2)
// Bot routes
app.register(async (app) => {
  const botModule = app.modules.bot;
  
  // GET /api/v1/bots - List bots
  app.get('/bots', { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user!;
    const { status, type, search, page = 1, limit = 10 } = request.query as any;
    
    if (!user.organizationId) return { bots: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    
    return botModule.getBotByOrganization(user.organizationId, { status, type, search, page, limit });
  });
  
  // POST /api/v1/bots - Create bot
  app.post('/bots', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user!;
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    try {
      const bot = await botModule.createBot(user.organizationId, user.userId, request.body as any);
      return reply.code(201).send(bot);
    } catch (error: any) {
      throw error;
    }
  });
  
  // GET /api/v1/bots/:id - Get bot by ID
  app.get('/bots/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    const bot = await botModule.getBot(id, user.organizationId);
    if (!bot) return reply.code(404).send({ error: 'Bot not found' });
    return { bot };
  });
  
  // PATCH /api/v1/bots/:id - Update bot
  app.patch('/bots/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    try {
      const bot = await botModule.updateBot(id, user.organizationId, request.body as any);
      return { bot };
    } catch (error: any) {
      throw error;
    }
  });
  
  // DELETE /api/v1/bots/:id - Delete bot
  app.delete('/bots/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    await botModule.deleteBot(id, user.organizationId);
    return { message: 'Bot deleted successfully' };
  });
  
  // POST /api/v1/bots/:id/activate - Activate bot
  app.post('/bots/:id/activate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    const bot = await botModule.activateBot(id, user.organizationId);
    return { bot };
  });
  
  // POST /api/v1/bots/:id/deactivate - Deactivate bot
  app.post('/bots/:id/deactivate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    const bot = await botModule.deactivateBot(id, user.organizationId);
    return { bot };
  });
  
  // GET /api/v1/bots/:id/config - Get bot config
  app.get('/bots/:id/config', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    const config = await botModule.getBotConfig(id);
    if (!config) return reply.code(404).send({ error: 'Bot config not found' });
    return { config };
  });
  
  // PUT /api/v1/bots/:id/config - Update bot config
  app.put('/bots/:id/config', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    const config = await botModule.updateBotConfig(id, request.body as any);
    return { config };
  });
  
  // ========== KNOWLEDGE BASE ROUTES ==========
  
  // GET /api/v1/bots/:id/knowledge-bases - List knowledge bases
  app.get('/bots/:id/knowledge-bases', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    const bot = await botModule.getBot(id, user.organizationId);
    if (!bot) return reply.code(404).send({ error: 'Bot not found' });
    
    const kbs = await botModule.getKnowledgeBases(id);
    return { knowledgeBases: kbs };
  });
  
  // POST /api/v1/bots/:id/knowledge-bases - Create knowledge base
  app.post('/bots/:id/knowledge-bases', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    const bot = await botModule.getBot(id, user.organizationId);
    if (!bot) return reply.code(404).send({ error: 'Bot not found' });
    
    const kb = await botModule.createKnowledgeBase(id, request.body as any);
    return reply.code(201).send(kb);
  });
  
  // PUT /api/v1/bots/:id/knowledge-bases/:kbId - Update knowledge base
  app.put('/bots/:id/knowledge-bases/:kbId', { preHandler: [app.authenticate] }, async (request, _reply) => {
    const { kbId } = request.params as { kbId: string };
    const kb = await botModule.updateKnowledgeBase(kbId, request.body as any);
    return { kb };
  });
  
  // DELETE /api/v1/bots/:id/knowledge-bases/:kbId - Delete knowledge base
  app.delete('/bots/:id/knowledge-bases/:kbId', { preHandler: [app.authenticate] }, async (request, _reply) => {
    const { kbId } = request.params as { kbId: string };
    await botModule.deleteKnowledgeBase(kbId);
    return { message: 'Knowledge base deleted successfully' };
  });
  
  // ========== TRAINING ROUTES ==========
  
  // POST /api/v1/bots/:id/training - Start training
  app.post('/bots/:id/training', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    const job = await botModule.startTraining(id, user.organizationId);
    return reply.code(201).send(job);
  });
  
  // GET /api/v1/bots/:id/training/:jobId - Get training status
  app.get('/bots/:id/training/:jobId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const job = await botModule.getTrainingStatus(jobId);
    if (!job) return reply.code(404).send({ error: 'Training job not found' });
    return { job };
  });
  
  // GET /api/v1/bots/:id/training - Get training history
    app.get('/bots/:id/training', { preHandler: [app.authenticate] }, async (request, _reply) => {
      const { id } = request.params as { id: string };
      const jobs = await botModule.getTrainingHistory(id);
      return { jobs };
    });
  
    // ========== MODEL ROUTING ==========
  
    // GET /api/v1/bots/:id/models - Get available models
      app.get('/bots/:id/models', { preHandler: [app.authenticate] }, async (_request, _reply) => {
        const models = await botModule.getAvailableModels();
        return { models };
      });
  
  // POST /api/v1/bots/:id/route - Route request
  app.post('/bots/:id/route', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { messages } = request.body as { messages: ChatMessage[] };
    const user = request.user!;
    
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    const bot = await botModule.getBot(id, user.organizationId);
    if (!bot) return reply.code(404).send({ error: 'Bot not found' });
    
    const result = await botModule.routeRequest(id, messages);
    return { result };
  });
  
  // ========== EMBED SCRIPT ==========
  
  // GET /api/v1/bots/:id/embed - Get embed script
  app.get('/bots/:id/embed', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { domain } = request.query as { domain?: string };
    const user = request.user!;
    
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    const bot = await botModule.getBot(id, user.organizationId);
    if (!bot) return reply.code(404).send({ error: 'Bot not found' });
    
    const script = await botModule.getEmbedScript(id, domain);
    return { script };
  });

  // POST /api/v1/bots/:id/embed/validate - Validate embed domain
  app.post('/bots/:id/embed/validate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { domain } = request.body as { domain: string };
    const user = request.user!;
    
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }
    
    const bot = await botModule.getBot(id, user.organizationId);
    if (!bot) return reply.code(404).send({ error: 'Bot not found' });
    
    if (!domain) {
      return reply.code(400).send({ error: 'Domain required' });
    }
    
    const valid = await botModule.validateEmbedDomain(id, domain);
    return { valid };
  });
}, { prefix: '/api/v1' });

// Tenant routes
app.register(async (app) => {
  const tenantModule = app.modules.tenant;
  
  // GET /api/v1/organizations
  app.get('/organizations', { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user!;
    const { status, plan, search, page = 1, limit = 10 } = request.query as any;
    
    if (user.organizationId) {
      const org = await tenantModule.getOrganization(user.organizationId);
      return org ? [org] : [];
    }
    
    if (user.role === 'PARTNER_ADMIN' || user.role === 'PARTNER_VIEWER') {
      return tenantModule.listOrganizations(user.id, { status, plan, search, page, limit });
    }
    
    return [];
  });
  
  // POST /api/v1/organizations
  app.post('/organizations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user!;
    if (user.role !== 'PARTNER_ADMIN' && user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
    
    try {
      const org = await tenantModule.createOrganization(request.body as any, user.id);
      return reply.code(201).send(org);
    } catch (error: any) {
      if (error.message === 'DOMAIN_ALREADY_EXISTS') {
        return reply.code(400).send({ error: 'Organization with this domain already exists' });
      }
      if (error.message === 'ORGANIZATION_NAME_CONFLICT') {
        return reply.code(400).send({ error: 'Organization with similar name already exists' });
      }
      throw error;
    }
  });
  
  // GET /api/v1/organizations/:id
  app.get('/organizations/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    // Check if user is a member of this organization
    const membership = await app.prisma.organizationMember.findFirst({
      where: { userId: user.userId, organizationId: id },
    });
    
    if (!membership) {
      return reply.code(403).send({ error: 'Forbidden - not a member of this organization' });
    }
    
    const organization = await tenantModule.getOrganization(id);
    if (!organization) return reply.code(404).send({ error: 'Organization not found' });
    return organization;
  });
  
  // PUT /api/v1/organizations/:id
  app.put('/organizations/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    try {
      const org = await tenantModule.updateOrganization(id, request.body as any, user.id);
      return org;
    } catch (error: any) {
      if (error.message === 'INSUFFICIENT_PERMISSIONS') {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }
      if (error.message === 'DOMAIN_ALREADY_EXISTS') {
        return reply.code(400).send({ error: 'Organization with this domain already exists' });
      }
      throw error;
    }
  });
  
  // DELETE /api/v1/organizations/:id
  app.delete('/organizations/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    try {
      await tenantModule.deleteOrganization(id, user.id);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'ONLY_OWNER_CAN_DELETE') {
        return reply.code(403).send({ error: 'Only the organization owner can delete it' });
      }
      throw error;
    }
  });
  
  // GET /api/v1/organizations/:id/members
  app.get('/organizations/:id/members', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return tenantModule.getMembers(id);
  });
  
  // POST /api/v1/organizations/:id/members
  app.post('/organizations/:id/members', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    const membership = await app.prisma.organizationMember.findFirst({
      where: { userId: user.userId, organizationId: id },
    });
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
    
    // Find or create user by email
    const { email, role } = request.body as { email: string; role: string };
    let memberUser = await app.prisma.user.findUnique({ where: { email } });
    
    if (!memberUser) {
      memberUser = await app.prisma.user.create({
        data: { email, name: email.split('@')[0], role: 'MEMBER' }
      });
    }
    
    const member = await tenantModule.addMember(id, memberUser.id, role);
    return member;
  });
  
  // PATCH /api/v1/organizations/:id/members/:userId
  app.patch('/organizations/:id/members/:userId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id, userId: memberUserId } = request.params as { id: string; userId: string };
    const user = request.user!;
    
    const membership = await app.prisma.organizationMember.findFirst({
      where: { userId: user.userId, organizationId: id },
    });
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
    
    const { role } = request.body as { role: string };
    const member = await tenantModule.updateMemberRole(id, memberUserId, role);
    return member;
  });
  
  // DELETE /api/v1/organizations/:id/members/:userId
  app.delete('/organizations/:id/members/:userId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id, userId: memberUserId } = request.params as { id: string; userId: string };
    const user = request.user!;
    
    try {
      await tenantModule.removeMember(id, memberUserId, user.userId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'CANNOT_REMOVE_OWNER') {
        return reply.code(400).send({ error: 'Cannot remove organization owner' });
      }
      if (error.message === 'INSUFFICIENT_PERMISSIONS') {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }
      throw error;
    }
  });
  
  // Invitations
  app.post('/organizations/:id/invitations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    
    const membership = await app.prisma.organizationMember.findFirst({
      where: { userId: user.userId, organizationId: id },
    });
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
    
    try {
      const invitation = await tenantModule.inviteMember({
        ...(request.body as any),
        organizationId: id,
        invitedBy: user.id,
      });
      return invitation;
    } catch (error: any) {
      if (error.message === 'USER_ALREADY_MEMBER') {
        return reply.code(400).send({ error: 'User is already a member' });
      }
      if (error.message === 'INVITATION_ALREADY_PENDING') {
        return reply.code(400).send({ error: 'Invitation already pending for this email' });
      }
      throw error;
    }
  });
  
  app.get('/organizations/:id/invitations', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return tenantModule.listInvitations(id);
  });
  
  app.delete('/invitations/:invitationId', { preHandler: [app.authenticate] }, async (request) => {
    const { invitationId } = request.params as { invitationId: string };
    await tenantModule.revokeInvitation(invitationId);
    return { success: true };
  });
  
  // Quota
  app.get('/organizations/:id/quota', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return tenantModule.getQuota(id);
  });
  
  app.get('/organizations/:id/quota/:resource', { preHandler: [app.authenticate] }, async (request) => {
    const { id, resource } = request.params as { id: string; resource: keyof any };
    return tenantModule.checkQuota(id, resource);
  });
  
  // White-label
    app.get('/organizations/:id/brand', { preHandler: [app.authenticate] }, async (request) => {
      const { id } = request.params as { id: string };
      return tenantModule.getWhiteLabelConfig(id);
    });
  
    app.put('/organizations/:id/brand', { preHandler: [app.authenticate] }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;
    
      const membership = await app.prisma.organizationMember.findFirst({
        where: { userId: user.userId, organizationId: id },
      });
      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }
    
      try {
        return tenantModule.updateWhiteLabelConfig(id, request.body as any);
      } catch (error: any) {
        if (error.message === 'CUSTOM_DOMAIN_ALREADY_IN_USE') {
          return reply.code(400).send({ error: 'Custom domain already in use' });
        }
        throw error;
      }
    });

    // Domain verification
    app.get('/organizations/:id/verify-domain', { preHandler: [app.authenticate] }, async (request) => {
      const { id } = request.params as { id: string };
      const { domain } = request.query as { domain?: string };
      return tenantModule.verifyCustomDomain(id, domain || '');
    });
  
    app.get('/organizations/:id/dns-records', { preHandler: [app.authenticate] }, async (request) => {
      const { id } = request.params as { id: string };
      return tenantModule.getDNSRecords(id);
    });
  }, { prefix: '/api/v1' });

  // Partner routes - REMOVED duplicate brand routes (already in tenant routes)
  app.register(async (app) => {
  const partnerModule = app.modules.partner;
  
  // GET /api/v1/partners
  app.get('/partners', async (request) => {
    const { page = 1, limit = 10, search, status } = request.query as any;
    return partnerModule.listPartners({ page, limit, search, status });
  });
  
  // GET /api/v1/partners/:id
  app.get('/partners/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const partner = await partnerModule.getPartner(id);
    if (!partner) return reply.code(404).send({ error: 'Partner not found' });
    return { partner };
  });
  
  // POST /api/v1/partners
  app.post('/partners', async (request, reply) => {
    try {
      const partner = await partnerModule.createPartner(request.body as any);
      return reply.code(201).send({ partner });
    } catch (error: any) {
      if (error.message === 'PARTNER_EMAIL_EXISTS') {
        return reply.code(400).send({ error: 'Partner with this email already exists' });
      }
      throw error;
    }
  });
  
  // PATCH /api/v1/partners/:id
  app.patch('/partners/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const partner = await partnerModule.updatePartner(id, request.body as any);
      return { partner };
    } catch (error: any) {
      if (error.message === 'PARTNER_EMAIL_EXISTS') {
        return reply.code(400).send({ error: 'Partner with this email already exists' });
      }
      throw error;
    }
  });
  
  // DELETE /api/v1/partners/:id
  app.delete('/partners/:id', async (request) => {
    const { id } = request.params as { id: string };
    await partnerModule.deletePartner(id);
    return { message: 'Partner deleted successfully' };
  });
  
  // License routes
  app.get('/partners/:partnerId/license', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    const license = await partnerModule.getLicense(partnerId);
    if (!license) return reply.code(404).send({ error: 'License not found' });
    return { license };
  });
  
  app.post('/partners/:partnerId/license', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    try {
      const license = await partnerModule.createOrUpdateLicense(partnerId, request.body as any);
      return { license };
    } catch (error: any) {
      if (error.message === 'PARTNER_NOT_FOUND') {
        return reply.code(404).send({ error: 'Partner not found' });
      }
      throw error;
    }
  });
  
  app.patch('/partners/:partnerId/license', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    try {
      const license = await partnerModule.updateLicense(partnerId, request.body as any);
      return { license };
    } catch (error: any) {
      if (error.message === 'PARTNER_NOT_FOUND') {
        return reply.code(404).send({ error: 'Partner not found' });
      }
      throw error;
    }
  });
  
  // Brand routes - REMOVED duplicate /organizations/:organizationId/brand (already in tenant routes)
  app.get('/partners/:partnerId/brand', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    const brand = await partnerModule.getBrandByPartner(partnerId);
    if (!brand) return reply.code(404).send({ error: 'Brand not found' });
    return { brand };
  });
  
  app.post('/partners/:partnerId/brand', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    try {
      const brand = await partnerModule.createOrUpdateBrandForPartner(partnerId, request.body as any);
      return { brand };
    } catch (error: any) {
      if (error.message === 'PARTNER_NOT_FOUND') {
        return reply.code(404).send({ error: 'Partner not found' });
      }
      if (error.message === 'CUSTOM_DOMAIN_IN_USE') {
        return reply.code(400).send({ error: 'Custom domain already in use' });
      }
      throw error;
    }
  });
  
  // Usage routes
  app.get('/organizations/:organizationId/usage', async (request) => {
    const { organizationId } = request.params as { organizationId: string };
    const { startDate, endDate, page = 1, limit = 30 } = request.query as any;
    return partnerModule.getOrganizationUsage(organizationId, { startDate, endDate, page, limit });
  });
  
  app.get('/partners/:partnerId/usage', async (request) => {
    const { partnerId } = request.params as { partnerId: string };
    const { startDate, endDate } = request.query as any;
    return partnerModule.getPartnerUsage(partnerId, { startDate, endDate });
  });
  
  app.post('/internal/usage/track', async (request, _reply) => {
    const data = request.body as any;
    const date = data.date ? new Date(data.date) : new Date();
    date.setHours(0, 0, 0, 0);
    
    // Validate required fields
    if (!data.organizationId) {
      return _reply.code(400).send({ error: 'organizationId is required' });
    }
    
    const { organizationId, messages = 0, conversations = 0, leads = 0, storageMB = 0, tokensUsed = 0, apiCalls = 0, llmCost = 0 } = data;
    
    const usage = await app.prisma.usage.upsert({
      where: {
        organizationId_date: { organizationId, date },
      },
      update: {
        messages: { increment: messages },
        conversations: { increment: conversations },
        leads: { increment: leads },
        storageMB: { increment: storageMB },
        tokensUsed: { increment: tokensUsed },
        apiCalls: { increment: apiCalls },
        llmCost: { increment: llmCost },
      },
      create: { organizationId, date, messages, conversations, leads, storageMB, tokensUsed, apiCalls, llmCost },
    });
    
    return { usage: { ...usage, date: usage.date } };
  });
  
  // Partner-Organization routes
  app.get('/partners/:partnerId/organizations', async (request) => {
    const { partnerId } = request.params as { partnerId: string };
    return partnerModule.getPartnerOrganizations(partnerId);
  });
  
  app.post('/partners/:partnerId/organizations/:organizationId', async (request) => {
    const { partnerId, organizationId } = request.params as { partnerId: string; organizationId: string };
    await partnerModule.assignOrganizationToPartner(partnerId, organizationId);
    return { success: true };
  });
  
  app.delete('/partners/:partnerId/organizations/:organizationId', async (request) => {
    const { partnerId, organizationId } = request.params as { partnerId: string; organizationId: string };
    await partnerModule.removeOrganizationFromPartner(partnerId, organizationId);
    return { success: true };
  });
}, { prefix: '/api/v1' });

// Error handler
app.setErrorHandler(errorHandler);

// Start server
const start = async () => {
  try {
    console.log('[BOOT] Starting server...');
    console.log(`[BOOT] Config: HOST=${config.HOST}, PORT=${config.PORT}`);
    await app.ready();
    console.log('[BOOT] App ready, starting listener...');
    await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`[BOOT] Server running on http://${config.HOST}:${config.PORT}`);
    console.log('[BOOT] Health endpoint: /health');
  } catch (err: unknown) {
    console.error('[BOOT] FATAL ERROR:', err instanceof Error ? err.message : String(err));
    console.error('[BOOT] Stack:', err instanceof Error ? err.stack : 'no stack');
    process.exit(1);
  }
};

export async function buildApp() {
  await app.ready();
  return app;
}

start();
export { app }; 
