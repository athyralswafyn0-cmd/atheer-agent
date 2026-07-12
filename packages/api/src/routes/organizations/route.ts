/// <reference path="../../fastify.d.ts" />
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  domain: z.string().optional(),
  description: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  website: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

const updateOrganizationSchema = createOrganizationSchema.partial();

export const organizationsRoutes: FastifyPluginAsync = async (app) => {
  // ===== GET /api/v1/organizations =====
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user;
    if (!user) {
      return [];
    }
    
    // If user has organizationId, return only their organization
    if (user.organizationId) {
      const org = await app.prisma.organization.findUnique({
        where: { id: user.organizationId },
        include: {
          members: true,
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });
      return org ? [org] : [];
    }
    
    // If user is partner admin, return all organizations under their partner
    if (user.role === 'PARTNER_ADMIN' || user.role === 'PARTNER_VIEWER') {
      // First find the partner associated with the user's organization
      let partner = null;
      if (user.organizationId) {
        partner = await app.prisma.partner.findFirst({
          where: {
            organizations: {
              some: {
                id: user.organizationId
              }
            }
          }
        });
      }
      
      if (partner) {
        const orgs = await app.prisma.organization.findMany({
          where: {
            partners: {
              some: {
                id: partner.id
              }
            }
          },
          include: {
            members: true,
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        });
        return orgs;
      }
    }
    
    // For other roles, return empty (should not happen in practice)
    return [];
  });

  // ===== POST /api/v1/organizations =====
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    // Only partner admins can create organizations
    if (user.role !== 'PARTNER_ADMIN' && user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
    
    const data = createOrganizationSchema.parse(request.body);
    
    // Generate slug from name if not provided
    const slug = data.domain ? data.domain.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() : data.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
    
    // Check if domain already exists
    if (data.domain) {
      const existing = await app.prisma.organization.findUnique({
        where: { domain: data.domain }
      });
      if (existing) {
        return reply.code(400).send({ error: 'Organization with this domain already exists' });
      }
    }
    
    // Check if slug already exists
    const existingSlug = await app.prisma.organization.findUnique({
      where: { slug }
    });
    if (existingSlug) {
      return reply.code(400).send({ error: 'Organization with similar name already exists' });
    }
    
    const organization = await app.prisma.organization.create({
      data: {
        name: data.name,
        slug,
        domain: data.domain,
        description: data.description,
        industry: data.industry,
        size: data.size,
        website: data.website,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
      }
    });
    
    return reply.code(201).send(organization);
  });

  // ===== GET /api/v1/organizations/:id =====
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    let organization;
    
    // If user has organizationId, they can only access their own
    if (user.organizationId) {
      if (user.organizationId !== id) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      organization = await app.prisma.organization.findUnique({
        where: { id },
        include: {
          members: true,
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      });
    } 
    // Partner admins can access organizations under their partner
    else if (user.role === 'PARTNER_ADMIN' || user.role === 'PARTNER_VIEWER') {
      // First find the partner associated with the user
      let partner = null;
      if (user.organizationId) {
        partner = await app.prisma.partner.findFirst({
          where: {
            organizations: {
              some: {
                id: user.organizationId
              }
            }
          }
        });
      }
      
      if (partner) {
        organization = await app.prisma.organization.findFirst({
          where: {
            id,
            partners: {
              some: {
                id: partner.id
              }
            }
          },
          include: {
            members: true,
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        });
      }
    }
    
    if (!organization) {
      return reply.code(404).send({ error: 'Organization not found' });
    }
    
    return organization;
  });

  // ===== PUT /api/v1/organizations/:id =====
  app.put('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    // Check permissions
    let canUpdate = false;
    if (user.organizationId) {
      canUpdate = user.organizationId === id;
    } else if (user.role === 'PARTNER_ADMIN' || user.role === 'OWNER' || user.role === 'ADMIN') {
      // Partner admins can update organizations under their partner
      let partner = null;
      if (user.organizationId) {
        partner = await app.prisma.partner.findFirst({
          where: {
            organizations: {
              some: {
                id: user.organizationId
              }
            }
          }
        });
      }
      
      if (partner) {
        const org = await app.prisma.organization.findUnique({
          where: { id },
          select: { id: true }
        });
        
        canUpdate = !!org && 
          await app.prisma.$queryRaw`SELECT 1 FROM "OrganizationPartner" WHERE "organizationId" = ${id} AND "partnerId" = ${partner.id}` !== null;
      }
    }
    
    if (!canUpdate) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
    
    const data = updateOrganizationSchema.parse(request.body);
    
    // Check domain uniqueness if being updated
    if (data.domain) {
      const existing = await app.prisma.organization.findFirst({
        where: {
          domain: data.domain,
          id: { not: id }
        }
      });
      if (existing) {
        return reply.code(400).send({ error: 'Organization with this domain already exists' });
      }
    }
    
    const organization = await app.prisma.organization.update({
      where: { id },
      data: {
        ...data,
        // Update slug if name changed
        ...(data.name && { slug: data.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-') })
      }
    });
    
    return organization;
  });

  // ===== DELETE /api/v1/organizations/:id =====
  app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    // Check permissions (similar to PUT)
    let canDelete = false;
    if (user.organizationId) {
      canDelete = user.organizationId === id;
    } else if (user.role === 'PARTNER_ADMIN' || user.role === 'OWNER' || user.role === 'ADMIN') {
      let partner = null;
      if (user.organizationId) {
        partner = await app.prisma.partner.findFirst({
          where: {
            organizations: {
              some: {
                id: user.organizationId
              }
            }
          }
        });
      }
      
      if (partner) {
        canDelete = await app.prisma.$queryRaw`SELECT 1 FROM "OrganizationPartner" WHERE "organizationId" = ${id} AND "partnerId" = ${partner.id}` !== null;
      }
    }
    
    if (!canDelete) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
    
    await app.prisma.organization.delete({
      where: { id }
    });
    
    return { success: true };
  });

  // ===== POST /api/v1/organizations/import =====
  app.post('/import', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    
    // Only partner admins can import
    if (user.role !== 'PARTNER_ADMIN' && user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }
    
    // For simplicity, we'll expect JSON array in body
    // In a real implementation, you'd handle file upload
    const organizationsData = request.body as Array<{
      name: string;
      domain?: string;
      description?: string;
      industry?: string;
      size?: string;
      website?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
    }>;
    
    if (!Array.isArray(organizationsData)) {
      return reply.code(400).send({ error: 'Expected array of organizations' });
    }
    
    const results = [];
    const errors = [];
    
    for (const data of organizationsData) {
      try {
        // Generate slug
        const slug = data.domain ? 
          data.domain.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() : 
          data.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
        
        // Check if domain already exists
        if (data.domain) {
          const existing = await app.prisma.organization.findUnique({
            where: { domain: data.domain }
          });
          if (existing) {
            errors.push({ name: data.domain || data.name, error: 'Domain already exists' });
            continue;
          }
        }
        
        // Check if slug already exists
        const existingSlug = await app.prisma.organization.findUnique({
          where: { slug }
        });
        if (existingSlug) {
          errors.push({ name: data.name, error: 'Organization with similar name already exists' });
          continue;
        }
        
        const organization = await app.prisma.organization.create({
          data: {
            name: data.name,
            slug,
            domain: data.domain,
            description: data.description,
            industry: data.industry,
            size: data.size,
            website: data.website,
            email: data.email,
            phone: data.phone,
            address: data.address,
            city: data.city,
            country: data.country,
          }
        });
        
        results.push(organization);
      } catch (error: any) {
        errors.push({ name: data.name || 'Unknown', error: error.message });
      }
    }
    
    return reply.code(201).send({
      imported: results.length,
      errors,
      organizations: results
    });
  });
};