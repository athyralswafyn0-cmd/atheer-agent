import { z } from 'zod';
import { FastifyPluginAsync } from 'fastify';
import {
  BotModuleInterface,
  Bot,
  CreateBotInput,
  UpdateBotInput,
  BotFilters,
  KnowledgeBase,
  CreateKnowledgeBaseInput,
  ModuleContext,
  ConversationFilters,
} from '../interfaces.js';
// Local types for model routing (not in shared interfaces)
type ModelInfo = import('../interfaces.js').ModelInfo;
type ChatMessage = import('../interfaces.js').ChatMessage;

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createBotSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  type: z.enum(['CUSTOMER_SUPPORT', 'LEAD_GENERATION', 'APPOINTMENT_BOOKING', 'PRODUCT_RECOMMENDATION', 'FAQ', 'CUSTOM']).optional(),
  avatar: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#2563eb'),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#ffffff'),
  position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).default('bottom-right'),
  welcomeMessage: z.string().default('مرحباً! كيف يمكنني مساعدتك اليوم؟'),
  placeholder: z.string().default('اكتب رسالتك هنا...'),
  showBranding: z.boolean().default(true),
  language: z.string().default('ar'),
  supportedLanguages: z.array(z.string()).default(['ar', 'en']),
  model: z.string().default('gpt-4-turbo-preview'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().max(4096).default(2000),
  systemPrompt: z.string().optional().default('You are a helpful AI assistant.'),
  fallbackMessage: z.string().default('عذراً، لم أفهم طلبك. هل يمكنك إعادة الصياغة؟'),
  collectLeads: z.boolean().default(false),
  leadFields: z.array(z.object({
    key: z.string(),
    label: z.string(),
    type: z.enum(['text', 'email', 'phone', 'select', 'textarea']),
    required: z.boolean(),
    options: z.array(z.string()).optional(),
  })).default([]),
  notifyOnLead: z.boolean().default(true),
  notificationChannels: z.array(z.enum(['EMAIL', 'WEBHOOK', 'SLACK', 'TELEGRAM'])).default(['EMAIL']),
  notificationEmails: z.array(z.string().email()).default([]),
});

const updateBotSchema = createBotSchema.partial();

const createKnowledgeBaseSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.string(),
  source: z.string(),
  content: z.string().optional(),
  metadata: z.record(z.any()).default({}),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatBot = (b: any): Bot => ({
  id: b.id,
  name: b.name,
  description: b.description,
  type: b.type,
  status: b.status,
  avatar: b.avatar,
  primaryColor: b.primaryColor,
  secondaryColor: b.secondaryColor,
  position: b.position,
  welcomeMessage: b.welcomeMessage,
  placeholder: b.placeholder,
  showBranding: b.showBranding,
  language: b.language,
  supportedLanguages: b.supportedLanguages,
  model: b.model,
  temperature: b.temperature,
  maxTokens: b.maxTokens,
  systemPrompt: b.systemPrompt,
  fallbackMessage: b.fallbackMessage,
  collectLeads: b.collectLeads,
  leadFields: b.leadFields,
  notifyOnLead: b.notifyOnLead,
  notificationChannels: b.notificationChannels,
  notificationEmails: b.notificationEmails,
  totalConversations: b.totalConversations,
  totalMessages: b.totalMessages,
  avgResponseTime: b.avgResponseTime,
  satisfactionRate: b.satisfactionRate,
  organizationId: b.organizationId,
  ownerId: b.ownerId,
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,
});

const formatKnowledgeBase = (kb: any): KnowledgeBase => ({
  id: kb.id,
  name: kb.name,
  type: kb.type,
  source: kb.source,
  content: kb.content,
  chunksCount: kb.chunksCount,
  status: kb.status,
  error: kb.error,
  metadata: kb.metadata,
  botId: kb.botId,
  createdAt: kb.createdAt,
  updatedAt: kb.updatedAt,
});
// Available models from different providers
const AVAILABLE_MODELS: ModelInfo[] = [
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', capabilities: ['chat', 'vision', 'function-calling'], maxTokens: 128000, costPer1kTokens: { input: 0.005, output: 0.015 } },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', capabilities: ['chat', 'vision', 'function-calling'], maxTokens: 128000, costPer1kTokens: { input: 0.00015, output: 0.0006 } },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', capabilities: ['chat', 'vision', 'function-calling'], maxTokens: 128000, costPer1kTokens: { input: 0.01, output: 0.03 } },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', capabilities: ['chat', 'function-calling'], maxTokens: 16385, costPer1kTokens: { input: 0.0005, output: 0.0015 } },
  // Anthropic
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', capabilities: ['chat', 'vision'], maxTokens: 200000, costPer1kTokens: { input: 0.015, output: 0.075 } },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', capabilities: ['chat', 'vision'], maxTokens: 200000, costPer1kTokens: { input: 0.003, output: 0.015 } },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'anthropic', capabilities: ['chat', 'vision'], maxTokens: 200000, costPer1kTokens: { input: 0.00025, output: 0.00125 } },
  // Google
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google', capabilities: ['chat', 'vision', 'long-context'], maxTokens: 1000000, costPer1kTokens: { input: 0.0035, output: 0.0105 } },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google', capabilities: ['chat', 'vision', 'long-context'], maxTokens: 1000000, costPer1kTokens: { input: 0.000075, output: 0.0003 } },
  // Meta
  { id: 'llama-3.1-405b', name: 'Llama 3.1 405B', provider: 'meta', capabilities: ['chat', 'long-context'], maxTokens: 128000, costPer1kTokens: { input: 0.005, output: 0.005 } },
  { id: 'llama-3.1-70b', name: 'Llama 3.1 70B', provider: 'meta', capabilities: ['chat', 'long-context'], maxTokens: 128000, costPer1kTokens: { input: 0.0009, output: 0.0009 } },
  // Mistral
  { id: 'mixtral-8x7b', name: 'Mixtral 8x7B', provider: 'mistral', capabilities: ['chat', 'long-context'], maxTokens: 32000, costPer1kTokens: { input: 0.0007, output: 0.0007 } },
];

// ============================================
// BOT MODULE IMPLEMENTATION
// ============================================

export function createBotModule(context: ModuleContext): BotModuleInterface {
  const { prisma } = context;

  return {
    // ============================================
    // BOT CRUD
    // ============================================

    async createBot(organizationId: string, ownerId: string, input: CreateBotInput) {
      const data = createBotSchema.parse(input);

      // Check organization exists and user is member
      const org = await prisma.organization.findUnique({ where: { id: organizationId } });
      if (!org) throw new Error('ORGANIZATION_NOT_FOUND');

      const membership = await prisma.organizationMember.findFirst({
        where: { userId: ownerId, organizationId },
      });
      if (!membership) throw new Error('NOT_ORGANIZATION_MEMBER');

      // Check bot quota
      const botCount = await prisma.bot.count({ where: { organizationId } });
      const quota = org.settings as any;
      if (botCount >= (quota?.maxBots || 50)) {
        throw new Error('BOT_QUOTA_EXCEEDED');
      }

      const bot = await prisma.bot.create({
        data: {
          ...data,
          organization: { connect: { id: organizationId } },
          owner: { connect: { id: ownerId } },
          status: 'INACTIVE',
          embedScripts: {
            create: {
              domain: 'localhost-' + Date.now(),
              allowed: true,
              scriptVersion: '1.0.0',
            },
          },
        } as any,
      });

      return formatBot(bot);
    },

    async getBot(id: string, organizationId: string) {
      const bot = await prisma.bot.findFirst({
        where: { id, organizationId },
        include: {
          knowledgeBases: true,
          embedScripts: true,
          _count: { select: { conversations: true, leads: true } },
        },
      });
      return bot ? formatBot(bot) : null;
    },

    async getBotById(id: string) {
      const bot = await prisma.bot.findUnique({
        where: { id },
        include: {
          knowledgeBases: true,
          embedScripts: true,
          organization: true,
          owner: { select: { id: true, name: true, email: true } },
        },
      });
      return bot ? formatBot(bot) : null;
    },

    async updateBot(id: string, organizationId: string, input: UpdateBotInput) {
      const data = updateBotSchema.parse(input);

      const bot = await prisma.bot.findFirst({ where: { id, organizationId } });
      if (!bot) throw new Error('BOT_NOT_FOUND');

      const updated = await prisma.bot.update({
        where: { id },
        data,
        include: { knowledgeBases: true },
      });

      return formatBot(updated);
    },

    async deleteBot(id: string, organizationId: string) {
      const bot = await prisma.bot.findFirst({ where: { id, organizationId } });
      if (!bot) throw new Error('BOT_NOT_FOUND');

      await prisma.bot.delete({ where: { id } });
    },

    async getBotByOrganization(organizationId: string, filters?: BotFilters) {
      const { status, type, search, page = 1, limit = 10 } = filters || {};
      const where: any = { organizationId };

      if (status) where.status = status;
      if (type) where.type = type;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [bots, total] = await Promise.all([
        prisma.bot.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { conversations: true, leads: true } },
            knowledgeBases: { select: { id: true, status: true } },
          },
        }),
        prisma.bot.count({ where }),
      ]);

      return {
        bots: bots.map(formatBot),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    },

    // ============================================
    // BOT STATUS & DEPLOYMENT
    // ============================================

    async activateBot(id: string, organizationId: string) {
      const bot = await prisma.bot.findFirst({ where: { id, organizationId } });
      if (!bot) throw new Error('BOT_NOT_FOUND');

      const updated = await prisma.bot.update({
        where: { id },
        data: { status: 'ACTIVE' },
      });
      return formatBot(updated);
    },

    async deactivateBot(id: string, organizationId: string) {
      const bot = await prisma.bot.findFirst({ where: { id, organizationId } });
      if (!bot) throw new Error('BOT_NOT_FOUND');

      const updated = await prisma.bot.update({
        where: { id },
        data: { status: 'INACTIVE' },
      });
      return formatBot(updated);
    },

    // ============================================
    // TRAINING PIPELINE (placeholder - model not in schema yet)
    // ============================================

    async startTraining(botId: string, organizationId: string) {
      const bot = await prisma.bot.findFirst({ where: { id: botId, organizationId } });
      if (!bot) throw new Error('BOT_NOT_FOUND');

      // Create training job in database
      const job = await prisma.trainingJob.create({
        data: {
          botId,
          status: 'pending',
          progress: 0,
        },
      });

      // TODO: Queue training job (BullMQ)
      // await trainingQueue.add('train-bot', { botId, jobId: job.id });

      return {
        id: job.id,
        botId: job.botId,
        status: job.status as 'pending' | 'processing' | 'completed' | 'failed',
        progress: job.progress,
        error: job.error ?? undefined,
        startedAt: job.startedAt ?? undefined,
        completedAt: job.completedAt ?? undefined,
        createdAt: job.createdAt,
      };
    },

    async getTrainingStatus(jobId: string) {
      const job = await prisma.trainingJob.findUnique({ where: { id: jobId } });
      return job ? {
        id: job.id,
        botId: job.botId,
        status: job.status as 'pending' | 'processing' | 'completed' | 'failed',
        progress: job.progress,
        error: job.error ?? undefined,
        startedAt: job.startedAt ?? undefined,
        completedAt: job.completedAt ?? undefined,
        createdAt: job.createdAt,
      } : null;
    },

    async getTrainingHistory(botId: string) {
      const jobs = await prisma.trainingJob.findMany({
        where: { botId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      return jobs.map(job => ({
        id: job.id,
        botId: job.botId,
        status: job.status as 'pending' | 'processing' | 'completed' | 'failed',
        progress: job.progress,
        error: job.error ?? undefined,
        startedAt: job.startedAt ?? undefined,
        completedAt: job.completedAt ?? undefined,
        createdAt: job.createdAt,
      }));
    },

    async cancelTraining(jobId: string) {
      await prisma.trainingJob.update({
        where: { id: jobId },
        data: { status: 'cancelled' },
      });
    },

    // ============================================
    // KNOWLEDGE BASE / RAG
    // ============================================

    async createKnowledgeBase(botId: string, input: CreateKnowledgeBaseInput) {
      const data = createKnowledgeBaseSchema.parse(input);

      const bot = await prisma.bot.findUnique({ where: { id: botId } });
      if (!bot) throw new Error('BOT_NOT_FOUND');

      const kb = await prisma.knowledgeBase.create({
        data: {
          ...data,
          bot: { connect: { id: botId } },
          status: 'processing',
        } as any,
      });

      return formatKnowledgeBase(kb);
    },

    async getKnowledgeBase(id: string) {
      const kb = await prisma.knowledgeBase.findUnique({ where: { id } });
      return kb ? formatKnowledgeBase(kb) : null;
    },

    async getKnowledgeBases(botId: string) {
      const kbs = await prisma.knowledgeBase.findMany({
        where: { botId },
        orderBy: { createdAt: 'desc' },
      });
      return kbs.map(formatKnowledgeBase);
    },

    async updateKnowledgeBase(id: string, input: Partial<CreateKnowledgeBaseInput>) {
      const kb = await prisma.knowledgeBase.update({
        where: { id },
        data: input,
      });
      return formatKnowledgeBase(kb);
    },

    async deleteKnowledgeBase(id: string) {
      await prisma.knowledgeBase.delete({ where: { id } });
    },

    async triggerKnowledgeBaseSync(kbId: string) {
      await prisma.knowledgeBase.update({
        where: { id: kbId },
        data: { status: 'processing' },
      });
    },

    // ============================================
    // MODEL ROUTING & FALLBACK
    // ============================================

    async getAvailableModels() {
      return AVAILABLE_MODELS;
    },

    async routeRequest(botId: string, messages: ChatMessage[]) {
      const bot = await prisma.bot.findUnique({ where: { id: botId } });
      if (!bot) throw new Error('BOT_NOT_FOUND');

      // Primary model from bot config
      const primaryModel = AVAILABLE_MODELS.find(m => m.id === bot.model) || AVAILABLE_MODELS[0] || { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', capabilities: ['chat', 'function-calling'], maxTokens: 16385, costPer1kTokens: { input: 0.0005, output: 0.0015 } };

      // Fallback chain: cheaper/faster models
      const fallbackModels = AVAILABLE_MODELS
        .filter(m => m.id !== primaryModel.id)
        .sort((a, b) => a.costPer1kTokens.input - b.costPer1kTokens.input)
        .slice(0, 3);

      // Estimate tokens
      const estimatedTokens = messages.reduce((sum, m) => sum + m.content.length / 4, 0);
      const estimatedCost = (estimatedTokens / 1000) * primaryModel.costPer1kTokens.input;

      return {
        primaryModel,
        fallbackModels,
        estimatedCost,
      };
    },

    // ============================================
    // CONVERSATIONS (placeholder - for Stage 3)
    // ============================================

    async getConversations(_botId: string, _filters?: ConversationFilters) {
      return { conversations: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
    },

    async getConversation(_id: string) {
      return null;
    },

    async getMessages(_conversationId: string) {
      return [];
    },

    // ============================================
    // ANALYTICS (placeholder - for Stage 3)
    // ============================================

    async getBotAnalytics(_botId: string, _startDate: Date, _endDate: Date) {
      return {
        totalConversations: 0,
        totalMessages: 0,
        avgResponseTime: 0,
        satisfactionRate: 0,
        conversationsByDate: [],
        messagesByDate: [],
        topQuestions: [],
        languageDistribution: [],
      };
    },

    async exportConversations(_botId: string, _startDate: Date, _endDate: Date) {
      return [];
    },

    // ============================================
    // EMBED SCRIPT
    // ============================================

    async getEmbedScript(botId: string, domain?: string) {
      const bot = await prisma.bot.findUnique({ where: { id: botId } });
      if (!bot) throw new Error('BOT_NOT_FOUND');

      // Check domain is allowed
      const embedScript = await prisma.embedScript.findUnique({ where: { botId } });
      if (!embedScript || !embedScript.allowed) {
        throw new Error('EMBED_NOT_ALLOWED');
      }

      const script = `
<!-- Atheer Agent AI Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://cdn.atheer-agent.ai/widget/umd/ai-assistant-widget.umd.js';
    script.async = true;
    script.onload = function() {
      window.AtheerWidget.init({
        botId: '${botId}',
        domain: '${domain || ''}',
        primaryColor: '${bot.primaryColor}',
        position: '${bot.position}',
        welcomeMessage: '${bot.welcomeMessage.replace(/'/g, "\\'")}',
        placeholder: '${bot.placeholder.replace(/'/g, "\\'")}',
        language: '${bot.language}',
      });
    };
    document.head.appendChild(script);
  })();
</script>
<!-- End Atheer Agent AI Widget -->`;

      return { script, scriptUrl: 'https://cdn.atheer-agent.ai/widget/umd/ai-assistant-widget.umd.js' };
    },

    async validateEmbedDomain(botId: string, domain: string) {
      const embedScript = await prisma.embedScript.findUnique({ where: { botId } });
      if (!embedScript || !embedScript.allowed) return false;

      // Check if domain matches (allow subdomains)
      const allowedDomain = embedScript.domain;
      return domain === allowedDomain || domain.endsWith('.' + allowedDomain);
    },
  };
}

// ============================================
// BOT ROUTES (Fastify Plugin)
// ============================================

export const botRoutes: FastifyPluginAsync = async (app) => {
  const botModule = app.modules.bot;

  // GET /api/v1/bots - List bots
  app.get('/', { preHandler: [app.authenticate] }, async (request) => {
    const user = request.user!;
    const { status, type, search, page = 1, limit = 10 } = request.query as any;

    if (!user.organizationId) return { bots: [], pagination: { page, limit, total: 0, totalPages: 0 } };

    return botModule.getBotByOrganization(user.organizationId, { status, type, search, page, limit });
  });

  // POST /api/v1/bots - Create bot
  app.post('/', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user!;
    if (!user.organizationId) {
      return reply.code(400).send({ error: 'User not associated with an organization' });
    }

    try {
      const bot = await botModule.createBot(user.organizationId, user.userId, request.body as CreateBotInput);
      return reply.code(201).send(bot);
    } catch (error: any) {
      if (error.message === 'BOT_QUOTA_EXCEEDED') {
        return reply.code(400).send({ error: 'Bot quota exceeded for this organization' });
      }
      if (error.message === 'ORGANIZATION_NOT_FOUND') {
        return reply.code(404).send({ error: 'Organization not found' });
      }
      if (error.message === 'NOT_ORGANIZATION_MEMBER') {
        return reply.code(403).send({ error: 'Not a member of this organization' });
      }
      throw error;
    }
  });

  // GET /api/v1/bots/:id - Get bot
  app.get('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    if (!user.organizationId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const bot = await botModule.getBot(id, user.organizationId);
    if (!bot) return reply.code(404).send({ error: 'Bot not found' });

    return bot;
  });

  // PUT /api/v1/bots/:id - Update bot
  app.put('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    if (!user.organizationId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    try {
      const bot = await botModule.updateBot(id, user.organizationId, request.body as UpdateBotInput);
      return bot;
    } catch (error: any) {
      if (error.message === 'BOT_NOT_FOUND') {
        return reply.code(404).send({ error: 'Bot not found' });
      }
      throw error;
    }
  });

  // DELETE /api/v1/bots/:id - Delete bot
  app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    if (!user.organizationId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    try {
      await botModule.deleteBot(id, user.organizationId);
      return { success: true };
    } catch (error: any) {
      if (error.message === 'BOT_NOT_FOUND') {
        return reply.code(404).send({ error: 'Bot not found' });
      }
      throw error;
    }
  });

  // POST /api/v1/bots/:id/activate - Activate bot
  app.post('/:id/activate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    if (!user.organizationId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    try {
      const bot = await botModule.activateBot(id, user.organizationId);
      return bot;
    } catch (error: any) {
      if (error.message === 'BOT_NOT_FOUND') {
        return reply.code(404).send({ error: 'Bot not found' });
      }
      throw error;
    }
  });

  // POST /api/v1/bots/:id/deactivate - Deactivate bot
  app.post('/:id/deactivate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    if (!user.organizationId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    try {
      const bot = await botModule.deactivateBot(id, user.organizationId);
      return bot;
    } catch (error: any) {
      if (error.message === 'BOT_NOT_FOUND') {
        return reply.code(404).send({ error: 'Bot not found' });
      }
      throw error;
    }
  });

  // ========== TRAINING ROUTES ==========

  // POST /api/v1/bots/:id/train - Trigger training
  app.post('/:id/train', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    if (!user.organizationId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    try {
      const job = await botModule.startTraining(id, user.organizationId);
      return reply.code(202).send({ job });
    } catch (error: any) {
      if (error.message === 'BOT_NOT_FOUND') {
        return reply.code(404).send({ error: 'Bot not found' });
      }
      throw error;
    }
  });

  // GET /api/v1/bots/:id/training/:jobId - Get training status
  app.get('/:id/training/:jobId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const job = await botModule.getTrainingStatus(jobId);
    if (!job) return reply.code(404).send({ error: 'Training job not found' });
    return { job };
  });

  // GET /api/v1/bots/:id/training - Get training history
  app.get('/:id/training', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    if (!user.organizationId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    // Verify bot belongs to user's org
    const bot = await botModule.getBot(id, user.organizationId);
    if (!bot) return reply.code(404).send({ error: 'Bot not found' });

    const history = await botModule.getTrainingHistory(id);
    return { jobs: history };
  });

  // ========== KNOWLEDGE BASE ROUTES ==========

  // POST /api/v1/bots/:id/knowledge-bases - Create knowledge base
  app.post('/:id/knowledge-bases', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    if (!user.organizationId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const bot = await botModule.getBot(id, user.organizationId);
    if (!bot) return reply.code(404).send({ error: 'Bot not found' });

    const kb = await botModule.createKnowledgeBase(id, request.body as CreateKnowledgeBaseInput);
    return reply.code(201).send(kb);
  });

  // GET /api/v1/bots/:id/knowledge-bases - List knowledge bases
  app.get('/:id/knowledge-bases', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;

    if (!user.organizationId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const bot = await botModule.getBot(id, user.organizationId);
    if (!bot) return reply.code(404).send({ error: 'Bot not found' });

    const kbs = await botModule.getKnowledgeBases(id);
    return { knowledgeBases: kbs };
  });

  // GET /api/v1/bots/:id/knowledge-bases/:kbId - Get knowledge base
  app.get('/:id/knowledge-bases/:kbId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { kbId } = request.params as { kbId: string };
    const kb = await botModule.getKnowledgeBase(kbId);
    if (!kb) return reply.code(404).send({ error: 'Knowledge base not found' });
    return kb;
  });

  // PUT /api/v1/bots/:id/knowledge-bases/:kbId - Update knowledge base
  app.put('/:id/knowledge-bases/:kbId', { preHandler: [app.authenticate] }, async (request, _reply) => {
    const { kbId } = request.params as { kbId: string };
    const kb = await botModule.updateKnowledgeBase(kbId, request.body as any);
    return kb;
  });

  // DELETE /api/v1/bots/:id/knowledge-bases/:kbId - Delete knowledge base
  app.delete('/:id/knowledge-bases/:kbId', { preHandler: [app.authenticate] }, async (request, _reply) => {
    const { kbId } = request.params as { kbId: string };
    await botModule.deleteKnowledgeBase(kbId);
    return { success: true };
  });

  // POST /api/v1/bots/:id/knowledge-bases/:kbId/sync - Trigger sync
  app.post('/:id/knowledge-bases/:kbId/sync', { preHandler: [app.authenticate] }, async (request, _reply) => {
    const { kbId } = request.params as { kbId: string };
    await botModule.triggerKnowledgeBaseSync(kbId);
    return { success: true };
  });

  // ========== MODEL ROUTING ==========

  // GET /api/v1/bots/models - Get available models
  app.get('/models', { preHandler: [app.authenticate] }, async () => {
    return { models: await botModule.getAvailableModels() };
  });

  // POST /api/v1/bots/:id/route - Get model routing
  app.post('/:id/route', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { messages } = request.body as { messages: ChatMessage[] };

    if (!messages || !Array.isArray(messages)) {
      return reply.code(400).send({ error: 'Messages array required' });
    }

    const routing = await botModule.routeRequest(id, messages);
    return routing;
  });

  // ========== EMBED SCRIPT ==========

  // GET /api/v1/bots/:id/embed - Get embed script
  app.get('/:id/embed', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { domain } = request.query as { domain: string };

    if (!domain) {
      return reply.code(400).send({ error: 'Domain parameter required' });
    }

    try {
      const script = await botModule.getEmbedScript(id, domain);
      return { script };
    } catch (error: any) {
      if (error.message === 'BOT_NOT_FOUND') {
        return reply.code(404).send({ error: 'Bot not found' });
      }
      if (error.message === 'EMBED_NOT_ALLOWED') {
        return reply.code(403).send({ error: 'Embed not allowed for this bot' });
      }
      throw error;
    }
  });

  // POST /api/v1/bots/:id/embed/validate - Validate embed domain
  app.post('/:id/embed/validate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { domain } = request.body as { domain: string };

    if (!domain) {
      return reply.code(400).send({ error: 'Domain required' });
    }

    const valid = await botModule.validateEmbedDomain(id, domain);
    return { valid };
  });
};

export default botRoutes;