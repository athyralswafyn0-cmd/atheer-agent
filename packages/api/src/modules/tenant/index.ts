import { z } from 'zod';
import { FastifyPluginAsync } from 'fastify';
import { 
  TenantModuleInterface, 
  Organization, 
  OrganizationInput, 
  UpdateOrganizationInput, 
  Invitation, 
  InvitationInput, 
  QuotaConfig, 
  WhiteLabelConfig, 
  DNSRecord, 
  OrganizationFilters, 
  ModuleContext 
} from '../interfaces.js';
// ============================================
// VALIDATION SCHEMAS
// ============================================

const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  domain: z.string().optional(),
  description: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

const updateOrganizationSchema = createOrganizationSchema.partial();

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER', 'PARTNER_ADMIN', 'PARTNER_VIEWER']),
  organizationId: z.string().cuid(),
  invitedBy: z.string(),
});

const whiteLabelSchema = z.object({
  logo: z.string().url().optional().nullable(),
  favicon: z.string().url().optional().nullable(),
  brandName: z.string().max(100).optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#2563eb'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  font: z.string().optional().nullable(),
  emailSender: z.string().email().optional().nullable(),
  supportEmail: z.string().email().optional().nullable(),
  supportPhone: z.string().optional().nullable(),
  customDomain: z.string().optional().nullable(),
  privacyPolicy: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  footer: z.string().optional().nullable(),
  loginBackground: z.string().url().optional().nullable(),
  faviconDark: z.string().url().optional().nullable(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateSlug = (name: string): string => {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const suffix = Date.now().toString(36);
  return `${base}-${suffix}`;
};

const defaultQuota: QuotaConfig = {
  maxOrganizations: 10,
  maxBots: 50,
  maxUsers: 100,
  maxMessagesPerMonth: 100000,
  maxStorageMB: 10000,
  maxKnowledgeBases: 20,
  maxTeamMembers: 50,
};

// ============================================
// TENANT MODULE IMPLEMENTATION
// ============================================

export function createTenantModule(context: ModuleContext): TenantModuleInterface {
  const { prisma } = context;

  return {
    // ============================================
    // ORGANIZATION CRUD
    // ============================================
    
    async createOrganization(input: OrganizationInput, ownerId: string) {
      const data = createOrganizationSchema.parse(input);
      
      // Check domain uniqueness
      if (data.domain) {
        const existing = await prisma.organization.findUnique({ where: { domain: data.domain } });
        if (existing) {
          throw new Error('DOMAIN_ALREADY_EXISTS');
        }
      }

      const slug = generateSlug(data.name);
      const existingSlug = await prisma.organization.findUnique({ where: { slug } });
      if (existingSlug) {
        throw new Error('ORGANIZATION_NAME_CONFLICT');
      }

      const organization = await prisma.organization.create({
        data: {
          name: data.name,
          slug,
          domain: data.domain,
          description: data.description,
          industry: data.industry,
          size: data.size,
          website: data.website || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          city: data.city || null,
          country: data.country || null,
          members: {
            create: {
              userId: ownerId,
              role: 'OWNER',
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true, role: true },
              },
            },
          },
        },
      });

      // Create default quota for organization
      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          settings: {
            ...defaultQuota,
            whiteLabel: {},
          },
        },
      });

      return this.formatOrganization(organization);
    },

    async getOrganization(id: string) {
      const org = await prisma.organization.findUnique({
        where: { id },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true, role: true },
              },
            },
          },
          brand: true,
          license: true,
          _count: {
            select: { bots: true, members: true, conversations: true },
          },
        },
      });
      return org ? this.formatOrganization(org) : null;
    },

    async getOrganizationBySlug(slug: string) {
      const org = await prisma.organization.findUnique({
        where: { slug },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true, role: true },
              },
            },
          },
          brand: true,
        },
      });
      return org ? this.formatOrganization(org) : null;
    },

    async getOrganizationByDomain(domain: string) {
      const org = await prisma.organization.findUnique({
        where: { domain },
        include: {
          brand: true,
        },
      });
      return org ? this.formatOrganization(org) : null;
    },

    async updateOrganization(id: string, input: UpdateOrganizationInput, userId: string) {
      const data = updateOrganizationSchema.parse(input);

      // Check domain uniqueness if being updated
      if (data.domain) {
        const existing = await prisma.organization.findFirst({
          where: { domain: data.domain, id: { not: id } },
        });
        if (existing) {
          throw new Error('DOMAIN_ALREADY_EXISTS');
        }
      }

      // Check permissions - user must be member with ADMIN/OWNER role
      const membership = await prisma.organizationMember.findFirst({
        where: { userId, organizationId: id },
      });
      if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
        throw new Error('INSUFFICIENT_PERMISSIONS');
      }

      // Update slug if name changed
      const updateData: any = { ...data };
      if (data.name) {
        updateData.slug = generateSlug(data.name);
      }

      const organization = await prisma.organization.update({
        where: { id },
        data: updateData,
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
            },
          },
          brand: true,
        },
      });

      return this.formatOrganization(organization);
    },

    async deleteOrganization(id: string, userId: string) {
      // Check ownership
      const membership = await prisma.organizationMember.findFirst({
        where: { userId, organizationId: id },
      });
      if (!membership || membership.role !== 'OWNER') {
        throw new Error('ONLY_OWNER_CAN_DELETE');
      }

      await prisma.organization.delete({ where: { id } });
    },

    async listOrganizations(userId: string, filters: OrganizationFilters = {}) {
      const { status, plan, search, page = 1, limit = 10 } = filters;
      
      // Get organizations where user is a member
      const memberships = await prisma.organizationMember.findMany({
        where: { userId },
        select: { organizationId: true },
      });
      
      const orgIds = memberships.map(m => m.organizationId);
      
      const where: any = { id: { in: orgIds } };
      if (status) where.status = status;
      if (plan) where.plan = plan;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [organizations, total] = await Promise.all([
        prisma.organization.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            members: {
              include: { user: { select: { id: true, name: true, email: true, avatar: true, role: true } } },
            },
            brand: true,
            _count: { select: { bots: true, members: true } },
          },
        }),
        prisma.organization.count({ where }),
      ]);

      return {
        organizations: organizations.map(this.formatOrganization),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    },

    // ============================================
    // MEMBERS & RBAC
    // ============================================

    async getMembers(organizationId: string) {
          const members = await prisma.organizationMember.findMany({
            where: { organizationId },
            include: {
              user: { select: { id: true, name: true, email: true, avatar: true } },
            },
            orderBy: { joinedAt: 'asc' },
          });

          return members.map(m => ({
            id: m.id,
            userId: m.userId,
            organizationId: m.organizationId,
            role: m.role,
            joinedAt: m.joinedAt,
            user: m.user ?? { id: '', name: '', email: '', avatar: null },
          })) as any;
        },

        async addMember(organizationId: string, userId: string, role: string) {
          const member = await prisma.organizationMember.create({
            data: { organizationId, userId, role: role as any },
            include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
          });
          return {
            id: member.id,
            userId: member.userId,
            organizationId: member.organizationId,
            role: member.role,
            joinedAt: member.joinedAt,
            user: member.user ?? { id: '', name: '', email: '', avatar: null },
          } as any;
        },

        async updateMemberRole(organizationId: string, userId: string, role: string) {
      const member = await prisma.organizationMember.update({
        where: { userId_organizationId: { userId, organizationId } },
        data: { role: role as any },
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      });
      return {
        id: member.id,
        userId: member.userId,
        organizationId: member.organizationId,
        role: member.role,
        joinedAt: member.joinedAt,
        user: member.user ?? { id: '', name: '', email: '', avatar: null },
      } as any;
    },

    async removeMember(organizationId: string, userId: string, removedBy: string) {
      // Check if remover has permission
      const removerMembership = await prisma.organizationMember.findFirst({
        where: { userId: removedBy, organizationId },
      });
      if (!removerMembership || !['OWNER', 'ADMIN'].includes(removerMembership.role)) {
        throw new Error('INSUFFICIENT_PERMISSIONS');
      }

      // Prevent removing owner
      const targetMembership = await prisma.organizationMember.findFirst({
        where: { userId, organizationId },
      });
      if (targetMembership?.role === 'OWNER') {
        throw new Error('CANNOT_REMOVE_OWNER');
      }

      await prisma.organizationMember.delete({
        where: { userId_organizationId: { userId, organizationId } },
      });
    },

    // ============================================
    // INVITATIONS
    // ============================================

    async inviteMember(input: InvitationInput) {
      const data = inviteMemberSchema.parse(input);

      // Check if user already exists and is a member
      const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingUser) {
        const membership = await prisma.organizationMember.findFirst({
          where: { userId: existingUser.id, organizationId: data.organizationId },
        });
        if (membership) {
          throw new Error('USER_ALREADY_MEMBER');
        }
      }

      // Check for existing pending invitation
      const existingInvite = await prisma.invitation.findFirst({
        where: { email: data.email, organizationId: data.organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      });
      if (existingInvite) {
        throw new Error('INVITATION_ALREADY_PENDING');
      }

      const token = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
      
      const invitation = await prisma.invitation.create({
        data: {
          email: data.email,
          role: data.role,
          organizationId: data.organizationId,
          invitedBy: data.invitedBy,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // TODO: Send invitation email

      return this.formatInvitation(invitation);
    },

    async acceptInvitation(token: string, userId: string) {
      const invitation = await prisma.invitation.findUnique({ where: { token } });
      if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
        throw new Error('INVALID_OR_EXPIRED_INVITATION');
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.email !== invitation.email) {
        throw new Error('INVITATION_EMAIL_MISMATCH');
      }

      const member = await prisma.organizationMember.create({
        data: {
          userId,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      });

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return {
              id: member.id,
              userId: member.userId,
              organizationId: member.organizationId,
              role: member.role,
              joinedAt: member.joinedAt,
              user: member.user ?? { id: '', name: '', email: '', avatar: null },
            } as any;
          },

          async revokeInvitation(invitationId: string) {
      await prisma.invitation.delete({ where: { id: invitationId } });
    },

    async listInvitations(organizationId: string) {
      const invitations = await prisma.invitation.findMany({
        where: { organizationId, acceptedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      return invitations.map(this.formatInvitation);
    },

    // ============================================
    // QUOTAS & LIMITS
    // ============================================

    async getQuota(organizationId: string) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true, plan: true },
      });

      const settings = org?.settings as any || {};
      return {
        maxOrganizations: settings.maxOrganizations ?? defaultQuota.maxOrganizations,
        maxBots: settings.maxBots ?? defaultQuota.maxBots,
        maxUsers: settings.maxUsers ?? defaultQuota.maxUsers,
        maxMessagesPerMonth: settings.maxMessagesPerMonth ?? defaultQuota.maxMessagesPerMonth,
        maxStorageMB: settings.maxStorageMB ?? defaultQuota.maxStorageMB,
        maxKnowledgeBases: settings.maxKnowledgeBases ?? defaultQuota.maxKnowledgeBases,
        maxTeamMembers: settings.maxTeamMembers ?? defaultQuota.maxTeamMembers,
      };
    },

    async checkQuota(organizationId: string, resource: keyof QuotaConfig) {
      const quota = await this.getQuota(organizationId);
      const limit = quota[resource];
      
      // Get current usage from Usage table for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const usage = await prisma.usage.aggregate({
        where: {
          organizationId,
          date: { gte: startOfMonth },
        },
        _sum: {
          messages: true,
          conversations: true,
          leads: true,
          storageMB: true,
        },
      });

      const current = this.getCurrentUsage(resource, usage._sum);
      return { allowed: current < limit, current, limit };
    },

    async incrementUsage(organizationId: string, resource: keyof QuotaConfig, amount = 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);

      await prisma.usage.upsert({
        where: { organizationId_date: { organizationId, date } },
        update: { [resource]: { increment: amount } },
        create: { organizationId, date, [resource]: amount },
      });
    },

    // ============================================
    // WHITE-LABEL CONFIG
    // ============================================

    async getWhiteLabelConfig(organizationId: string) {
      const brand = await prisma.brand.findUnique({ where: { organizationId } });
      if (!brand) return null;

      return {
        logo: brand.logo ?? undefined,
        favicon: brand.favicon ?? undefined,
        brandName: brand.brandName ?? undefined,
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        font: brand.font ?? undefined,
        emailSender: brand.emailSender ?? undefined,
        supportEmail: brand.supportEmail ?? undefined,
        supportPhone: brand.supportPhone ?? undefined,
        customDomain: brand.customDomain ?? undefined,
        privacyPolicy: brand.privacyPolicy ?? undefined,
        terms: brand.terms ?? undefined,
        footer: brand.footer ?? undefined,
        loginBackground: brand.loginBackground ?? undefined,
        faviconDark: brand.faviconDark ?? undefined,
      };
    },

    async updateWhiteLabelConfig(organizationId: string, config: Partial<WhiteLabelConfig>) {
      const data = whiteLabelSchema.parse(config);
      
      // Check custom domain uniqueness
      if (data.customDomain) {
        const existing = await prisma.brand.findFirst({
          where: { customDomain: data.customDomain, organizationId: { not: organizationId } },
        });
        if (existing) throw new Error('CUSTOM_DOMAIN_ALREADY_IN_USE');
      }

      await prisma.brand.upsert({
        where: { organizationId },
        update: data,
        create: { organizationId, ...data },
      });

      const result = await this.getWhiteLabelConfig(organizationId);
      if (!result) throw new Error('WHITE_LABEL_CONFIG_NOT_FOUND');
      return result;
    },

    // ============================================
    // DOMAIN VERIFICATION
    // ============================================

    async verifyCustomDomain(organizationId: string, _domain: string) {
      // TODO: Implement actual DNS verification
      // For now, return mock records
      const records: DNSRecord[] = [
        { type: 'CNAME', name: '@', value: 'atheer-agent.railway.app', verified: false },
        { type: 'TXT', name: '_verify', value: `atheer-verify=${organizationId}`, verified: false },
      ];
      return { verified: false, records };
    },

    async getDNSRecords(organizationId: string) {
      const brand = await prisma.brand.findUnique({ where: { organizationId } });
      if (!brand?.customDomain) return [];

      return [
        { type: 'CNAME' as const, name: '@', value: 'atheer-agent.railway.app', verified: false },
        { type: 'TXT' as const, name: '_verify', value: `atheer-verify=${organizationId}`, verified: false },
      ];
    },

    // ============================================
    // HELPER METHODS
    // ============================================

    formatOrganization(org: any): Organization {
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        domain: org.domain ?? undefined,
        logo: org.logo ?? undefined,
        description: org.description ?? undefined,
        industry: org.industry ?? undefined,
        size: org.size ?? undefined,
        website: org.website ?? undefined,
        email: org.email ?? undefined,
        phone: org.phone ?? undefined,
        address: org.address ?? undefined,
        city: org.city ?? undefined,
        country: org.country ?? undefined,
        status: org.status,
        plan: org.plan,
        settings: org.settings,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
      };
    },

    formatInvitation(inv: any): Invitation {
      return {
        id: inv.id,
        email: inv.email,
        role: inv.role,
        organizationId: inv.organizationId,
        invitedBy: inv.invitedBy,
        token: inv.token,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt ?? undefined,
        createdAt: inv.createdAt,
      };
    },

    getCurrentUsage(resource: keyof QuotaConfig, sums: any): number {
      const map: Record<string, number | undefined> = {
        maxMessagesPerMonth: sums.messages,
        maxConversationsPerMonth: sums.conversations,
        maxLeadsPerMonth: sums.leads,
        maxStorageMB: sums.storageMB,
      };
      return map[resource] ?? 0;
    },
  };
}

// ============================================
// TENANT ROUTES (Fastify Plugin)
// ============================================

export const tenantRoutes: FastifyPluginAsync = async (app) => {
  const tenantModule = app.modules.tenant;

  // GET /api/v1/organizations
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user!;
    const { status, plan, search, page = 1, limit = 10 } = request.query as any;
    
    if (user.organizationId) {
      // Regular user - return only their org
      const org = await tenantModule.getOrganization(user.organizationId);
      return org ? [org] : [];
    }

    // Partner admin - return all orgs under their partner
    if (user.role === 'PARTNER_ADMIN' || user.role === 'PARTNER_VIEWER') {
      return tenantModule.listOrganizations(user.id, { status, plan, search, page, limit });
    }

    return [];
  });

  // POST /api/v1/organizations
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
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
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    let organization;
    if (user.organizationId) {
      if (user.organizationId !== id) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      organization = await tenantModule.getOrganization(id);
    } else if (user.role === 'PARTNER_ADMIN' || user.role === 'PARTNER_VIEWER') {
      // Check if org belongs to partner
      const org = await tenantModule.getOrganization(id);
      if (!org) return reply.code(404).send({ error: 'Organization not found' });
      organization = org;
    }

    if (!organization) {
      return reply.code(404).send({ error: 'Organization not found' });
    }

    return organization;
  });

  // PUT /api/v1/organizations/:id
  app.put('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
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
  app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
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
  app.get('/:id/members', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return tenantModule.getMembers(id);
  });

  // POST /api/v1/organizations/:id/members
  app.post('/:id/members', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    // Check permissions
    const membership = await app.prisma.organizationMember.findFirst({
      where: { userId: user.userId, organizationId: id },
    });
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    const { userId, role } = request.body as { userId: string; role: string };
    const member = await tenantModule.addMember(id, userId, role);
    return member;
  });

  // PATCH /api/v1/organizations/:id/members/:userId
  app.patch('/:id/members/:userId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id, userId: memberUserId } = request.params as { id: string; userId: string };
    const user = request.user!;

    const membership = await app.prisma.organizationMember.findFirst({
      where: { userId: user.userId, organizationId: id },
    });
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    const { role } = request.body as { role: string };
    const member = await tenantModule.updateMemberRole(memberUserId, role);
    return member;
  });

  // DELETE /api/v1/organizations/:id/members/:userId
  app.delete('/:id/members/:userId', { preHandler: [app.authenticate] }, async (request, reply) => {
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
  app.post('/:id/invitations', { preHandler: [app.authenticate] }, async (request, reply) => {
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

  app.get('/:id/invitations', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return tenantModule.listInvitations(id);
  });

  app.delete('/invitations/:invitationId', { preHandler: [app.authenticate] }, async (request) => {
    const { invitationId } = request.params as { invitationId: string };
    await tenantModule.revokeInvitation(invitationId);
    return { success: true };
  });

  // Quota
  app.get('/:id/quota', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return tenantModule.getQuota(id);
  });

  app.get('/:id/quota/:resource', { preHandler: [app.authenticate] }, async (request) => {
    const { id, resource } = request.params as { id: string; resource: keyof QuotaConfig };
    return tenantModule.checkQuota(id, resource);
  });

  // White-label
  app.get('/:id/brand', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return tenantModule.getWhiteLabelConfig(id);
  });

  app.put('/:id/brand', { preHandler: [app.authenticate] }, async (request, reply) => {
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
  app.post('/:id/verify-domain', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const { domain } = request.body as { domain: string };
    return tenantModule.verifyCustomDomain(id, domain);
  });

  app.get('/:id/dns-records', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return tenantModule.getDNSRecords(id);
  });
};

export default tenantRoutes;