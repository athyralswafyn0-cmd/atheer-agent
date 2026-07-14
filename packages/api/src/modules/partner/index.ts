import { z } from 'zod';
import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { 
  PartnerModuleInterface, 
  Partner, 
  CreatePartnerInput, 
  UpdatePartnerInput,
  PartnerLicense,
  CreateLicenseInput,
  UpdateLicenseInput,
  PartnerBrand,
  CreateBrandInput,
  UsageRecord,
  UsageAggregates,
  PartnerFilters,
  UsageFilters,
  PartnerUsageFilters,
  TrackUsageInput,
  Organization,
  ModuleContext 
} from '../interfaces.js';
// ============================================
// VALIDATION SCHEMAS
// ============================================

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

const trackUsageSchema = z.object({
  organizationId: z.string().cuid(),
  date: z.string().datetime().optional(),
  messages: z.number().int().default(0),
  conversations: z.number().int().default(0),
  leads: z.number().int().default(0),
  storageMB: z.number().int().default(0),
  tokensUsed: z.number().int().default(0),
  apiCalls: z.number().int().default(0),
  llmCost: z.number().default(0),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatPartner = (p: any): Partner => ({
  id: p.id,
  name: p.name,
  email: p.email,
  isActive: p.isActive,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  license: p.license ? formatLicense(p.license) : undefined,
  brand: p.brand ? formatBrand(p.brand) : undefined,
  _count: p._count ? { organizations: p._count.organizations } : undefined,
});

const formatLicense = (l: any): PartnerLicense => ({
  id: l.id,
  plan: l.plan,
  partnerId: l.partnerId,
  expiresAt: l.expiresAt,
  maxOrganizations: l.maxOrganizations,
  maxBots: l.maxBots,
  maxUsers: l.maxUsers,
  maxMessages: l.maxMessages,
  maxStorage: l.maxStorage,
  status: l.status,
  stripeSubscriptionId: l.stripeSubscriptionId,
  stripeCustomerId: l.stripeCustomerId,
  createdAt: l.createdAt,
  updatedAt: l.updatedAt,
});

const formatBrand = (b: any): PartnerBrand => ({
  id: b.id,
  partnerId: b.partnerId,
  organizationId: b.organizationId,
  logo: b.logo,
  favicon: b.favicon,
  brandName: b.brandName,
  primaryColor: b.primaryColor,
  secondaryColor: b.secondaryColor,
  font: b.font,
  emailSender: b.emailSender,
  supportEmail: b.supportEmail,
  supportPhone: b.supportPhone,
  customDomain: b.customDomain,
  privacyPolicy: b.privacyPolicy,
  terms: b.terms,
  footer: b.footer,
  loginBackground: b.loginBackground,
  faviconDark: b.faviconDark,
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});

const formatOrganization = (org: any): Organization => ({
  id: org.id,
  name: org.name,
  slug: org.slug,
  domain: org.domain,
  logo: org.logo,
  description: org.description,
  industry: org.industry,
  size: org.size,
  website: org.website,
  email: org.email,
  phone: org.phone,
  address: org.address,
  city: org.city,
  country: org.country,
  status: org.status,
  plan: org.plan,
  settings: org.settings,
  createdAt: org.createdAt,
  updatedAt: org.updatedAt,
});

// ============================================
// PARTNER MODULE IMPLEMENTATION
// ============================================

export function createPartnerModule(context: ModuleContext): PartnerModuleInterface {
  const { prisma } = context;

  return {
    // ============================================
    // PARTNER CRUD (Super Admin)
    // ============================================
    
    async listPartners(filters: PartnerFilters) {
      const { page = 1, limit = 10, search, status } = filters;
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (status === 'active') where.isActive = true;
      if (status === 'inactive') where.isActive = false;

      const [partners, total] = await Promise.all([
        prisma.partner.findMany({
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
        prisma.partner.count({ where }),
      ]);

      return {
        partners: partners.map(formatPartner),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    },

    async getPartner(id: string) {
          const partner = await prisma.partner.findUnique({
            where: { id },
            include: {
              license: true,
              brand: true,
              organizations: {
                include: {
                  _count: { select: { bots: true, members: true } },
                },
              },
            },
          });
          return partner ? formatPartner(partner) : null;
        },

    async createPartner(input: CreatePartnerInput) {
      const data = createPartnerSchema.parse(input);
      
      const existing = await prisma.partner.findUnique({ where: { email: data.email } });
      if (existing) {
        throw new Error('PARTNER_EMAIL_EXISTS');
      }

      const passwordHash = data.password 
        ? await bcrypt.hash(data.password, 12) 
        : null;

      const partner = await prisma.partner.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
        },
      });

      return formatPartner(partner);
    },

    async updatePartner(id: string, input: UpdatePartnerInput) {
      const data = updatePartnerSchema.parse(input);

      if (data.email) {
        const existing = await prisma.partner.findUnique({ where: { email: data.email } });
        if (existing && existing.id !== id) {
          throw new Error('PARTNER_EMAIL_EXISTS');
        }
      }

      const partner = await prisma.partner.update({
        where: { id },
        data,
        include: { license: true, brand: true, _count: { select: { organizations: true } } },
      });

      return formatPartner(partner);
    },

    async deletePartner(id: string) {
      await prisma.partner.delete({ where: { id } });
    },

    // ============================================
    // LICENSE MANAGEMENT
    // ============================================

    async getLicense(partnerId: string) {
      const license = await prisma.license.findUnique({ where: { partnerId } });
      return license ? formatLicense(license) : null;
    },

    async createOrUpdateLicense(partnerId: string, input: CreateLicenseInput) {
      const data = createLicenseSchema.parse(input);
      
      const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
      if (!partner) throw new Error('PARTNER_NOT_FOUND');

      const existing = await prisma.license.findUnique({ where: { partnerId } });
      
      let license;
      if (existing) {
        license = await prisma.license.update({
          where: { partnerId },
          data: { ...data, expiresAt: new Date(data.expiresAt) },
        });
      } else {
        license = await prisma.license.create({
          data: { ...data, partnerId, expiresAt: new Date(data.expiresAt) },
        });
      }

      return formatLicense(license);
    },

    async updateLicense(partnerId: string, input: UpdateLicenseInput) {
      const data = updateLicenseSchema.parse(input);

      const updateData: any = { ...data };
      if (data.expiresAt) updateData.expiresAt = new Date(data.expiresAt);

      const license = await prisma.license.update({
        where: { partnerId },
        data: updateData,
      });

      return formatLicense(license);
    },

    // ============================================
    // BRAND MANAGEMENT (White-label)
    // ============================================

    async getBrandByPartner(partnerId: string) {
      const brand = await prisma.brand.findUnique({ where: { partnerId } });
      return brand ? formatBrand(brand) : null;
    },

    async getBrandByOrganization(organizationId: string) {
      const brand = await prisma.brand.findUnique({ where: { organizationId } });
      return brand ? formatBrand(brand) : null;
    },

    async createOrUpdateBrandForPartner(partnerId: string, input: CreateBrandInput) {
      const data = createBrandSchema.parse(input);
      
      const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
      if (!partner) throw new Error('PARTNER_NOT_FOUND');

      if (data.customDomain) {
        const existing = await prisma.brand.findFirst({
          where: { customDomain: data.customDomain, partnerId: { not: partnerId } },
        });
        if (existing) throw new Error('CUSTOM_DOMAIN_IN_USE');
      }

      const existing = await prisma.brand.findUnique({ where: { partnerId } });
      
      let brand;
      if (existing) {
        brand = await prisma.brand.update({
          where: { partnerId },
          data: { ...data, partnerId },
        });
      } else {
        brand = await prisma.brand.create({ data: { ...data, partnerId } });
      }

      return formatBrand(brand);
    },

    async createOrUpdateBrandForOrganization(organizationId: string, input: CreateBrandInput) {
      const data = createBrandSchema.parse(input);
      
      const org = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (!org) throw new Error('ORGANIZATION_NOT_FOUND');

      if (data.customDomain) {
        const existing = await prisma.brand.findFirst({
          where: { customDomain: data.customDomain, organizationId: { not: organizationId } },
        });
        if (existing) throw new Error('CUSTOM_DOMAIN_IN_USE');
      }

      const existing = await prisma.brand.findUnique({ where: { organizationId } });
      
      let brand;
      if (existing) {
        brand = await prisma.brand.update({
          where: { organizationId },
          data: { ...data, organizationId },
        });
      } else {
        brand = await prisma.brand.create({ data: { ...data, organizationId } });
      }

      return formatBrand(brand);
    },

    // ============================================
    // USAGE & METERING
    // ============================================

    async getOrganizationUsage(organizationId: string, filters: UsageFilters) {
      const { startDate, endDate, page = 1, limit = 30 } = filters;
      const where: any = { organizationId };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      const [usage, total] = await Promise.all([
        prisma.usage.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { date: 'desc' },
        }),
        prisma.usage.count({ where }),
      ]);

      const aggregates = await prisma.usage.aggregate({
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
        usage: usage.map(u => ({ ...u, date: u.date })),
        totals: aggregates._sum as UsageAggregates,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    },

    async getPartnerUsage(partnerId: string, filters: PartnerUsageFilters) {
      const { startDate, endDate } = filters;

      const organizations = await prisma.organization.findMany({
        where: {
          partners: { some: { id: partnerId } },
        },
        select: { id: true, name: true },
      });

      const orgIds = organizations.map(o => o.id);
      const where: any = { organizationId: { in: orgIds } };
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      const usage = await prisma.usage.findMany({
        where,
        include: { organization: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
      });

      // Aggregate by organization
      const byOrg: Record<string, { organization: { id: string; name: string }; totals: UsageAggregates }> = {};

      for (const u of usage) {
        if (!byOrg[u.organizationId]) {
          byOrg[u.organizationId] = { organization: u.organization ?? { id: u.organizationId, name: 'Unknown' }, totals: { messages: 0, conversations: 0, leads: 0, storageMB: 0, tokensUsed: 0, apiCalls: 0, llmCost: 0 } };
        }
        const totals = byOrg[u.organizationId]!.totals;
        for (const key of Object.keys(u) as (keyof UsageRecord)[]) {
          if (typeof u[key] === 'number' && key !== 'id' && key !== 'organizationId' && key !== 'date') {
            totals[key] = (totals[key] ?? 0) + u[key];
          }
        }
      }

      return byOrg;
    },

    async trackUsage(input: TrackUsageInput) {
      const data = trackUsageSchema.parse(input);
      const date = data.date ? new Date(data.date) : new Date();
      date.setHours(0, 0, 0, 0);

      const { organizationId, messages, conversations, leads, storageMB, tokensUsed, apiCalls, llmCost } = data;

      const usage = await prisma.usage.upsert({
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

      return { ...usage, date: usage.date };
    },

    // ============================================
    // PARTNER-ORGANIZATION RELATIONSHIP
    // ============================================

    async getPartnerOrganizations(partnerId: string) {
      const orgs = await prisma.organization.findMany({
        where: { partnerId },
        select: { id: true, name: true, slug: true, plan: true, createdAt: true },
      });
      return orgs.map(formatOrganization);
    },

    async assignOrganizationToPartner(partnerId: string, organizationId: string) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { partnerId: partnerId },
      });
    },

    async removeOrganizationFromPartner(partnerId: string, organizationId: string) {
      await prisma.organization.update({
        where: { id: organizationId },
        data: { partnerId: null },
      });
    },
  };
}

// ============================================
// PARTNER ROUTES (Fastify Plugin)
// ============================================

export const partnerRoutes: FastifyPluginAsync = async (app) => {
  const partnerModule = app.modules.partner;

  // GET /api/v1/partners - List all partners (Super Admin)
  app.get('/', async (request, _reply) => {
    const { page = 1, limit = 10, search, status } = request.query as any;
    return partnerModule.listPartners({ page, limit, search, status });
  });

  // GET /api/v1/partners/:id - Get partner by ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const partner = await partnerModule.getPartner(id);
    if (!partner) return reply.code(404).send({ error: 'Partner not found' });
    return { partner };
  });

  // POST /api/v1/partners - Create partner (Super Admin)
  app.post('/', async (request, reply) => {
    try {
      const partner = await partnerModule.createPartner(request.body as CreatePartnerInput);
      return reply.code(201).send({ partner });
    } catch (error: any) {
      if (error.message === 'PARTNER_EMAIL_EXISTS') {
        return reply.code(400).send({ error: 'Partner with this email already exists' });
      }
      throw error;
    }
  });

  // PATCH /api/v1/partners/:id - Update partner
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const partner = await partnerModule.updatePartner(id, request.body as UpdatePartnerInput);
      return { partner };
    } catch (error: any) {
      if (error.message === 'PARTNER_EMAIL_EXISTS') {
        return reply.code(400).send({ error: 'Partner with this email already exists' });
      }
      throw error;
    }
  });

  // DELETE /api/v1/partners/:id - Delete partner
  app.delete('/:id', async (request, _reply) => {
    const { id } = request.params as { id: string };
    await partnerModule.deletePartner(id);
    return { message: 'Partner deleted successfully' };
  });

  // ========== LICENSE ROUTES ==========

  // GET /api/v1/partners/:partnerId/license
  app.get('/:partnerId/license', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    const license = await partnerModule.getLicense(partnerId);
    if (!license) return reply.code(404).send({ error: 'License not found' });
    return { license };
  });

  // POST /api/v1/partners/:partnerId/license
  app.post('/:partnerId/license', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    try {
      const license = await partnerModule.createOrUpdateLicense(partnerId, request.body as CreateLicenseInput);
      return { license };
    } catch (error: any) {
      if (error.message === 'PARTNER_NOT_FOUND') {
        return reply.code(404).send({ error: 'Partner not found' });
      }
      throw error;
    }
  });

  // PATCH /api/v1/partners/:partnerId/license
  app.patch('/:partnerId/license', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    try {
      const license = await partnerModule.updateLicense(partnerId, request.body as UpdateLicenseInput);
      return { license };
    } catch (error: any) {
      if (error.message === 'PARTNER_NOT_FOUND') {
        return reply.code(404).send({ error: 'Partner not found' });
      }
      throw error;
    }
  });

  // ========== BRAND ROUTES ==========

  // GET /api/v1/partners/:partnerId/brand
  app.get('/:partnerId/brand', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    const brand = await partnerModule.getBrandByPartner(partnerId);
    if (!brand) return reply.code(404).send({ error: 'Brand not found' });
    return { brand };
  });

  // GET /api/v1/partners/organizations/:organizationId/brand
  app.get('/organizations/:organizationId/brand', async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string };
    const brand = await partnerModule.getBrandByOrganization(organizationId);
    if (!brand) return reply.code(404).send({ error: 'Brand not found' });
    return { brand };
  });

  // POST /api/v1/partners/:partnerId/brand
  app.post('/:partnerId/brand', async (request, reply) => {
    const { partnerId } = request.params as { partnerId: string };
    try {
      const brand = await partnerModule.createOrUpdateBrandForPartner(partnerId, request.body as CreateBrandInput);
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

  // POST /api/v1/partners/organizations/:organizationId/brand
  app.post('/organizations/:organizationId/brand', async (request, reply) => {
    const { organizationId } = request.params as { organizationId: string };
    try {
      const brand = await partnerModule.createOrUpdateBrandForOrganization(organizationId, request.body as CreateBrandInput);
      return { brand };
    } catch (error: any) {
      if (error.message === 'ORGANIZATION_NOT_FOUND') {
        return reply.code(404).send({ error: 'Organization not found' });
      }
      if (error.message === 'CUSTOM_DOMAIN_IN_USE') {
        return reply.code(400).send({ error: 'Custom domain already in use' });
      }
      throw error;
    }
  });

  // ========== USAGE ROUTES ==========

  // GET /api/v1/partners/organizations/:organizationId/usage
  app.get('/organizations/:organizationId/usage', async (request, _reply) => {
    const { organizationId } = request.params as { organizationId: string };
    const { startDate, endDate, page = 1, limit = 30 } = request.query as any;
    return partnerModule.getOrganizationUsage(organizationId, { startDate, endDate, page, limit });
  });

  // GET /api/v1/partners/:partnerId/usage
  app.get('/:partnerId/usage', async (request, _reply) => {
    const { partnerId } = request.params as { partnerId: string };
    const { startDate, endDate } = request.query as any;
    return partnerModule.getPartnerUsage(partnerId, { startDate, endDate });
  });

  // POST /api/v1/partners/internal/usage/track - Internal usage tracking
  app.post('/internal/usage/track', async (request, _reply) => {
    const data = trackUsageSchema.parse(request.body);
    const date = data.date ? new Date(data.date) : new Date();
    date.setHours(0, 0, 0, 0);

    const { organizationId, messages, conversations, leads, storageMB, tokensUsed, apiCalls, llmCost } = data;

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

  // ========== PARTNER-ORGANIZATION ROUTES ==========

  // GET /api/v1/partners/:partnerId/organizations
  app.get('/:partnerId/organizations', async (request, _reply) => {
    const { partnerId } = request.params as { partnerId: string };
    return partnerModule.getPartnerOrganizations(partnerId);
  });

  // POST /api/v1/partners/:partnerId/organizations/:organizationId
  app.post('/:partnerId/organizations/:organizationId', async (request, _reply) => {
    const { partnerId, organizationId } = request.params as { partnerId: string; organizationId: string };
    await partnerModule.assignOrganizationToPartner(partnerId, organizationId);
    return { success: true };
  });

  // DELETE /api/v1/partners/:partnerId/organizations/:organizationId
  app.delete('/:partnerId/organizations/:organizationId', async (request, _reply) => {
    const { partnerId, organizationId } = request.params as { partnerId: string; organizationId: string };
    await partnerModule.removeOrganizationFromPartner(partnerId, organizationId);
    return { success: true };
  });
};

export default partnerRoutes;