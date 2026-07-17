import { ModuleContext, TenantModuleInterface, CreateOrganizationInput, CreateBrandInput } from './interfaces.js';
import { PrismaClient, UserRole } from '@prisma/client';

export function createTenantModule(context: ModuleContext): TenantModuleInterface {
  const { prisma } = context;

  return {
    async createOrganization(input: CreateOrganizationInput, ownerId: string) {
      const org = await prisma.organization.create({
        data: {
          name: input.name,
          slug: input.slug || input.name.toLowerCase().replace(/\s+/g, '-'),
          description: input.description,
          industry: input.industry,
          size: input.size,
          website: input.website,
          email: input.email,
          phone: input.phone,
          address: input.address,
          city: input.city,
          country: input.country,
          status: input.status || 'active',
          plan: input.plan || 'starter',
          settings: input.settings || {},
          ownerId,
        },
      });

      await prisma.organizationMember.create({
        data: {
          userId: ownerId,
          organizationId: org.id,
          role: UserRole.OWNER,
        },
      });

      return org;
    },

    async getOrganization(orgId: string) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          members: {
            include: {
              user: true,
            },
          },
          owner: true,
        },
      });
      return org;
    },

    async updateOrganization(orgId: string, input: Partial<CreateOrganizationInput>, userId: string) {
      // Check ownership or admin
      const membership = await prisma.organizationMember.findFirst({
        where: { userId, organizationId: orgId, role: { in: [UserRole.OWNER, UserRole.ADMIN] } },
      });

      if (!membership) {
        throw new Error('INSUFFICIENT_PERMISSIONS');
      }

      const org = await prisma.organization.update({
        where: { id: orgId },
        data: input,
      });

      return org;
    },

    async deleteOrganization(orgId: string, userId: string) {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId, organizationId: orgId, role: UserRole.OWNER },
      });

      if (!membership) {
        throw new Error('ONLY_OWNER_CAN_DELETE');
      }

      await prisma.organization.delete({
        where: { id: orgId },
      });

      return { success: true };
    },

    async getMembers(orgId: string) {
      const members = await prisma.organizationMember.findMany({
        where: { organizationId: orgId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatar: true,
            },
          },
        },
      });
      return members;
    },

    async addMember(input: { userId: string; organizationId: string; role: UserRole }) {
      const membership = await prisma.organizationMember.create({
        data: {
          userId: input.userId,
          organizationId: input.organizationId,
          role: input.role,
        },
      });
      return membership;
    },

    async removeMember(userId: string, orgId: string) {
      await prisma.organizationMember.deleteMany({
        where: { userId, organizationId: orgId },
      });
      return { success: true };
    },

    async updateMemberRole(orgId: string, userId: string, role: UserRole) {
      const membership = await prisma.organizationMember.updateMany({
        where: { userId, organizationId: orgId },
        data: { role },
      });
      return { count: membership.count };
    },

    async createBrand(orgId: string, input: CreateBrandInput) {
      const brand = await prisma.brand.create({
        data: {
          ...input,
          organizationId: orgId,
        },
      });
      return brand;
    },

    async getBrand(orgId: string, domain: string) {
      const brand = await prisma.brand.findFirst({
        where: {
          organizationId: orgId,
          OR: [
            { domain },
            { name: domain },
          ],
        },
      });
      return brand;
    },

    async updateBrand(orgId: string, domain: string, input: Partial<CreateBrandInput>) {
      const brand = await prisma.brand.updateMany({
        where: {
          organizationId: orgId,
          OR: [
            { domain },
            { name: domain },
          ],
        },
        data: input,
      });
      return { count: brand.count };
    },

    async deleteBrand(orgId: string, domain: string) {
      await prisma.brand.deleteMany({
        where: {
          organizationId: orgId,
          OR: [
            { domain },
            { name: domain },
          ],
        },
      });
      return { success: true };
    },

    async checkMember(orgId: string, userId: string, requiredRole?: UserRole) {
      const membership = await prisma.organizationMember.findFirst({
        where: {
          organizationId: orgId,
          userId,
          ...(requiredRole && { role: requiredRole }),
        },
      });
      return !!membership;
    },

    async getQuota(orgId: string) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          plan: true,
          maxOrganizations: true,
          maxBots: true,
          maxUsers: true,
          maxMessages: true,
          maxStorage: true,
        },
      });

      if (!org) {
        return null;
      }

      const [botCount, userCount, messageCount, storageUsage] = await Promise.all([
        prisma.bot.count({ where: { organizationId: orgId } }),
        prisma.organizationMember.count({ where: { organizationId: orgId } }),
        prisma.message.count({
          where: {
            conversation: {
              bot: {
                organizationId: orgId,
              },
            },
          },
        }),
        prisma.knowledgeBase.aggregate({
          where: { bot: { organizationId: orgId } },
          _sum: { contentLength: true },
        }),
      ]);

      return {
        plan: org.plan,
        limits: {
          organizations: org.maxOrganizations,
          bots: org.maxBots,
          users: org.maxUsers,
          messages: org.maxMessages,
          storage: org.maxStorage,
        },
        usage: {
          organizations: 1, // current org
          bots: botCount,
          users: userCount,
          messages: messageCount,
          storage: storageUsage._sum.contentLength || 0,
        },
      };
    },

    async checkQuota(orgId: string, resource: keyof any) {
      const quota = await this.getQuota(orgId);
      if (!quota) return { allowed: false };

      const usage = quota.usage[resource];
      const limit = quota.limits[resource as keyof typeof quota.limits];
      return { allowed: usage < limit };
    },

    async getWhiteLabelConfig(orgId: string) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: {
          settings: true,
        },
      });
      return org?.settings || {};
    },

    async updateWhiteLabelConfig(orgId: string, input: any) {
      await prisma.organization.update({
        where: { id: orgId },
        data: {
          settings: input,
        },
      });
      return { success: true };
    },
  };
}