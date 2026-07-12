export const leadRoutes = async (app) => {
    // Get leads for a bot
    app.get('/bot/:botId', async (request, reply) => {
        const { botId } = request.params;
        const { page = 1, limit = 10, status, search } = request.query;
        // Validate bot access
        await app.validateBotAccess(botId, request.user?.organizationId ?? '');
        // Build where clause
        const where = { botId };
        if (status)
            where.status = status;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [leads, total] = await Promise.all([
            app.prisma.lead.findMany({
                where,
                skip: (Number(page) - 1) * Number(limit),
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
                include: { bot: { select: { name: true } } },
            }),
            app.prisma.lead.count({ where }),
        ]);
        reply.send({ leads, total, page: Number(page), limit: Number(limit) });
    });
    // Create a new lead
    app.post('/', async (request, reply) => {
        const data = request.body;
        // Validate bot access
        await app.validateBotAccess(data.botId, request.user?.organizationId ?? '');
        const lead = await app.prisma.lead.create({
            data: {
                ...data,
                status: 'NEW',
            },
        });
        reply.code(201).send({ lead });
    });
    // Get lead by id
    app.get('/:id', async (request, reply) => {
        const { id } = request.params;
        const lead = await app.prisma.lead.findFirst({
            where: { id, bot: { organizationId: request.user?.organizationId ?? '' } },
            include: { bot: { select: { name: true } } },
        });
        if (!lead) {
            return reply.code(404).send({ error: 'Lead not found' });
        }
        reply.send({ lead });
    });
    // Update lead
    app.put('/:id', async (request, reply) => {
        const { id } = request.params;
        const data = request.body;
        const lead = await app.prisma.lead.findFirst({
            where: { id, bot: { organizationId: request.user?.organizationId ?? '' } },
        });
        if (!lead) {
            return reply.code(404).send({ error: 'Lead not found' });
        }
        const updated = await app.prisma.lead.update({
            where: { id },
            data,
            include: { bot: { select: { name: true } } },
        });
        reply.send({ lead: updated });
    });
    // Delete lead
    app.delete('/:id', async (request, reply) => {
        const { id } = request.params;
        const lead = await app.prisma.lead.findFirst({
            where: { id, bot: { organizationId: request.user?.organizationId ?? '' } },
        });
        if (!lead) {
            return reply.code(404).send({ error: 'Lead not found' });
        }
        await app.prisma.lead.delete({ where: { id } });
        reply.send({ message: 'Lead deleted' });
    });
    // Convert lead
    app.post('/:id/convert', async (request, reply) => {
        const { id } = request.params;
        const lead = await app.prisma.lead.findFirst({
            where: { id, bot: { organizationId: request.user?.organizationId ?? '' } },
        });
        if (!lead) {
            return reply.code(404).send({ error: 'Lead not found' });
        }
        const updated = await app.prisma.lead.update({
            where: { id },
            data: { status: 'CONVERTED' },
        });
        reply.send({ lead: updated });
    });
    // Bulk export leads
    app.post('/bulk-export', async (request, reply) => {
        const { botId, format = 'csv', status } = request.body;
        await app.validateBotAccess(botId, request.user?.organizationId ?? '');
        const where = { botId };
        if (status)
            where.status = status;
        const leads = await app.prisma.lead.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { bot: { select: { name: true } } },
        });
        if (format === 'csv') {
            const headers = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Source', 'Created At', 'Bot'];
            const rows = leads.map(l => [
                l.name,
                l.email || '',
                l.phone || '',
                l.company || '',
                l.status,
                l.source,
                l.createdAt.toISOString(),
                l.bot.name,
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
            reply.send({ csv, filename: `leads-${botId}-${Date.now()}.csv` });
        }
        else {
            reply.send({ leads: leads.map(l => ({ ...l, metadata: undefined })) });
        }
    });
};
