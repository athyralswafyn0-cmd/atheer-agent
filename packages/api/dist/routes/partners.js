import { z } from 'zod';
const createPartnerSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).optional(),
});
const updatePartnerSchema = createPartnerSchema.partial();
export const partnersRoutes = async (app) => {
    // ===== GET /api/v1/partners =====
    app.get('/', { preHandler: [app.authenticate] }, async (request) => {
        const user = request.user;
        if (!user || !user.organizationId) {
            return [];
        }
        const partner = await app.prisma.partner.findFirst({
            where: {
                organizations: {
                    some: {
                        id: user.organizationId,
                    },
                },
            },
        });
        return partner ? [partner] : [];
    });
    // ===== POST /api/v1/partners =====
    app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const data = createPartnerSchema.parse(request.body);
        const partner = await app.prisma.partner.create({
            data: {
                name: data.name,
                email: data.email,
                ...(data.password && { passwordHash: await app.bcrypt.hash(data.password, 10) }),
                organizations: {
                    connect: { id: user.organizationId },
                },
            },
        });
        return reply.code(201).send(partner);
    });
    // ===== GET /api/v1/partners/profile =====
    app.get('/profile', { preHandler: [app.authenticate] }, async (request, reply) => {
        const user = request.user;
        if (!user) {
            return reply.code(401).send({ error: 'User not found' });
        }
        const dbUser = await app.prisma.user.findUnique({
            where: { id: user.userId },
            select: { id: true, email: true, name: true, role: true, organizationId: true },
        });
        if (!dbUser) {
            return reply.code(404).send({ error: 'User not found' });
        }
        return dbUser;
    });
    // ===== GET /api/v1/partners/organizations =====
    app.get('/organizations', { preHandler: [app.authenticate] }, async (request, reply) => {
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const orgs = await app.prisma.organization.findMany({
            where: { partnerId: user.organizationId },
            select: { id: true, name: true, slug: true, plan: true, createdAt: true },
        });
        return orgs;
    });
    // ===== GET /api/v1/partners/license =====
    app.get('/license', { preHandler: [app.authenticate] }, async (request, reply) => {
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const org = await app.prisma.organization.findUnique({
            where: { id: user.organizationId },
            select: { license: true },
        });
        if (!org || !org.license) {
            return reply.code(404).send({ error: 'License not found' });
        }
        const license = org.license;
        return {
            plan: license.plan,
            status: license.status,
            startsAt: license.createdAt.toISOString(),
            expiresAt: license.expiresAt.toISOString(),
        };
    });
    // ===== GET /api/v1/partners/usage/summary =====
    app.get('/usage/summary', { preHandler: [app.authenticate] }, async (request) => {
        const user = request.user;
        if (!user || !user.organizationId) {
            return {
                totalOrganizations: 0,
                totalBots: 0,
                totalConversations: 0,
                totalMessages: 0,
                totalLeads: 0,
            };
        }
        const orgs = await app.prisma.organization.findMany({
            where: { partnerId: user.organizationId },
            select: { id: true },
        });
        const orgIds = orgs.map(o => o.id);
        const [totalBots, totalConversations, totalMessages, totalLeads] = await Promise.all([
            app.prisma.bot.count({ where: { organizationId: { in: orgIds } } }),
            app.prisma.conversation.count({ where: { bot: { organizationId: { in: orgIds } } } }),
            app.prisma.message.count({ where: { conversation: { bot: { organizationId: { in: orgIds } } } } }),
            app.prisma.lead.count({ where: { organizationId: { in: orgIds } } }),
        ]);
        return {
            totalOrganizations: orgIds.length,
            totalBots,
            totalConversations,
            totalMessages,
            totalLeads,
        };
    });
    // ===== GET /api/v1/partners/invoices =====
    app.get('/invoices', { preHandler: [app.authenticate] }, async (request, reply) => {
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        // No Invoice model in schema - return empty array for now
        // TODO: Add Invoice model to Prisma schema
        return [];
    });
    // ===== GET /api/v1/partners/:id =====
    app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const partner = await app.prisma.partner.findFirst({
            where: {
                id,
                organizations: { some: { id: user.organizationId } },
            },
        });
        if (!partner) {
            return reply.code(404).send({ error: 'Partner not found' });
        }
        return partner;
    });
    // ===== PUT /api/v1/partners/:id =====
    app.put('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        const data = updatePartnerSchema.parse(request.body);
        const partner = await app.prisma.partner.update({
            where: { id },
            data,
        });
        return partner;
    });
    // ===== DELETE /api/v1/partners/:id =====
    app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        await app.prisma.partner.delete({
            where: { id },
        });
        return { success: true };
    });
};
