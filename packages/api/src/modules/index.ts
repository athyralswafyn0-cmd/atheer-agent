import { FastifyInstance } from 'fastify';
import { 
  ModuleContext, 
  ModuleConfig,
  AuthModuleInterface,
  TenantModuleInterface,
  PartnerModuleInterface,
  BotModuleInterface,
} from './interfaces.js';
import { createAuthModule } from './auth/index.js';
import { createTenantModule } from './tenant/index.js';
import { createPartnerModule } from './partner/index.js';
import { createBotModule } from './bot/index.js';

export interface ModuleRegistry {
  auth: AuthModuleInterface;
  tenant: TenantModuleInterface;
  partner: PartnerModuleInterface;
  bot: BotModuleInterface;
}

/**
 * Initializes all modules and attaches them to the Fastify instance
 * This is the core of the Modular Monolith architecture (Stage 2)
 */
export async function initializeModules(app: FastifyInstance): Promise<ModuleRegistry> {
  const context = createModuleContext(app);

  // Create all module instances
  const modules: ModuleRegistry = {
    auth: createAuthModule(context),
    tenant: createTenantModule(context),
    partner: createPartnerModule(context),
    bot: createBotModule(context),
  };

  // Attach to Fastify instance for route access
  (app as any).modules = modules;

  return modules;
}

/**
 * Creates the module context with all dependencies
 */
export function createModuleContext(app: FastifyInstance): ModuleContext {
  const config: ModuleConfig = {
    jwtSecret: app.config.JWT_SECRET,
    jwtExpiresIn: app.config.JWT_EXPIRES_IN,
    bcryptRounds: 12,
    rateLimit: {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
    },
  };

  return {
    prisma: app.prisma,
    config,
  };
}

/**
 * Module dependency graph - defines initialization order
 * Auth must be first (others depend on it)
 * Tenant before Partner/Bot (they need organizations)
 */
export const moduleInitOrder: (keyof ModuleRegistry)[] = ['auth', 'tenant', 'partner', 'bot'];

/**
 * Validates module dependencies are satisfied
 */
export function validateModuleDependencies(modules: ModuleRegistry): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!modules.auth) {
    errors.push('Auth module is required but not initialized');
  }

  if (!modules.tenant) {
    errors.push('Tenant module is required but not initialized');
  }

  if (modules.partner && !modules.tenant) {
    errors.push('Partner module requires Tenant module');
  }

  if (modules.bot && !modules.tenant) {
    errors.push('Bot module requires Tenant module');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}