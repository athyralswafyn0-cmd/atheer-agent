import { z } from 'zod';
const createPartnerSchema = z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).optional(),
});
const updatePartnerSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().optional(),
    isActive: z.boolean().optional(),
});
const createLicenseSchema = z.object({
    plan: z.enum(['starter', 'professional', 'enterprise']),
    expiresAt: z.string().datetime(),
    maxOrganizations: z.number().int().positive().default(10),
    maxBots: z.number().int().positive().default(50),
    maxUsers: z.number().int().positive().default(100),
    maxMessages: z.number().int().positive().default(100000),
    maxStorage: z.number().int().positive().default(10000),
});
const updateLicenseSchema = z.object({
    plan: z.enum(['starter', 'professional', 'enterprise']).optional(),
    expiresAt: z.string().datetime().optional(),
    maxOrganizations: z.number().int().positive().optional(),
    maxBots: z.number().int().positive().optional(),
    maxUsers: z.number().int().positive().optional(),
    maxMessages: z.number().int().positive().optional(),
    maxStorage: z.number().int().positive().optional(),
    status: z.enum(['active', 'expired', 'suspended']).optional(),
    stripeSubscriptionId: z.string().optional(),
    stripeCustomerId: z.string().optional(),
});
const createBrandSchema = z.object({
    partnerId: z.string().cuid().optional(),
    organizationId: z.string().cuid().optional(),
    logo: z.string().url().optional(),
    favicon: z.string().url().optional(),
    brandName: z.string().max(100).optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#2563eb'),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
    font: z.string().optional(),
    emailSender: z.string().email().optional(),
    supportEmail: z.string().email().optional(),
    supportPhone: z.string().optional(),
    customDomain: z.string().optional(),
    privacyPolicy: z.string().optional(),
    terms: z.string().optional(),
    footer: z.string().optional(),
    loginBackground: z.string().url().optional(),
    faviconDark: z.string().url().optional(),
});
const updateBrandSchema = createBrandSchema.partial();
export const partnerRoutes = async (app) => {
    // ========== PARTNER ROUTES ==========
    // Get all partners (Super Admin only)
    app.get('/', async (request, _reply) => {
        const { page = 1, limit = 10, search, status } = request.query;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (status === 'active')
            where.isActive = true;
        if (status === 'inactive')
            where.isActive = false;
        const [partners, total] = await Promise.all([
            app.prisma.partner.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    license: true,
                    brand: true,
                    _count: { select: { organizations: true } },
                },
            }),
            app.prisma.partner.count({ where }),
        ]);
        return { partners, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    });
    // Get partner by ID
    app.get('/:id', async (request, reply) => {
        const { id } = request.params;
        const partner = await app.prisma.partner.findUnique({
            where: { id },
            include: {
                license: true,
                brand: true,
                organizations: {
                    include: {
                        _count: { select: { bots: true, users: true } },
                    },
                },
            },
        });
        if (!partner) {
            return reply.code(404).send({ error: 'Partner not found' });
        }
        return { partner };
    });
    // Create partner (Super Admin only)
    app.post('/', async (request, reply) => {
        const data = createPartnerSchema.parse(request.body);
        const existing = await app.prisma.partner.findUnique({ where: { email: data.email } });
        if (existing) {
            return reply.code(400).send({ error: 'Partner with this email already exists' });
        }
        const passwordHash = data.password ? await app.bcrypt.hash(data.password, 10) : null;
        const partner = await app.prisma.partner.create({
            data: {
                name: data.name,
                email: data.email,
                passwordHash,
            },
        });
        return reply.code(201).send({ partner });
    });
    // Update partner
    app.patch('/:id', async (request, _reply) => {
        const { id } = request.params;
        const data = updatePartnerSchema.parse(request.body);
        const partner = await app.prisma.partner.update({
            where: { id },
            data,
        });
        return { partner };
    });
    // Delete partner
    app.delete('/:id', async (request, _reply) => {
        const { id } = request.params;
        await app.prisma.partner.delete({ where: { id } });
        return { message: 'Partner deleted successfully' };
    });
    // ========== LICENSE ROUTES ==========
    // Get license by partner ID
    app.get('/:partnerId/license', async (request, reply) => {
        const { partnerId } = request.params;
        const license = await app.prisma.license.findUnique({
            where: { partnerId },
            include: { partner: true },
        });
        if (!license) {
            return reply.code(404).send({ error: 'License not found' });
        }
        return { license };
    });
    // Create/Update license for partner
    app.post('/:partnerId/license', async (request, reply) => {
        const { partnerId } = request.params;
        const data = createLicenseSchema.parse(request.body);
        const partner = await app.prisma.partner.findUnique({ where: { id: partnerId } });
        if (!partner) {
            return reply.code(404).send({ error: 'Partner not found' });
        }
        const existing = await app.prisma.license.findUnique({ where: { partnerId } });
        let license;
        if (existing) {
            license = await app.prisma.license.update({
                where: { partnerId },
                data,
            });
        }
        else {
            license = await app.prisma.license.create({
                data: { ...data, partner: { connect: { id: partnerId } } },
            });
        }
        return { license };
    });
    // Update license
    app.patch('/:partnerId/license', async (request, _reply) => {
        const { partnerId } = request.params;
        const data = updateLicenseSchema.parse(request.body);
        const license = await app.prisma.license.update({
            where: { partnerId },
            data,
        });
        return { license };
    });
    // ========== BRAND ROUTES ==========
    // Get brand by partner ID
    app.get('/:partnerId/brand', async (request, reply) => {
        const { partnerId } = request.params;
        const brand = await app.prisma.brand.findUnique({
            where: { partnerId },
        });
        if (!brand) {
            return reply.code(404).send({ error: 'Brand not found' });
        }
        return { brand };
    });
    // Get brand by organization ID
    app.get('/organizations/:organizationId/brand', async (request, reply) => {
        const { organizationId } = request.params;
        const brand = await app.prisma.brand.findUnique({
            where: { organizationId },
        });
        if (!brand) {
            return reply.code(404).send({ error: 'Brand not found' });
        }
        return { brand };
    });
    // Create/Update brand for partner
    app.post('/:partnerId/brand', async (request, reply) => {
        const { partnerId } = request.params;
        const data = createBrandSchema.parse(request.body);
        const partner = await app.prisma.partner.findUnique({ where: { id: partnerId } });
        if (!partner) {
            return reply.code(404).send({ error: 'Partner not found' });
        }
        const existing = await app.prisma.brand.findUnique({ where: { partnerId } });
        let brand;
        if (existing) {
            brand = await app.prisma.brand.update({
                where: { partnerId },
                data,
            });
        }
        else {
            brand = await app.prisma.brand.create({
                data: { ...data, partnerId },
            });
        }
        return { brand };
    });
    // Update brand
    app.patch('/:partnerId/brand', async (request, _reply) => {
        const { partnerId } = request.params;
        const data = updateBrandSchema.parse(request.body);
        const brand = await app.prisma.brand.update({
            where: { partnerId },
            data,
        });
        return { brand };
    });
    // Create/Update brand for organization (White Label)
    app.post('/organizations/:organizationId/brand', async (request, reply) => {
        const { organizationId } = request.params;
        const data = createBrandSchema.parse(request.body);
        const organization = await app.prisma.organization.findUnique({ where: { id: organizationId } });
        if (!organization) {
            return reply.code(404).send({ error: 'Organization not found' });
        }
        const existing = await app.prisma.brand.findUnique({ where: { organizationId } });
        let brand;
        if (existing) {
            brand = await app.prisma.brand.update({
                where: { organizationId },
                data,
            });
        }
        else {
            brand = await app.prisma.brand.create({
                data: { ...data, organizationId },
            });
        }
        return { brand };
    });
    // ========== USAGE ROUTES ==========
    // Get usage for organization
    app.get('/organizations/:organizationId/usage', async (request, _reply) => {
        const { organizationId } = request.params;
        const { startDate, endDate, page = 1, limit = 30 } = request.query;
        const where = { organizationId };
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        const [usage, total] = await Promise.all([
            app.prisma.usage.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { date: 'desc' },
            }),
            app.prisma.usage.count({ where }),
        ]);
        // Get aggregated totals
        const aggregates = await app.prisma.usage.aggregate({
            where: { organizationId, ...(startDate || endDate ? { date: where.date } : {}) },
            _sum: {
                messages: true,
                conversations: true,
                leads: true,
                storageMB: true,
                tokensUsed: true,
                apiCalls: true,
                llmCost: true,
            },
        });
        return {
            usage,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
            totals: aggregates._sum,
        };
    });
    // Get usage summary for partner (all organizations)
    app.get('/:partnerId/usage', async (request, _reply) => {
        const { partnerId } = request.params;
        const { startDate, endDate } = request.query;
        const organizations = await app.prisma.organization.findMany({
            where: {
                partners: {
                    some: {
                        id: partnerId
                    }
                }
            },
            select: { id: true, name: true }
        });
        const orgIds = organizations.map(o => o.id);
        const where = { organizationId: { in: orgIds } };
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        const usage = await app.prisma.usage.findMany({
            where,
            include: { organization: { select: { id: true, name: true } } },
            orderBy: { date: 'desc' },
        });
        // Aggregate by organization
        const byOrg = usage.reduce((acc, u) => {
            if (!acc[u.organizationId]) {
                acc[u.organizationId] = { organization: u.organization, totals: {} };
            }
            acc[u.organizationId].totals = {
                messages: (acc[u.organizationId].totals.messages || 0) + u.messages,
                conversations: (acc[u.organizationId].totals.conversations || 0) + u.conversations,
                leads: (acc[u.organizationId].totals.leads || 0) + u.leads,
                storageMB: (acc[u.organizationId].totals.storageMB || 0) + u.storageMB,
                tokensUsed: (acc[u.organizationId].totals.tokensUsed || 0) + u.tokensUsed,
                apiCalls: (acc[u.organizationId].totals.apiCalls || 0) + u.apiCalls,
                llmCost: (acc[u.organizationId].totals.llmCost || 0) + u.llmCost,
            };
            return acc;
        }, {});
        return { usage: Object.values(byOrg) };
    });
    // Track usage (internal)
    app.post('/internal/usage/track', async (request, _reply) => {
        const data = z.object({
            organizationId: z.string().cuid(),
            date: z.string().datetime().optional(),
            messages: z.number().int().default(0),
            conversations: z.number().int().default(0),
            leads: z.number().int().default(0),
            storageMB: z.number().int().default(0),
            tokensUsed: z.number().int().default(0),
            apiCalls: z.number().int().default(0),
            llmCost: z.number().default(0),
        }).parse(request.body);
        const date = data.date ? new Date(data.date) : new Date();
        date.setHours(0, 0, 0, 0);
        const usage = await app.prisma.usage.upsert({
            where: {
                organizationId_date: {
                    organizationId: data.organizationId,
                    date,
                },
            },
            update: {
                messages: { increment: data.messages },
                conversations: { increment: data.conversations },
                leads: { increment: data.leads },
                storageMB: { increment: data.storageMB },
                tokensUsed: { increment: data.tokensUsed },
                apiCalls: { increment: data.apiCalls },
                llmCost: { increment: data.llmCost },
            },
            create: {
                organizationId: data.organizationId,
                date,
                messages: data.messages,
                conversations: data.conversations,
                leads: data.leads,
                storageMB: data.storageMB,
                tokensUsed: data.tokensUsed,
                apiCalls: data.apiCalls,
                llmCost: data.llmCost,
            },
        });
        return { usage };
    });
};
