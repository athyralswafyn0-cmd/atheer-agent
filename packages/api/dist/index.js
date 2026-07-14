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
await initializeModules(app);
// Register routes
app.register(healthRoutes);
app.register(partnersRoutes);
// Auth Module routes (from Modular Monolith)
const authModule = app.modules.auth;
app.post('/api/v1/auth/register', async (request, reply) => {
    try {
        const result = await authModule.register(request.body);
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
    }
    catch (error) {
        if (error.message === 'EMAIL_ALREADY_REGISTERED') {
            return reply.code(409).send({ error: 'Email already registered' });
        }
        throw error;
    }
});
app.post('/api/v1/auth/login', async (request, reply) => {
    try {
        const result = await authModule.login(request.body);
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
    }
    catch (error) {
        if (error.message === 'INVALID_CREDENTIALS' || error.message === 'USER_MISSING_ORGANIZATION') {
            return reply.code(401).send({ error: 'Invalid credentials' });
        }
        throw error;
    }
});
app.post('/api/v1/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body;
    try {
        const decoded = app.jwt.verify(refreshToken);
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
    }
    catch {
        return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }
});
app.post('/api/v1/auth/logout', { preHandler: [app.authenticate] }, async (request, _reply) => {
    await authModule.logout(request.user.userId);
    return { message: 'Logged out successfully' };
});
app.post('/api/v1/auth/forgot-password', async (request, _reply) => {
    await authModule.requestPasswordReset(request.body.email);
    return { message: 'If your email is registered, you will receive a password reset link' };
});
app.post('/api/v1/auth/reset-password', async (request, reply) => {
    try {
        await authModule.resetPassword(request.body.token, request.body.password);
        return { message: 'Password has been reset' };
    }
    catch (error) {
        if (error.message === 'INVALID_OR_EXPIRED_TOKEN') {
            return reply.code(400).send({ error: 'Invalid or expired token' });
        }
        throw error;
    }
});
app.post('/api/v1/auth/change-password', { preHandler: [app.authenticate] }, async (request, _reply) => {
    try {
        await authModule.changePassword(request.user.userId, request.body.currentPassword, request.body.newPassword);
        return { message: 'Password changed successfully' };
    }
    catch (error) {
        if (error.message === 'CURRENT_PASSWORD_INCORRECT') {
            return _reply.code(400).send({ error: 'Current password is incorrect' });
        }
        throw error;
    }
});
app.get('/api/v1/auth/me', { preHandler: [app.authenticate] }, async (request) => {
    const user = await app.prisma.user.findUnique({
        where: { id: request.user.userId },
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
        where: { id: request.user.userId },
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
    const sessions = await authModule.getUserSessions(request.user.userId);
    return { sessions };
});
app.delete('/api/v1/auth/sessions/:sessionId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { sessionId } = request.params;
    await authModule.revokeSession(request.user.userId, sessionId);
    return { message: 'Session revoked' };
});
app.delete('/api/v1/auth/sessions', { preHandler: [app.authenticate] }, async (request) => {
    await authModule.revokeAllSessions(request.user.userId);
    return { message: 'All sessions revoked' };
});
// New Modular Monolith routes (Stage 2)
// Bot routes
app.register(async (app) => {
    const botModule = app.modules.bot;
    // GET /api/v1/bots - List bots
    app.get('/bots', { preHandler: [app.authenticate] }, async (request) => {
        const user = request.user;
        const { status, type, search, page = 1, limit = 10 } = request.query;
        if (!user.organizationId)
            return { bots: [], pagination: { page, limit, total: 0, totalPages: 0 } };
        return botModule.getBotByOrganization(user.organizationId, { status, type, search, page, limit });
    });
    // POST /api/v1/bots - Create bot
    app.post('/bots', { preHandler: [app.authenticate] }, async (request, reply) => {
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        try {
            const bot = await botModule.createBot(user.organizationId, user.userId, request.body);
            return reply.code(201).send(bot);
        }
        catch (error) {
            throw error;
        }
    });
    // GET /api/v1/bots/:id - Get bot by ID
    app.get('/bots/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const bot = await botModule.getBot(id, user.organizationId);
        if (!bot)
            return reply.code(404).send({ error: 'Bot not found' });
        return { bot };
    });
    // PATCH /api/v1/bots/:id - Update bot
    app.patch('/bots/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        try {
            const bot = await botModule.updateBot(id, user.organizationId, request.body);
            return { bot };
        }
        catch (error) {
            throw error;
        }
    });
    // DELETE /api/v1/bots/:id - Delete bot
    app.delete('/bots/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        await botModule.deleteBot(id, user.organizationId);
        return { message: 'Bot deleted successfully' };
    });
    // POST /api/v1/bots/:id/activate - Activate bot
    app.post('/bots/:id/activate', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const bot = await botModule.activateBot(id, user.organizationId);
        return { bot };
    });
    // POST /api/v1/bots/:id/deactivate - Deactivate bot
    app.post('/bots/:id/deactivate', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const bot = await botModule.deactivateBot(id, user.organizationId);
        return { bot };
    });
    // GET /api/v1/bots/:id/config - Get bot config
    app.get('/bots/:id/config', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const config = await botModule.getBotConfig(id);
        if (!config)
            return reply.code(404).send({ error: 'Bot config not found' });
        return { config };
    });
    // PUT /api/v1/bots/:id/config - Update bot config
    app.put('/bots/:id/config', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const config = await botModule.updateBotConfig(id, request.body);
        return { config };
    });
    // ========== KNOWLEDGE BASE ROUTES ==========
    // GET /api/v1/bots/:id/knowledge-bases - List knowledge bases
    app.get('/bots/:id/knowledge-bases', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const bot = await botModule.getBot(id, user.organizationId);
        if (!bot)
            return reply.code(404).send({ error: 'Bot not found' });
        const kbs = await botModule.getKnowledgeBases(id);
        return { knowledgeBases: kbs };
    });
    // POST /api/v1/bots/:id/knowledge-bases - Create knowledge base
    app.post('/bots/:id/knowledge-bases', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const bot = await botModule.getBot(id, user.organizationId);
        if (!bot)
            return reply.code(404).send({ error: 'Bot not found' });
        const kb = await botModule.createKnowledgeBase(id, request.body);
        return reply.code(201).send(kb);
    });
    // PUT /api/v1/bots/:id/knowledge-bases/:kbId - Update knowledge base
    app.put('/bots/:id/knowledge-bases/:kbId', { preHandler: [app.authenticate] }, async (request, _reply) => {
        const { kbId } = request.params;
        const kb = await botModule.updateKnowledgeBase(kbId, request.body);
        return { kb };
    });
    // DELETE /api/v1/bots/:id/knowledge-bases/:kbId - Delete knowledge base
    app.delete('/bots/:id/knowledge-bases/:kbId', { preHandler: [app.authenticate] }, async (request, _reply) => {
        const { kbId } = request.params;
        await botModule.deleteKnowledgeBase(kbId);
        return { message: 'Knowledge base deleted successfully' };
    });
    // ========== TRAINING ROUTES ==========
    // POST /api/v1/bots/:id/training - Start training
    app.post('/bots/:id/training', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const job = await botModule.startTraining(id, user.organizationId);
        return reply.code(201).send(job);
    });
    // GET /api/v1/bots/:id/training/:jobId - Get training status
    app.get('/bots/:id/training/:jobId', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { jobId } = request.params;
        const job = await botModule.getTrainingStatus(jobId);
        if (!job)
            return reply.code(404).send({ error: 'Training job not found' });
        return { job };
    });
    // GET /api/v1/bots/:id/training - Get training history
    app.get('/bots/:id/training', { preHandler: [app.authenticate] }, async (request, _reply) => {
        const { id } = request.params;
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
        const { id } = request.params;
        const { messages } = request.body;
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const bot = await botModule.getBot(id, user.organizationId);
        if (!bot)
            return reply.code(404).send({ error: 'Bot not found' });
        const result = await botModule.routeRequest(id, messages);
        return { result };
    });
    // ========== EMBED SCRIPT ==========
    // GET /api/v1/bots/:id/embed - Get embed script
    app.get('/bots/:id/embed', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const { domain } = request.query;
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const bot = await botModule.getBot(id, user.organizationId);
        if (!bot)
            return reply.code(404).send({ error: 'Bot not found' });
        const script = await botModule.getEmbedScript(id, domain);
        return { script };
    });
    // POST /api/v1/bots/:id/embed/validate - Validate embed domain
    app.post('/bots/:id/embed/validate', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const { domain } = request.body;
        const user = request.user;
        if (!user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const bot = await botModule.getBot(id, user.organizationId);
        if (!bot)
            return reply.code(404).send({ error: 'Bot not found' });
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
        const user = request.user;
        const { status, plan, search, page = 1, limit = 10 } = request.query;
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
        const user = request.user;
        if (user.role !== 'PARTNER_ADMIN' && user.role !== 'OWNER' && user.role !== 'ADMIN') {
            return reply.code(403).send({ error: 'Insufficient permissions' });
        }
        try {
            const org = await tenantModule.createOrganization(request.body, user.id);
            return reply.code(201).send(org);
        }
        catch (error) {
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
        const { id } = request.params;
        const user = request.user;
        // Check if user is a member of this organization
        const membership = await app.prisma.organizationMember.findFirst({
            where: { userId: user.userId, organizationId: id },
        });
        if (!membership) {
            return reply.code(403).send({ error: 'Forbidden - not a member of this organization' });
        }
        const organization = await tenantModule.getOrganization(id);
        if (!organization)
            return reply.code(404).send({ error: 'Organization not found' });
        return organization;
    });
    // PUT /api/v1/organizations/:id
    app.put('/organizations/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        try {
            const org = await tenantModule.updateOrganization(id, request.body, user.id);
            return org;
        }
        catch (error) {
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
        const { id } = request.params;
        const user = request.user;
        try {
            await tenantModule.deleteOrganization(id, user.id);
            return { success: true };
        }
        catch (error) {
            if (error.message === 'ONLY_OWNER_CAN_DELETE') {
                return reply.code(403).send({ error: 'Only the organization owner can delete it' });
            }
            throw error;
        }
    });
    // GET /api/v1/organizations/:id/members
    app.get('/organizations/:id/members', { preHandler: [app.authenticate] }, async (request) => {
        const { id } = request.params;
        return tenantModule.getMembers(id);
    });
    // POST /api/v1/organizations/:id/members
    app.post('/organizations/:id/members', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        const membership = await app.prisma.organizationMember.findFirst({
            where: { userId: user.userId, organizationId: id },
        });
        if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
            return reply.code(403).send({ error: 'Insufficient permissions' });
        }
        // Find or create user by email
        const { email, role } = request.body;
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
        const { id, userId: memberUserId } = request.params;
        const user = request.user;
        const membership = await app.prisma.organizationMember.findFirst({
            where: { userId: user.userId, organizationId: id },
        });
        if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
            return reply.code(403).send({ error: 'Insufficient permissions' });
        }
        const { role } = request.body;
        const member = await tenantModule.updateMemberRole(id, memberUserId, role);
        return member;
    });
    // DELETE /api/v1/organizations/:id/members/:userId
    app.delete('/organizations/:id/members/:userId', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id, userId: memberUserId } = request.params;
        const user = request.user;
        try {
            await tenantModule.removeMember(id, memberUserId, user.userId);
            return { success: true };
        }
        catch (error) {
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
        const { id } = request.params;
        const user = request.user;
        const membership = await app.prisma.organizationMember.findFirst({
            where: { userId: user.userId, organizationId: id },
        });
        if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
            return reply.code(403).send({ error: 'Insufficient permissions' });
        }
        try {
            const invitation = await tenantModule.inviteMember({
                ...request.body,
                organizationId: id,
                invitedBy: user.id,
            });
            return invitation;
        }
        catch (error) {
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
        const { id } = request.params;
        return tenantModule.listInvitations(id);
    });
    app.delete('/invitations/:invitationId', { preHandler: [app.authenticate] }, async (request) => {
        const { invitationId } = request.params;
        await tenantModule.revokeInvitation(invitationId);
        return { success: true };
    });
    // Quota
    app.get('/organizations/:id/quota', { preHandler: [app.authenticate] }, async (request) => {
        const { id } = request.params;
        return tenantModule.getQuota(id);
    });
    app.get('/organizations/:id/quota/:resource', { preHandler: [app.authenticate] }, async (request) => {
        const { id, resource } = request.params;
        return tenantModule.checkQuota(id, resource);
    });
    // White-label
    app.get('/organizations/:id/brand', { preHandler: [app.authenticate] }, async (request) => {
        const { id } = request.params;
        return tenantModule.getWhiteLabelConfig(id);
    });
    app.put('/organizations/:id/brand', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        const membership = await app.prisma.organizationMember.findFirst({
            where: { userId: user.userId, organizationId: id },
        });
        if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
            return reply.code(403).send({ error: 'Insufficient permissions' });
        }
        try {
            return tenantModule.updateWhiteLabelConfig(id, request.body);
        }
        catch (error) {
            if (error.message === 'CUSTOM_DOMAIN_ALREADY_IN_USE') {
                return reply.code(400).send({ error: 'Custom domain already in use' });
            }
            throw error;
        }
    });
    // Domain verification
    app.get('/organizations/:id/verify-domain', { preHandler: [app.authenticate] }, async (request) => {
        const { id } = request.params;
        const { domain } = request.query;
        return tenantModule.verifyCustomDomain(id, domain || '');
    });
    app.get('/organizations/:id/dns-records', { preHandler: [app.authenticate] }, async (request) => {
        const { id } = request.params;
        return tenantModule.getDNSRecords(id);
    });
}, { prefix: '/api/v1' });
// Partner routes - REMOVED duplicate brand routes (already in tenant routes)
app.register(async (app) => {
    const partnerModule = app.modules.partner;
    // GET /api/v1/partners
    app.get('/partners', async (request) => {
        const { page = 1, limit = 10, search, status } = request.query;
        return partnerModule.listPartners({ page, limit, search, status });
    });
    // GET /api/v1/partners/:id
    app.get('/partners/:id', async (request, reply) => {
        const { id } = request.params;
        const partner = await partnerModule.getPartner(id);
        if (!partner)
            return reply.code(404).send({ error: 'Partner not found' });
        return { partner };
    });
    // POST /api/v1/partners
    app.post('/partners', async (request, reply) => {
        try {
            const partner = await partnerModule.createPartner(request.body);
            return reply.code(201).send({ partner });
        }
        catch (error) {
            if (error.message === 'PARTNER_EMAIL_EXISTS') {
                return reply.code(400).send({ error: 'Partner with this email already exists' });
            }
            throw error;
        }
    });
    // PATCH /api/v1/partners/:id
    app.patch('/partners/:id', async (request, reply) => {
        const { id } = request.params;
        try {
            const partner = await partnerModule.updatePartner(id, request.body);
            return { partner };
        }
        catch (error) {
            if (error.message === 'PARTNER_EMAIL_EXISTS') {
                return reply.code(400).send({ error: 'Partner with this email already exists' });
            }
            throw error;
        }
    });
    // DELETE /api/v1/partners/:id
    app.delete('/partners/:id', async (request) => {
        const { id } = request.params;
        await partnerModule.deletePartner(id);
        return { message: 'Partner deleted successfully' };
    });
    // License routes
    app.get('/partners/:partnerId/license', async (request, reply) => {
        const { partnerId } = request.params;
        const license = await partnerModule.getLicense(partnerId);
        if (!license)
            return reply.code(404).send({ error: 'License not found' });
        return { license };
    });
    app.post('/partners/:partnerId/license', async (request, reply) => {
        const { partnerId } = request.params;
        try {
            const license = await partnerModule.createOrUpdateLicense(partnerId, request.body);
            return { license };
        }
        catch (error) {
            if (error.message === 'PARTNER_NOT_FOUND') {
                return reply.code(404).send({ error: 'Partner not found' });
            }
            throw error;
        }
    });
    app.patch('/partners/:partnerId/license', async (request, reply) => {
        const { partnerId } = request.params;
        try {
            const license = await partnerModule.updateLicense(partnerId, request.body);
            return { license };
        }
        catch (error) {
            if (error.message === 'PARTNER_NOT_FOUND') {
                return reply.code(404).send({ error: 'Partner not found' });
            }
            throw error;
        }
    });
    // Brand routes - REMOVED duplicate /organizations/:organizationId/brand (already in tenant routes)
    app.get('/partners/:partnerId/brand', async (request, reply) => {
        const { partnerId } = request.params;
        const brand = await partnerModule.getBrandByPartner(partnerId);
        if (!brand)
            return reply.code(404).send({ error: 'Brand not found' });
        return { brand };
    });
    app.post('/partners/:partnerId/brand', async (request, reply) => {
        const { partnerId } = request.params;
        try {
            const brand = await partnerModule.createOrUpdateBrandForPartner(partnerId, request.body);
            return { brand };
        }
        catch (error) {
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
        const { organizationId } = request.params;
        const { startDate, endDate, page = 1, limit = 30 } = request.query;
        return partnerModule.getOrganizationUsage(organizationId, { startDate, endDate, page, limit });
    });
    app.get('/partners/:partnerId/usage', async (request) => {
        const { partnerId } = request.params;
        const { startDate, endDate } = request.query;
        return partnerModule.getPartnerUsage(partnerId, { startDate, endDate });
    });
    app.post('/internal/usage/track', async (request, _reply) => {
        const data = request.body;
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
        const { partnerId } = request.params;
        return partnerModule.getPartnerOrganizations(partnerId);
    });
    app.post('/partners/:partnerId/organizations/:organizationId', async (request) => {
        const { partnerId, organizationId } = request.params;
        await partnerModule.assignOrganizationToPartner(partnerId, organizationId);
        return { success: true };
    });
    app.delete('/partners/:partnerId/organizations/:organizationId', async (request) => {
        const { partnerId, organizationId } = request.params;
        await partnerModule.removeOrganizationFromPartner(partnerId, organizationId);
        return { success: true };
    });
}, { prefix: '/api/v1' });
// Error handler
app.setErrorHandler(errorHandler);
// Start server
const start = async () => {
    try {
        await app.ready();
        await app.listen({ port: config.PORT, host: config.HOST });
        console.log(`Server running on http://${config.HOST}:${config.PORT}`);
    }
    catch (err) {
        app.log.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
};
export async function buildApp() {
    await app.ready();
    return app;
}
start();
export { app };
