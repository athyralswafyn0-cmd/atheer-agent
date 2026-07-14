/// <reference path="../fastify.d.ts" />

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const createBotSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  systemPrompt: z.string().max(5000).optional(),
  welcomeMessage: z.string().max(500).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).optional(),
  language: z.string().optional(),
  model: z.enum(['gpt-4-turbo-preview', 'gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'gemini-1.5-pro', 'gemini-1.5-flash', 'llama-3.1-405b', 'llama-3.1-70b', 'llama-3.1-8b', 'mixtral-8x7b', 'mistral-large', 'mistral-small']).optional(),
  notifyOnLead: z.boolean().optional(),
  notificationChannels: z.array(z.enum(['EMAIL', 'TELEGRAM', 'SLACK', 'WEBHOOK'])).optional(),
  notificationEmails: z.array(z.string().email()).optional(),
});

const updateBotSchema = createBotSchema.partial();

export const botRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    await app.authenticate(request, reply);
  });

  app.get('/', async (request) => {
    const { page = 1, limit = 10, search, status } = request.query as {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    };

    let statusEnum: import('@prisma/client').BotStatus | undefined;
    if (status) {
      const s = status as string;
      if (['ACTIVE', 'INACTIVE', 'TRAINING', 'ERROR'].includes(s)) {
        statusEnum = s as import('@prisma/client').BotStatus;
      }
    }

    // Ensure user and organizationId exist
    const user = request.user;
    if (!user || !user.organizationId) {
      return { bots: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
    const organizationId = user.organizationId;

    const where = {
      organizationId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(statusEnum && { status: { equals: statusEnum } }),
    };

    const [bots, total] = await Promise.all([
      app.prisma.bot.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          knowledgeBases: true,
          _count: {
            select: { conversations: true, knowledgeBases: true, leads: true },
          },
          owner: { select: { id: true, name: true, email: true } },
        },
      }),
      app.prisma.bot.count({ where }),
    ]);

    return {
      bots,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    if (!user || !user.organizationId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const organizationId = user.organizationId;

    const bot = await app.prisma.bot.findFirst({
      where: { id, organizationId },
      include: {
        knowledgeBases: true,
        embedScripts: true,
        conversations: {
          take: 5,
          orderBy: { startedAt: 'desc' },
          include: { _count: { select: { messages: true } } },
        },
        leads: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    if (!bot) {
      return reply.code(404).send({ error: 'Bot not found' });
    }

    return { bot };
  });

  app.post('/', async (request, reply) => {
    const data = createBotSchema.parse(request.body);
    const user = request.user;
    if (!user || !user.organizationId || !user.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const organizationId = user.organizationId;
    const userId = user.userId;

    const bot = await app.prisma.bot.create({
      data: {
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt ?? 'You are a helpful AI assistant.',
        welcomeMessage: data.welcomeMessage ?? 'Hello! How can I help you today?',
        primaryColor: data.primaryColor ?? '#2563eb',
        secondaryColor: data.secondaryColor ?? '#ffffff',
        position: data.position ?? 'bottom-right',
        language: data.language ?? 'ar',
        notifyOnLead: data.notifyOnLead ?? true,
        notificationChannels: data.notificationChannels ?? ['EMAIL'],
        notificationEmails: data.notificationEmails ?? [],
        organizationId,
        ownerId: userId,
      },
    });

    await app.prisma.activity.create({
      data: {
        action: 'bot_created',
        entityType: 'bot',
        entityId: bot.id,
        organizationId,
        userId,
        metadata: { botName: bot.name },
      },
    });

    return reply.code(201).send({ bot });
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateBotSchema.parse(request.body);
    const user = request.user;
    if (!user || !user.organizationId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const organizationId = user.organizationId;

    const existing = await app.prisma.bot.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Bot not found' });
    }

    const bot = await app.prisma.bot.update({
      where: { id },
      data: {
        ...data,
      },
    });

    await app.prisma.activity.create({
      data: {
        action: 'bot_updated',
        entityType: 'bot',
        entityId: bot.id,
        organizationId,
        userId: user.userId,
        metadata: { changes: Object.keys(data) },
      },
    });

    return { bot };
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    if (!user || !user.organizationId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const organizationId = user.organizationId;

    const existing = await app.prisma.bot.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Bot not found' });
    }

    await app.prisma.bot.delete({ where: { id } });

    await app.prisma.activity.create({
      data: {
        action: 'bot_deleted',
        entityType: 'bot',
        entityId: id,
        organizationId,
        userId: user.userId,
        metadata: { botName: existing.name },
      },
    });

    return { message: 'Bot deleted successfully' };
  });

  app.post('/:id/duplicate', async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user;
    if (!user || !user.organizationId || !user.userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const organizationId = user.organizationId;
    const userId = user.userId;

    const existing = await app.prisma.bot.findFirst({
      where: { id, organizationId },
      include: { knowledgeBases: true },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Bot not found' });
    }

    const bot = await app.prisma.bot.create({
      data: {
        name: `${existing.name} (Copy)`,
        description: existing.description,
        systemPrompt: existing.systemPrompt,
        welcomeMessage: existing.welcomeMessage,
        primaryColor: existing.primaryColor,
        secondaryColor: existing.secondaryColor,
        position: existing.position,
        language: existing.language,
        notifyOnLead: existing.notifyOnLead,
        notificationChannels: existing.notificationChannels,
        notificationEmails: existing.notificationEmails,
        organizationId,
        ownerId: userId,
        knowledgeBases: {
          create: existing.knowledgeBases.map(kb => ({
            name: kb.name,
            type: kb.type,
            source: kb.source,
            content: kb.content,
            chunksCount: kb.chunksCount,
            status: 'pending',
            metadata: kb.metadata ?? undefined,
          })),
        },
      },
    });

    return reply.code(201).send({ bot });
  });
};