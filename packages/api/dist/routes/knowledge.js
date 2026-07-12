import { z } from 'zod';
const createKBItemSchema = z.object({
    name: z.string().min(2).max(100),
    type: z.enum(['PDF', 'URL', 'TEXT', 'SITEMAP', 'QA']),
    source: z.string().min(1),
    content: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
});
export const knowledgeRoutes = async (app) => {
    app.addHook('preHandler', app.authenticate);
    app.get('/bot/:botId', async (request) => {
        const { botId } = request.params;
        const { page = 1, limit = 20, status } = request.query;
        const organizationId = request.user?.organizationId ?? '';
        await app.validateBotAccess(botId, organizationId);
        const where = {
            botId,
            ...(status && { status }),
        };
        const [items, total] = await Promise.all([
            app.prisma.knowledgeBase.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            app.prisma.knowledgeBase.count({ where }),
        ]);
        return {
            items,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    });
    app.post('/bot/:botId', async (request, reply) => {
        const { botId } = request.params;
        const data = createKBItemSchema.parse(request.body);
        const organizationId = request.user?.organizationId ?? '';
        await app.validateBotAccess(botId, organizationId);
        const kb = await app.prisma.knowledgeBase.create({
            data: {
                ...data,
                botId,
                status: 'pending',
                metadata: data.metadata ?? undefined,
            },
        });
        await app.queue.add('process-knowledge-base', { knowledgeBaseId: kb.id });
        return reply.code(201).send({ knowledgeBase: kb });
    });
    app.post('/bot/:botId/bulk', async (request, reply) => {
        const { botId } = request.params;
        const items = z.array(createKBItemSchema).parse(request.body);
        const organizationId = request.user?.organizationId ?? '';
        await app.validateBotAccess(botId, organizationId);
        const kbs = await Promise.all(items.map((data) => app.prisma.knowledgeBase.create({
            data: { ...data, botId, status: 'pending', metadata: data.metadata ?? undefined },
        })));
        await Promise.all(kbs.map((kb) => app.queue.add('process-knowledge-base', { knowledgeBaseId: kb.id })));
        return reply.code(201).send({ knowledgeBases: kbs });
    });
    app.patch('/:id', async (request, reply) => {
        const { id } = request.params;
        const data = createKBItemSchema.partial().parse(request.body);
        const organizationId = request.user?.organizationId ?? '';
        const kb = await app.prisma.knowledgeBase.findFirst({
            where: { id, bot: { organizationId } },
        });
        if (!kb) {
            return reply.code(404).send({ error: 'Knowledge base not found' });
        }
        const updated = await app.prisma.knowledgeBase.update({
            where: { id },
            data: { ...data, status: 'pending', metadata: data.metadata ?? undefined },
        });
        await app.queue.add('process-knowledge-base', { knowledgeBaseId: updated.id });
        return { knowledgeBase: updated };
    });
    app.delete('/:id', async (request, reply) => {
        const { id } = request.params;
        const organizationId = request.user?.organizationId ?? '';
        const kb = await app.prisma.knowledgeBase.findFirst({
            where: { id, bot: { organizationId } },
        });
        if (!kb) {
            return reply.code(404).send({ error: 'Knowledge base not found' });
        }
        await app.prisma.knowledgeBase.delete({ where: { id } });
        return { message: 'Knowledge base deleted' };
    });
    app.post('/:id/reprocess', async (request, reply) => {
        const { id } = request.params;
        const organizationId = request.user?.organizationId ?? '';
        const kb = await app.prisma.knowledgeBase.findFirst({
            where: { id, bot: { organizationId } },
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
    app.get('/:id/chunks', async (request) => {
        const { id } = request.params;
        const { page = 1, limit = 50 } = request.query;
        const organizationId = request.user?.organizationId ?? '';
        const kb = await app.prisma.knowledgeBase.findFirst({
            where: { id, bot: { organizationId } },
        });
        if (!kb) {
            throw new Error('Knowledge base not found');
        }
        const [chunks, total] = await Promise.all([
            app.prisma.knowledgeChunk.findMany({
                where: { knowledgeBaseId: id },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { chunkIndex: 'asc' },
            }),
            app.prisma.knowledgeChunk.count({ where: { knowledgeBaseId: id } }),
        ]);
        return {
            chunks,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    });
};
