import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { InputJsonValue } from '@prisma/client/runtime/library';

const createKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['PDF', 'URL', 'TEXT', 'SITEMAP', 'QA']),
  source: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

const updateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['PDF', 'URL', 'TEXT', 'SITEMAP', 'QA']).optional(),
  source: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const knowledgeBaseRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/bot/:botId', async (request) => {
    const { botId } = request.params as { botId: string };
    const { page = 1, limit = 20 } = request.query as { page?: number; limit?: number };

    await app.validateBotAccess(botId, request.user?.organizationId ?? '');

    const [items, total] = await Promise.all([
      app.prisma.knowledgeBase.findMany({
        where: { botId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      app.prisma.knowledgeBase.count({ where: { botId } }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  });

  app.post('/bot/:botId', async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const data = createKnowledgeBaseSchema.parse(request.body);

    await app.validateBotAccess(botId, request.user?.organizationId ?? '');

    const kb = await app.prisma.knowledgeBase.create({
      data: {
        ...data,
        botId,
        status: 'pending',
        metadata: data.metadata as InputJsonValue ?? undefined,
      },
    });

    await app.queue.add('process-knowledge-base', { knowledgeBaseId: kb.id });

    return reply.code(201).send({ knowledgeBase: kb });
  });

  app.post('/bot/:botId/bulk', async (request, reply) => {
    const { botId } = request.params as { botId: string };
    const items = z.array(createKnowledgeBaseSchema).parse(request.body);

    await app.validateBotAccess(botId, request.user?.organizationId ?? '');

    const kbs = await Promise.all(
      items.map((data) =>
        app.prisma.knowledgeBase.create({
          data: { ...data, botId, status: 'pending', metadata: data.metadata as InputJsonValue ?? undefined },
        })
      )
    );

    await Promise.all(
      kbs.map((kb) => app.queue.add('process-knowledge-base', { knowledgeBaseId: kb.id }))
    );

    return reply.code(201).send({ knowledgeBases: kbs });
  });

  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateKnowledgeBaseSchema.parse(request.body);

    const kb = await app.prisma.knowledgeBase.findFirst({
      where: { id, bot: { organizationId: request.user?.organizationId ?? '' } },
    });

    if (!kb) {
      return reply.code(404).send({ error: 'Knowledge base not found' });
    }

    const updated = await app.prisma.knowledgeBase.update({
      where: { id },
      data: { ...data, status: 'pending', metadata: data.metadata as InputJsonValue ?? undefined },
    });

    await app.queue.add('process-knowledge-base', { knowledgeBaseId: updated.id });

    return { knowledgeBase: updated };
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const kb = await app.prisma.knowledgeBase.findFirst({
      where: { id, bot: { organizationId: request.user?.organizationId ?? '' } },
    });

    if (!kb) {
      return reply.code(404).send({ error: 'Knowledge base not found' });
    }

    await app.prisma.knowledgeBase.delete({ where: { id } });

    return { message: 'Knowledge base deleted' };
  });

  app.post('/:id/reprocess', async (request, reply) => {
    const { id } = request.params as { id: string };

    const kb = await app.prisma.knowledgeBase.findFirst({
      where: { id, bot: { organizationId: request.user?.organizationId ?? '' } },
    });

    if (!kb) {
      return reply.code(404).send({ error: 'Knowledge base not found' });
    }

    await app.prisma.knowledgeBase.update({
      where: { id },
      data: { status: 'pending', error: null },
    });

    await app.queue.add('process-knowledge-base', { knowledgeBaseId: id });

    return { message: 'Reprocessing started' };
  });
};