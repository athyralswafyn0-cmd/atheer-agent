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
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = Fastify({ logger: true });
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
app.decorate('prisma', prisma);
app.decorate('bcrypt', bcrypt);
app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});
app.register(helmet);
app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
app.register(jwt, { secret: config.JWT_SECRET });
app.register(multipart);
app.register(staticFiles, { root: join(__dirname, 'public'), prefix: '/public/' });
app.register(cookie);
app.decorate('config', config);
authMiddleware(app);
app.register(healthRoutes);
app.register(partnersRoutes);
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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; color: #e2e8f0; }
    .container { text-align: center; padding: 2rem; max-width: 600px; }
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
    <div class="status"><span class="status-dot"></span><span class="status-text">الخادم يعمل بنجاح ✓</span></div>
    <div class="endpoints">
      <div class="endpoint"><span class="endpoint-path">GET /health</span><span class="endpoint-method">Health Check</span></div>
      <div class="endpoint"><span class="endpoint-path">GET /ready</span><span class="endpoint-method">Readiness Check</span></div>
      <div class="endpoint"><span class="endpoint-path">GET /api/v1/partners</span><span class="endpoint-method">Partners API</span></div>
      <div class="endpoint"><span class="endpoint-path">GET /api/v1/organizations</span><span class="endpoint-method">Organizations API</span></div>
      <div class="endpoint"><span class="endpoint-path">POST /api/v1/auth/login</span><span class="endpoint-method">Authentication</span></div>
      <div class="endpoint"><span class="endpoint-path">POST /api/v1/auth/register</span><span class="endpoint-method">Registration</span></div>
    </div>
    <div class="footer"><p>إصدار API: <span class="version">v1.0.0</span> | النشر: Render | الدومين: atheersolutions.online</p><p>مرحلة 2: Modular Monolith مكتملة ✓ | مرحلة 3: Microservices قيد التخطيط</p></div>
  </div>
</body>
</html>
  `);
});
// Auth routes inline
const authModule = {
    async register(data) {
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing)
            throw new Error('EMAIL_ALREADY_REGISTERED');
        const passwordHash = await bcrypt.hash(data.password, config.BCRYPT_ROUNDS);
        let organizationId;
        if (data.organizationName) {
            const org = await prisma.organization.create({
                data: { name: data.organizationName, slug: data.organizationName.toLowerCase().replace(/\s+/g, '-'), plan: 'starter' },
            });
            organizationId = org.id;
        }
        const user = await prisma.user.create({
            data: { email: data.email, passwordHash, name: data.name, role: organizationId ? 'OWNER' : 'MEMBER', organizationId },
        });
        return { user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId } };
    },
    async login(data) {
        const user = await prisma.user.findUnique({ where: { email: data.email }, include: { organization: true } });
        if (!user || !user.passwordHash)
            throw new Error('INVALID_CREDENTIALS');
        const valid = await bcrypt.compare(data.password, user.passwordHash);
        if (!valid)
            throw new Error('INVALID_CREDENTIALS');
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), loginAttempts: 0 } });
        return { user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId } };
    },
    async me(userId) {
        return prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, organizationId: true, avatar: true, emailVerified: true, lastLoginAt: true, createdAt: true } });
    },
    async logout(userId) { return { success: true }; },
    async requestPasswordReset(email) { return { message: 'If your email is registered, you will receive a password reset link' }; },
    async resetPassword(token, password) {
        const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
        if (!resetToken || resetToken.expires < new Date())
            throw new Error('INVALID_OR_EXPIRED_TOKEN');
        const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);
        await prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash, passwordResetToken: null, passwordResetExpires: null, lastPasswordChange: new Date() } });
        await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
        return { message: 'Password has been reset' };
    },
    async changePassword(userId, currentPassword, newPassword) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.passwordHash)
            throw new Error('CURRENT_PASSWORD_INCORRECT');
        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid)
            throw new Error('CURRENT_PASSWORD_INCORRECT');
        const passwordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
        await prisma.user.update({ where: { id: userId }, data: { passwordHash, lastPasswordChange: new Date() } });
        return { message: 'Password changed successfully' };
    },
    async getUserSessions(userId) { return []; },
    async revokeSession(userId, sessionId) { return { success: true }; },
    async revokeAllSessions(userId) { return { success: true }; },
};
app.post('/api/v1/auth/register', async (request, reply) => {
    try {
        const result = await authModule.register(request.body);
        const accessToken = app.jwt.sign({ userId: result.user.id, organizationId: result.user.organizationId, role: result.user.role, email: result.user.email }, { expiresIn: '7d' });
        const refreshToken = app.jwt.sign({ userId: result.user.id, type: 'refresh' }, { expiresIn: '30d' });
        return reply.code(201).send({ user: result.user, tokens: { accessToken, refreshToken, expiresIn: 7 * 24 * 60 * 60 } });
    }
    catch (error) {
        if (error.message === 'EMAIL_ALREADY_REGISTERED')
            return reply.code(409).send({ error: 'Email already registered' });
        throw error;
    }
});
app.post('/api/v1/auth/login', async (request, reply) => {
    try {
        const result = await authModule.login(request.body);
        const accessToken = app.jwt.sign({ userId: result.user.id, organizationId: result.user.organizationId, role: result.user.role, email: result.user.email, iss: 'atheer-agent' }, { expiresIn: '7d' });
        const refreshToken = app.jwt.sign({ userId: result.user.id, type: 'refresh' }, { expiresIn: '30d' });
        return { user: result.user, tokens: { accessToken, refreshToken, expiresIn: 7 * 24 * 60 * 60 } };
    }
    catch (error) {
        if (error.message === 'INVALID_CREDENTIALS')
            return reply.code(401).send({ error: 'Invalid credentials' });
        throw error;
    }
});
app.post('/api/v1/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body;
    try {
        const decoded = app.jwt.verify(refreshToken);
        if (decoded.type !== 'refresh')
            return reply.code(401).send({ error: 'Invalid token type' });
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user)
            return reply.code(401).send({ error: 'User not found' });
        const accessToken = app.jwt.sign({ userId: user.id, organizationId: user.organizationId, role: user.role, email: user.email, iss: 'atheer-agent' }, { expiresIn: '7d' });
        const newRefreshToken = app.jwt.sign({ userId: user.id, type: 'refresh' }, { expiresIn: '30d' });
        return { accessToken, refreshToken: newRefreshToken, expiresIn: 7 * 24 * 60 * 60 };
    }
    catch {
        return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }
});
app.post('/api/v1/auth/logout', { preHandler: [app.authenticate] }, async (request) => {
    await authModule.logout(request.user.userId);
    return { message: 'Logged out successfully' };
});
app.post('/api/v1/auth/forgot-password', async (request) => {
    await authModule.requestPasswordReset(request.body.email);
    return { message: 'If your email is registered, you will receive a password reset link' };
});
app.post('/api/v1/auth/reset-password', async (request, reply) => {
    try {
        await authModule.resetPassword(request.body.token, request.body.password);
        return { message: 'Password has been reset' };
    }
    catch (error) {
        if (error.message === 'INVALID_OR_EXPIRED_TOKEN')
            return reply.code(400).send({ error: 'Invalid or expired token' });
        throw error;
    }
});
app.post('/api/v1/auth/change-password', { preHandler: [app.authenticate] }, async (request, reply) => {
    try {
        await authModule.changePassword(request.user.userId, request.body.currentPassword, request.body.newPassword);
        return { message: 'Password changed successfully' };
    }
    catch (error) {
        if (error.message === 'CURRENT_PASSWORD_INCORRECT')
            return reply.code(400).send({ error: 'Current password is incorrect' });
        throw error;
    }
});
app.get('/api/v1/auth/me', { preHandler: [app.authenticate] }, async (request) => {
    const user = await prisma.user.findUnique({
        where: { id: request.user.userId },
        select: { id: true, email: true, name: true, role: true, organizationId: true, avatar: true, emailVerified: true, lastLoginAt: true, createdAt: true },
    });
    return { user };
});
app.get('/api/v1/auth/profile', { preHandler: [app.authenticate] }, async (request) => {
    const user = await prisma.user.findUnique({
        where: { id: request.user.userId },
        select: { id: true, email: true, name: true, role: true, organizationMembers: { take: 1, select: { organizationId: true } }, avatar: true, emailVerified: true, lastLoginAt: true, createdAt: true },
    });
    return { user };
});
app.get('/api/v1/auth/sessions', { preHandler: [app.authenticate] }, async (request) => {
    const sessions = await authModule.getUserSessions(request.user.userId);
    return { sessions };
});
app.delete('/api/v1/auth/sessions/:sessionId', { preHandler: [app.authenticate] }, async (request) => {
    const { sessionId } = request.params;
    await authModule.revokeSession(request.user.userId, sessionId);
    return { message: 'Session revoked' };
});
app.delete('/api/v1/auth/sessions', { preHandler: [app.authenticate] }, async (request) => {
    await authModule.revokeAllSessions(request.user.userId);
    return { message: 'All sessions revoked' };
});
// Partner routes (placeholder)
app.get('/api/v1/partners', { preHandler: [app.authenticate] }, async () => { return { partners: [] }; });
app.post('/api/v1/partners', { preHandler: [app.authenticate] }, async (request, reply) => { return reply.code(201).send({ message: 'Partner created' }); });
app.get('/api/v1/partners/:id', { preHandler: [app.authenticate] }, async (request, reply) => { return reply.code(404).send({ error: 'Not found' }); });
app.patch('/api/v1/partners/:id', { preHandler: [app.authenticate] }, async (request, reply) => { return { message: 'Updated' }; });
app.delete('/api/v1/partners/:id', { preHandler: [app.authenticate] }, async (request, reply) => { return { message: 'Deleted' }; });
// Organization routes (placeholder)
app.get('/api/v1/organizations', { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user;
    if (user.organizationId) {
        const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
        return org ? [org] : [];
    }
    return [];
});
app.post('/api/v1/organizations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user;
    if (!['PARTNER_ADMIN', 'OWNER', 'ADMIN'].includes(user.role))
        return reply.code(403).send({ error: 'Insufficient permissions' });
    const body = request.body;
    const data = { ...body, slug: body.slug || body.name.toLowerCase().replace(/\s+/g, '-') };
    const org = await prisma.organization.create({ data });
    await prisma.organizationMember.create({ data: { userId: user.userId, organizationId: org.id, role: 'OWNER' } });
    return reply.code(201).send(org);
});
app.get('/api/v1/organizations/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params;
    const org = await prisma.organization.findUnique({ where: { id } });
    return org ? org : reply.code(404).send({ error: 'Not found' });
});
app.put('/api/v1/organizations/:id', { preHandler: [app.authenticate] }, async (request, reply) => { return { message: 'Updated' }; });
app.delete('/api/v1/organizations/:id', { preHandler: [app.authenticate] }, async (request, reply) => { return { success: true }; });
// Bot routes (placeholder)
app.get('/api/v1/bots', { preHandler: [app.authenticate] }, async () => { return { bots: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }; });
app.post('/api/v1/bots', { preHandler: [app.authenticate] }, async (request, reply) => { return reply.code(201).send({ message: 'Bot created' }); });
app.get('/api/v1/bots/:id', { preHandler: [app.authenticate] }, async (request, reply) => { return reply.code(404).send({ error: 'Not found' }); });
app.patch('/api/v1/bots/:id', { preHandler: [app.authenticate] }, async (request, reply) => { return { message: 'Updated' }; });
app.delete('/api/v1/bots/:id', { preHandler: [app.authenticate] }, async (request, reply) => { return { message: 'Deleted' }; });
app.setErrorHandler(errorHandler);
const start = async () => {
    try {
        await app.ready();
        await app.listen({ port: config.PORT, host: config.HOST });
        console.log(`Server running on http://${config.HOST}:${config.PORT}`);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};
start();
export { app };
export async function buildApp() { await app.ready(); return app; }
