// Fastify TypeScript Declaration File
// All decorators are explicitly declared - no defaults

import 'fastify';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import OpenAI from 'openai';
import { Transporter } from 'nodemailer';
import { ZodError } from 'zod';

// Explicit config type - every field must be defined
type Config = {
  NODE_ENV: string;
  PORT: number;
  HOST: string;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGINS: string;
  RATE_LIMIT_MAX: number;
  RATE_LIMIT_WINDOW: string;
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
  OPENAI_EMBEDDING_MODEL: string;
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_USER: string;
  EMAIL_PASS: string;
  EMAIL_FROM: string;
  FRONTEND_URL: string;
  WIDGET_CDN_URL: string;
};

declare module 'fastify' {
  interface FastifyInstance {
    // Core services - explicitly typed
    prisma: PrismaClient;
    bcrypt: typeof import('bcryptjs');
    queue: Queue;
    openai: OpenAI;
    email: Transporter;
    config: Config;
    jwt: {
      sign: (payload: object, options?: any) => string;
      verify: (token: string, options?: any) => any;
    };

    // Module registry - Modular Monolith (Stage 2)
    modules: {
      auth: import('./modules/auth').AuthModuleInterface;
      tenant: import('./modules/tenant').TenantModuleInterface;
      partner: import('./modules/partner').PartnerModuleInterface;
      bot: import('./modules/bot').BotModuleInterface;
      conversation?: import('./modules/conversation').ConversationModuleInterface;
      ai?: import('./modules/ai').AIModuleInterface;
      eventBus?: import('./modules/event-bus').EventBusInterface;
    };

    // Auth utilities - explicit signatures
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    validateBotAccess: (botId: string, organizationId: string) => Promise<void>;
    testIntegration: (integration: any) => Promise<void>;

    // Notification
    notifyNewLead: (lead: any, bot: any) => Promise<void>;

    // Custom decorators from plugins
    ai: import('./services/ai').AIService;
    vectorSearch: import('./services/vector-search').VectorSearchService;
  }

  interface FastifyRequest {
    // User is explicitly added via decorator - never default
    user?: {
      id: string;
      userId: string;
      organizationId: string | null;
      role: string;
    };
    cookies?: Record<string, string>;
  }

  interface FastifyReply {
    // setCookie is explicitly defined - no defaults
    setCookie: (
      name: string,
      value: string,
      options?: {
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'lax' | 'strict' | 'none';
        maxAge?: number;
        path?: string;
      }
    ) => FastifyReply;
  }

  interface FastifyBaseLogger {
    error(obj: object, msg: string): void;
    error(msg: string): void;
    error(err: Error, msg: string): void;
    warn(obj: object, msg: string): void;
    warn(msg: string): void;
    info(obj: object, msg: string): void;
    info(msg: string): void;
    debug(obj: object, msg: string): void;
    debug(msg: string): void;
  }
}

// Global error types - explicitly defined
interface ErrorWithStatusCode extends Error {
  statusCode?: number;
  validation?: ZodError['issues'];
  code?: string;
  meta?: any;
}

declare global {
  namespace Fastify {
    interface ErrorWithStatusCode extends Error {
      statusCode?: number;
    }
  }
}