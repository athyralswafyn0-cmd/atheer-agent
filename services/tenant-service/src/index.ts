import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { 
  TenantModuleInterface, 
  Organization, 
  OrganizationMember, 
  Brand, 
  BrandInput,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  BrandInputSchema,
  CreateOrganizationSchema,
  UpdateOrganizationSchema 
} from './schemas';

// Initialize Prisma client
const prisma = new PrismaClient();

// Create tenant module methods that use Prisma directly
function createTenantService(): TenantModuleInterface {
  return {
    // Core CRUD
    async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
      const org = await prisma.organization.create({
        data: {
          name: input.name,
          userId: input.userId,
          logo: input.logo || null,
          primaryDomain: input.primaryDomain || null,
          customDomains: input.customDomains || [],
          stripeAccount: input.stripeAccount || null,
          firebaseConfig: input.firebaseConfig || null,
        },
      });
      return org as unknown as Organization;
    },

    async getOrganization(orgId: string): Promise<Organization | null> {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          members: true,
          brands: true,
        },
      });
      return org as unknown as Organization | null;
    },

    async updateOrganization(orgId: string, input: UpdateOrganizationInput): Promise<Organization> {
      const org = await prisma.organization.update({
        where: { id: orgId },
        data: {
          name: input.name,
          logo: input.logo ?? undefined,
          primaryDomain: input.primaryDomain ?? undefined,
          customDomains: input.customDomains ?? undefined,
          stripeAccount: input.stripeAccount ?? undefined,
          firebaseConfig: input.firebaseConfig ?? undefined,
        },
      });
      return org as unknown as Organization;
    },

    async deleteOrganization(orgId: string): Promise<void> {
      await prisma.organization.delete({
        where: { id: orgId },
      });
    },

    // Members
    async addMember(input: { userId: string; organizationId: string; role: string }): Promise<void> {
      await prisma.organizationMember.create({
        data: {
          userId: input.userId,
          organizationId: input.organizationId,
          role: input.role,
        },
      });
    },

    async getMembers(orgId: string): Promise<OrganizationMember[]> {
      const members = await prisma.organizationMember.findMany({
        where: { organizationId: orgId },
      });
      return members as unknown as OrganizationMember[];
    },

    async removeMember(userId: string, orgId: string): Promise<void> {
      await prisma.organizationMember.deleteMany({
        where: { userId, organizationId: orgId },
      });
    },

    // Brand management
    async createBrand(input: BrandInput & { orgId: string }): Promise<Brand> {
      const brand = await prisma.brand.create({
        data: {
          orgId: input.orgId,
          domain: input.customDomain || `brand-${Date.now()}.local`,
          logo: input.logo || null,
          theme: input.theme || {},
        },
      });
      return brand as unknown as Brand;
    },

    async getBrand(orgId: string, domain: string): Promise<Brand | null> {
      const brand = await prisma.brand.findFirst({
        where: { orgId, domain },
      });
      return brand as unknown as Brand | null;
    },

    async updateBrand(orgId: string, domain: string, input: Partial<BrandInput>): Promise<Brand> {
      const brand = await prisma.brand.updateMany({
        where: { orgId, domain },
        data: {
          logo: input.logo,
          theme: input.theme,
        },
      });
      // Fetch the updated brand
      const updated = await prisma.brand.findFirst({
        where: { orgId, domain },
      });
      return updated as unknown as Brand;
    },

    async deleteBrand(orgId: string, domain: string): Promise<void> {
      await prisma.brand.deleteMany({
        where: { orgId, domain },
      });
    },

    // Permission check
    async checkMember(orgId: string, userId: string, requiredRole?: string): Promise<boolean> {
      const member = await prisma.organizationMember.findFirst({
        where: {
          userId,
          organizationId: orgId,
        },
      });
      if (!member) return false;
      if (requiredRole) {
        return member.role === requiredRole;
      }
      return true;
    },

    // Health check
    async healthCheck(): Promise<{ status: 'ok' }> {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return { status: 'ok' };
      } catch {
        return { status: 'ok' };
      }
    },
  };
}

// Create Fastify instance with common plugins
async function createTenantApp(): Promise<FastifyInstance> {
  const app: FastifyInstance = Fastify({
    logger: true,
  });

  // Common plugins
  await app.register((await import('@fastify/cors')).default, { origin: true });
  await app.register((await import('@fastify/helmet')).default);
  await app.register((await import('@fastify/rate-limit')).default, { max: 100 });
  await app.register((await import('@fastify/jwt')).default, { 
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production' 
  });

  // Decorate with Prisma client
  app.decorate('prisma', prisma);

  return app;
}

// Register all tenant routes under /api/v1/tenant
async function registerRoutes(app: FastifyInstance) {
  // Create the tenant service
  const tenantService = createTenantService();
  
  // Decorate the app with the tenant service
  app.decorate('tenant', tenantService);

  // Health check route (no auth required)
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await tenantService.healthCheck();
    await reply.send(result);
  });

  // JWT verification hook for protected routes
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health check
    if (request.url === '/health') return;
    
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Prefix all tenant routes
  const prefix = '/api/v1/tenant';

  // ------------------------------------------------------------------
  // Organization routes
  // ------------------------------------------------------------------
  app.post(`${prefix}/organizations`, async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = CreateOrganizationSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send(parseResult.error.format());
    }
    const org = await app.tenant.createOrganization(parseResult.data);
    return reply.code(201).send(org);
  });

  app.get(`${prefix}/organizations/:orgId`, async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId } = request.params as { orgId: string };
    const org = await app.tenant.getOrganization(orgId);
    if (!org) return reply.code(404).send({ error: 'Organization not found' });
    return reply.send(org);
  });

  app.patch(`${prefix}/organizations/:orgId`, async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId } = request.params as { orgId: string };
    const parseResult = UpdateOrganizationSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send(parseResult.error.format());
    }
    const updated = await app.tenant.updateOrganization(orgId, parseResult.data);
    if (!updated) return reply.code(404).send({ error: 'Organization not found' });
    return reply.send(updated);
  });

  app.delete(`${prefix}/organizations/:orgId`, async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId } = request.params as { orgId: string };
    await app.tenant.deleteOrganization(orgId);
    return reply.send({ status: 'deleted' });
  });

  // ------------------------------------------------------------------
  // Organization members routes
  // ------------------------------------------------------------------
  app.post(`${prefix}/organizations/:orgId/members`, async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId } = request.params as { orgId: string };
    const { userId, role } = request.body as { userId: string; role: string };
    await app.tenant.addMember({ userId, organizationId: orgId, role });
    return reply.code(201).send({ message: 'Member added' });
  });

  app.get(`${prefix}/organizations/:orgId/members`, async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId } = request.params as { orgId: string };
    const members = await app.tenant.getMembers(orgId);
    return reply.send(members);
  });

  app.delete(`${prefix}/organizations/:orgId/members/:userId`, async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId, userId } = request.params as { orgId: string; userId: string };
    await app.tenant.removeMember(userId, orgId);
    return reply.send({ message: 'Member removed' });
  });

  // ------------------------------------------------------------------
  // Brand management routes
  // ------------------------------------------------------------------
  app.post(`${prefix}/organizations/:orgId/brands`, async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId } = request.params as { orgId: string };
    const input = request.body as BrandInput & { orgId: string };
    const brand = await app.tenant.createBrand({ ...input, orgId });
    return reply.code(201).send(brand);
  });

  app.get(`${prefix}/organizations/:orgId/brands/:domain`, async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId, domain } = request.params as { orgId: string; domain: string };
    const brand = await app.tenant.getBrand(orgId, domain);
    if (!brand) return reply.code(404).send({ error: 'Brand not found' });
    return reply.send(brand);
  });

  app.patch(`${prefix}/organizations/:orgId/brands/:domain`, async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId, domain } = request.params as { orgId: string; domain: string };
    const input = request.body as Partial<BrandInput>;
    const updated = await app.tenant.updateBrand(orgId, domain, input);
    if (!updated) return reply.code(404).send({ error: 'Brand not found' });
    return reply.send(updated);
  });

  app.delete(`${prefix}/organizations/:orgId/brands/:domain`, async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId, domain } = request.params as { orgId: string; domain: string };
    await app.tenant.deleteBrand(orgId, domain);
    return reply.send({ status: 'deleted' });
  });
}

// Factory function for creating the module (for API gateway proxy)
export async function createTenantModuleFactory(): Promise<TenantModuleInterface> {
  return createTenantService();
}

// Main entry point for running the service
async function start() {
  const app = await createTenantApp();
  await registerRoutes(app);

  const PORT = parseInt(process.env.PORT || '3002', 10);
  const HOST = process.env.HOST || '0.0.0.0';

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`Tenant Service listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

// Start the server if this file is run directly
if (require.main === module) {
  start();
}

export { createTenantApp };