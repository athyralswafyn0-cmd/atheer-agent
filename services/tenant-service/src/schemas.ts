import { PrismaClient } from '@prisma/client';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Define module interfaces (single source of truth)
export interface TenantModuleInterface {
  // Core CRUD operations
  createOrganization(input: CreateOrganizationInput): Promise<Organization>;
  getOrganization(orgId: string): Promise<Organization | null>;
  updateOrganization(orgId: string, input: UpdateOrganizationInput): Promise<Organization>;
  deleteOrganization(orgId: string): Promise<void>;

  // Members management
  addMember(input: { userId: string; organizationId: string; role: string }): Promise<void>;
  getMembers(orgId: string): Promise<OrganizationMember[]>;
  removeMember(userId: string, orgId: string): Promise<void>;

  // Brand management
  createBrand(input: BrandInput): Promise<Brand>;
  getBrand(orgId: string, domain: string): Promise<Brand | null>;
  updateBrand(orgId: string, domain: string, input: Partial<BrandInput>): Promise<Brand>;
  deleteBrand(orgId: string, domain: string): Promise<void>;

  // Organization members permission check
  checkMember(orgId: string, userId: string, requiredRole?: string): Promise<boolean>;

  // Health check
  healthCheck(): Promise<{ status: 'ok' }>;
}

// Prisma schema models (as TypeScript types)
export interface Organization {
  id: string;
  name: string;
  userId: string; // owner
  logo?: string | null;
  primaryDomain?: string | null;
  customDomains?: string[] | null;
  stripeAccount?: string | null;
  firebaseConfig?: any; // partial firebase config in JSON
  membership: {
    role: string;
  };
}

export interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: string;
  createdAt: Date;
}

export interface BrandInput {
  customDomain?: string;
  logo?: string | null;
  theme?: any; // partial theme config with colors
  primaryColor?: string;
  secondaryColor?: string;
  textColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  branding?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  logo?: string | null;
  primaryDomain?: string | null;
  customDomains?: string[] | null;
  stripeAccount?: string | null;
  firebaseConfig?: any;
}

export interface CreateOrganizationInput extends Organization {}

export interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: string;
  createdAt: Date;
}

export interface Brand {
  orgId: string;
  domain: string; // full custom domain
  logo?: string | null;
  theme?: any; // partial theme config
  createdAt: Date;
}

// Validation schemas
export const BrandInputSchema = z.object({
  customDomain: z.string().min(1).optional(),
  logo: z.string().url().optional(),
  theme: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    textColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    fontFamily: z.string().optional(),
    branding: z.string().optional(),
  }).optional(),
  branding: z.string().optional(),
});

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  logo: z.string().url().optional(),
  primaryDomain: z.string().optional(),
  customDomains: z.array(z.string()).optional(),
  stripeAccount: z.string().optional(),
  firebaseConfig: z.any().optional(),
});

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1),
  userId: z.string(),
  logo: z.string().url().optional(),
  primaryDomain: z.string().url().optional(),
  customDomains: z.array(z.string()).optional(),
  stripeAccount: z.string().optional(),
  firebaseConfig: z.any().optional(),
});

export type { BrandInput };