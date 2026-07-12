import { z } from 'zod';
export const widgetRoutes = async (app) => {
    app.addHook('preHandler', async (request, reply) => {
        await app.authenticate(request, reply);
    });
    app.get('/scripts', async (request, reply) => {
        const { page = 1, limit = 20, botId } = request.query;
        const organizationId = request.user?.organizationId ?? '';
        const where = {
            bot: { organizationId },
            ...(botId && { botId }),
        };
        const [scripts, total] = await Promise.all([
            app.prisma.embedScript.findMany({
                where,
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
                include: { bot: { select: { name: true, status: true } } },
            }),
            app.prisma.embedScript.count({ where }),
        ]);
        reply.send({ scripts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    });
    app.post('/scripts', async (request, reply) => {
        const data = createEmbedScriptSchema.parse(request.body);
        const organizationId = request.user?.organizationId ?? '';
        const bot = await app.prisma.bot.findFirst({
            where: { id: data.botId, organizationId },
        });
        if (!bot) {
            return reply.code(404).send({ error: 'Bot not found' });
        }
        const script = await app.prisma.embedScript.create({
            data: {
                domain: data.domain,
                botId: data.botId,
                allowed: true,
                scriptVersion: '1.0.0',
            },
        });
        reply.code(201).send({ script });
    });
    app.patch('/scripts/:id', async (request, reply) => {
        const { id } = request.params;
        const data = updateEmbedScriptSchema.parse(request.body);
        const organizationId = request.user?.organizationId ?? '';
        const script = await app.prisma.embedScript.findFirst({
            where: { id, bot: { organizationId } },
        });
        if (!script) {
            return reply.code(404).send({ error: 'Embed script not found' });
        }
        const updated = await app.prisma.embedScript.update({
            where: { id },
            data,
        });
        reply.send({ script: updated });
    });
    app.delete('/scripts/:id', async (request, reply) => {
        const { id } = request.params;
        const organizationId = request.user?.organizationId ?? '';
        const script = await app.prisma.embedScript.findFirst({
            where: { id, bot: { organizationId } },
        });
        if (!script) {
            return reply.code(404).send({ error: 'Embed script not found' });
        }
        await app.prisma.embedScript.delete({ where: { id } });
        reply.send({ message: 'Embed script deleted' });
    });
};
const createEmbedScriptSchema = z.object({
    botId: z.string().cuid(),
    domain: z.string().min(1).max(255),
});
const updateEmbedScriptSchema = z.object({
    domain: z.string().min(1).max(255).optional(),
    allowed: z.boolean().optional(),
});
