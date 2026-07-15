import { PrismaClient, Prisma } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { BrandInputSchema, CreateOrganizationSchema, UpdateOrganizationSchema } from './schemas';

// Initialize Prisma client
const prisma = new PrismaClient();

// Define TypeScript interfaces for module API
export interface TenantModuleInterface {
  // Core CRUD
  createOrganization(input: any): Promise<any>;
  getOrganization(orgId: string): Promise<any>;
  updateOrganization(orgId: string, input: any): Promise<any>;
  deleteOrganization(orgId: string): Promise<void>;

  // Members
  addMember(input: { userId: string; organizationId: string; role: string }): Promise<void>;
  getMembers(orgId: string): Promise<any>;
  removeMember(userId: string, orgId: string): Promise<void>;

  // Brand management
  createBrand(orgId: string, input: any): Promise<any>;
  getBrand(orgId: string, domain: string): Promise<any>;
  updateBrand(orgId: string, domain: string, input: any): Promise<any>;
  deleteBrand(orgId: string, domain: string): Promise<void>;

  // Permission check
  checkMember(orgId: string, userId: string, requiredRole?: string): Promise<boolean>;

  // Health check
  healthCheck(): Promise<{ status: 'ok' }>;
}

// Create Fastify instance with common plugins
async function createTenantApp() {
  const app: FastifyInstance = Fastify({
    logger: true
  });

  // Common plugins
  await app.register(require('@fastify/cors'), { origin: true });
  await app.register(require('@fastify/helmet'));
  await app.register(require('@fastify/rate-limit'), { max: 100 });
  await app.register(require('@fastify/jwt'), { secret: process.env.JWT_SECRET });

  // Decorate with Prisma client for module methods
  app.decorate('prisma', prisma);

  // Health check route
  app.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    await reply.send({ status: 'ok' });
  });

  // JWT verification decorator
  app.addHook('preHandler', async (request, reply) => {
    try {
      await request.authenticate();
    } catch (err) {
      reply.send(err);
    }
  });

  // Routes will be attached later via registerRoutes
  return app;
}

// Register all tenant routes under /api/v1/tenant
async function registerRoutes(app: FastifyInstance) {
  // Prefix all tenant routes
  const prefix = '/api/v1/tenant';

  // -----------------------------------------------------------------
  // Organization routes
  // -----------------------------------------------------------------
  app.post(`${prefix}/organizations`, async (request, reply) => {
    const parseResult = CreateOrganizationSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send(parseResult.error.format());
    }
    const org = await app.tenant.createOrganization(parseResult.data);
    return reply.code(201).send(org);
  });

  app.get(`${prefix}/organizations/:orgId`, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const org = await app.tenant.getOrganization(orgId);
    if (!org) return reply.code(404).send({ error: 'Organization not found' });
    return reply.send(org);
  });

  app.patch(`${prefix}/organizations/:orgId`, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const parseResult = UpdateOrganizationSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send(parseResult.error.format());
    }
    const updated = await app.tenant.updateOrganization(orgId, parseResult.data);
    if (!updated) return reply.code(404).send({ error: 'Organization not found' });
    return reply.send(updated);
  });

  app.delete(`${prefix}/organizations/:orgId`, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    await app.tenant.deleteOrganization(orgId);
    return reply.send({ status: 'deleted' });
  });

  // -----------------------------------------------------------------
  // Organization members routes
  // -----------------------------------------------------------------
  app.post(`${prefix}/organizations/:orgId/members`, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const { userId, role } = request.body as { userId: string; role: string };
    await app.tenant.addMember({ userId, organizationId: orgId, role });
    return reply.code(201).send({ message: 'Member added' });
  });

  app.get(`${prefix}/organizations/:orgId/members`, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const members = await app.tenant.getMembers(orgId);
    return reply.send(members);
  });

  app.delete(`${prefix}/organizations/:orgId/members/:userId`, async (request, reply) => {
    const { orgId, userId } = request.params as { orgId: string; userId: string };
    await app.tenant.removeMember(userId, orgId);
    return reply.send({ message: 'Member removed' });
  });

  // -----------------------------------------------------------------
  // Brand management routes
  // -----------------------------------------------------------------
  app.post(`${prefix}/organizations/:orgId/brands`, async (request, reply) => {
    const { orgId } = request.params as { orgId: string };
    const input = request.body as any;
    const brand = await app.tenant.createBrand(orgId, input);
    return reply.code(201).send(brand);
  });

  app.get(`${prefix}/organizations/:orgId/brands/:domain`, async (request, reply) => {
    const { orgId, domain } = request.params as { orgId: string; domain: string };
    const brand = await app.tenant.getBrand(orgId, domain);
    if (!brand) return reply.code(404).send({ error: 'Brand not found' });
    return reply.send(brand);
  });

  app.patch(`${prefix}/organizations/:orgId/brands/:domain`, async (request, reply) => {
    const { orgId, domain } = request.params as { orgId: string; domain: string };
    const input = request.body as any;
    const updated = await app.tenant.updateBrand(orgId, domain, input);
    if (!updated) return reply.code(404).send({ error: 'Brand not found' });
    return reply.send(updated);
  });

  app.delete(`${prefix}/organizations/:orgId/brands/:domain`, async (request, reply) => {
    const { orgId, domain } = request.params as { orgId: string; domain: string };
    await app.tenant.deleteBrand(orgId, domain);
    return reply.send({ status: 'deleted' });
  });
}

// Create tenant module object implementing the interface
async function createTenantModule() {
  const app = await createTenantApp();
  await registerRoutes(app);

  return {
    // expose module API
    async createOrganization(input: any): Promise<any> {
      return await app.inject({
        method: 'POST',
        url: '/api/v1/tenant/organizations',
        payload: input
      }).then(res => {
        const payload = res.payload as any;
        if (res.statusCode === 201) return payload;
        throw new Error(`Failed to create org: ${res.statusCode}`);
      });
    },
    async getOrganization(orgId: string): Promise<any> {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/tenant/organizations/${orgId}`
      });
      if (response.statusCode === 404) return null;
      return JSON.parse(response.payload);
    },
    async updateOrganization(orgId: string, input: any): Promise<any> {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tenant/organizations/${orgId}`,
        payload: input
      });
      if (response.statusCode === 404) return null;
      return JSON.parse(response.payload);
    },
    async deleteOrganization(orgId: string): Promise<void> {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tenant/organizations/${orgId}`
      });
      if (response.statusCode !== 204) {
        throw new Error(`Delete failed: ${response.statusCode}`);
      }
    },
    async addMember(input: { userId: string; organizationId: string; role: string }) {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/tenant/organizations/${input.organizationId}/members`,
        payload: input
      });
      if (response.statusCode !== 201) {
        throw new Error(`Add member failed: ${response.statusCode}`);
      }
      return JSON.parse(response.payload);
    },
    async getMembers(orgId: string) {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/tenant/organizations/${orgId}/members`
      });
      if (response.statusCode === 404) return [];
      return JSON.parse(response.payload);
    },
    async removeMember(userId: string, orgId: string) {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tenant/organizations/${orgId}/members/${userId}`
      });
      if (response.statusCode !== 204) {
        throw new Error(`Remove member failed: ${response.statusCode}`);
      }
      return JSON.parse(response.payload);
    },
    async createBrand(orgId: string, input: any): Promise<any> {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/tenant/organizations/${orgId}/brands`,
        payload: input
      });
      if (response.statusCode !== 201) {
        throw new Error(`Create brand failed: ${response.statusCode}`);
      }
      return JSON.parse(response.payload);
    },
    async getBrand(orgId: string, domain: string) {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/tenant/organizations/${orgId}/brands/${domain}`
      });
      if (response.statusCode === 404) return null;
      return JSON.parse(response.payload);
    },
    async updateBrand(orgId: string, domain: string, input: any) {
      const response = await app.inject({
        method: 'PATCH',
        url: `/api/v1/tenant/organizations/${orgId}/brands/${domain}`,
        payload: input
      });
      if (response.statusCode === 404) return null;
      return JSON.parse(response.payload);
    },
    async deleteBrand(orgId: string, domain: string) {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/tenant/organizations/${orgId}/brands/${domain}`
      });
      if (response.statusCode !== 204) {
        throw new Error(`Delete brand failed: ${response.statusCode}`);
      }
      return JSON.parse(response.payload);
    },
    async checkMember(orgId: string, userId: string, requiredRole?: string) {
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/tenant/organizations/${orgId}/members?userId=${userId}`
      });
      if (response.statusCode === 404) return false;
      const members = JSON.parse(response.payload);
      if (members.length === 0) return false;
      return members.some(m => m.role === requiredRole);
    },
    async healthCheck(): Promise<{ status: string }> {
      const response = await app.inject({ method: 'GET', url: '/health' });
      return JSON.parse(response.payload);
    }
  };
}

// Export the module factory
export { createTenantModule };