/// <reference path="../fastify.d.ts" />
export const analyticsRoutes = async (app) => {
    app.addHook('preHandler', app.authenticate);
    const getFromDate = (param) => {
        if (Array.isArray(param)) {
            param = param[0];
        }
        return typeof param === 'string' ? new Date(param) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    };
    const getToDate = (param) => {
        if (Array.isArray(param)) {
            param = param[0];
        }
        return typeof param === 'string' ? new Date(param) : new Date();
    };
    app.get('/bot/:botId/overview', async (request, reply) => {
        const { botId } = request.params;
        const query = request.query;
        const fromParam = Array.isArray(query.from) ? query.from[0] : query.from;
        const toParam = Array.isArray(query.to) ? query.to[0] : query.to;
        const dateFrom = getFromDate(fromParam);
        const dateTo = getToDate(toParam);
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Organization ID is required' });
        }
        const orgId = user.organizationId;
        await app.validateBotAccess(botId, orgId);
        const [totalConversations, totalMessages, totalLeads, avgResponseTime, satisfactionRate, conversationsByDay, messagesByDay, leadsByStatus, satisfactionDistribution, responseTimePercentiles, topLanguages,] = await Promise.all([
            app.prisma.conversation.count({
                where: { botId, startedAt: { gte: dateFrom, lte: dateTo } },
            }),
            app.prisma.message.count({
                where: { conversation: { botId }, createdAt: { gte: dateFrom, lte: dateTo } },
            }),
            app.prisma.lead.count({
                where: { botId, createdAt: { gte: dateFrom, lte: dateTo } },
            }),
            // Average response time: compute response time per assistant message, then average
            app.prisma.$queryRaw `
        WITH response_times AS (
          SELECT
            EXTRACT(EPOCH FROM (m."createdAt" - LAG(m."createdAt") OVER (PARTITION BY m."conversationId" ORDER BY m."createdAt"))) as response_time
          FROM "Message" m
          JOIN "Conversation" c ON m."conversationId" = c.id
          WHERE c."botId" = ${botId} AND m.role = 'ASSISTANT' AND m."createdAt" >= ${dateFrom} AND m."createdAt" <= ${dateTo}
        )
        SELECT AVG(response_time)::float as avg_seconds
        FROM response_times
        WHERE response_time IS NOT NULL
      `,
            // Satisfaction rate
            app.prisma.$queryRaw `
        SELECT AVG(rating)::float as avg_rating
        FROM "Conversation"
        WHERE "botId" = ${botId} AND rating IS NOT NULL AND "startedAt" >= ${dateFrom} AND "startedAt" <= ${dateTo}
      `,
            // Conversations by day
            app.prisma.$queryRaw `
        SELECT DATE_TRUNC('day', "startedAt") as day, COUNT(*) as count
        FROM "Conversation"
        WHERE "botId" = ${botId} AND "startedAt" >= ${dateFrom} AND "startedAt" <= ${dateTo}
        GROUP BY day
        ORDER BY day
      `,
            // Messages by day
            app.prisma.$queryRaw `
        SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as count
        FROM "Message"
        WHERE "conversationId" IN (SELECT id FROM "Conversation" WHERE "botId" = ${botId}) AND "createdAt" >= ${dateFrom} AND "createdAt" <= ${dateTo}
        GROUP BY day
        ORDER BY day
      `,
            // Leads by status
            app.prisma.lead.groupBy({
                by: ['status'],
                where: { botId, createdAt: { gte: dateFrom, lte: dateTo } },
                _count: true,
            }),
            // Satisfaction distribution
            app.prisma.$queryRaw `
        SELECT rating, COUNT(*) as count
        FROM "Conversation"
        WHERE "botId" = ${botId} AND rating IS NOT NULL AND "startedAt" >= ${dateFrom} AND "startedAt" <= ${dateTo}
        GROUP BY rating
        ORDER BY rating
      `,
            // Response time percentiles
            app.prisma.$queryRaw `
        WITH response_times AS (
          SELECT
            EXTRACT(EPOCH FROM (m."createdAt" - LAG(m."createdAt") OVER (PARTITION BY m."conversationId" ORDER BY m."createdAt"))) as response_time
          FROM "Message" m
          JOIN "Conversation" c ON m."conversationId" = c.id
          WHERE c."botId" = ${botId} AND m.role = 'ASSISTANT' AND m."createdAt" >= ${dateFrom} AND m."createdAt" <= ${dateTo}
        )
        SELECT 
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time)::float as p50,
          PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY response_time)::float as p90,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time)::float as p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time)::float as p99
        FROM response_times
        WHERE response_time IS NOT NULL
      `,
            // Top languages
            app.prisma.conversation.groupBy({
                by: ['language'],
                where: { botId, startedAt: { gte: dateFrom, lte: dateTo } },
                _count: true,
            }),
        ]);
        reply.send({
            overview: {
                totalConversations,
                totalMessages,
                totalLeads,
                avgResponseTime: avgResponseTime?.[0]?.avg_seconds || 0,
                satisfactionRate: satisfactionRate?.[0]?.avg_rating || 0,
                conversionRate: totalConversations > 0 ? ((totalLeads / totalConversations) * 100).toFixed(1) : 0,
            },
            trends: {
                conversations: conversationsByDay,
                messages: messagesByDay,
            },
            leads: {
                byStatus: leadsByStatus.map((l) => ({ status: l.status, count: l._count })),
            },
            satisfaction: {
                distribution: satisfactionDistribution.map((d) => ({ rating: d.rating, count: Number(d.count) })),
            },
            responseTime: {
                percentiles: responseTimePercentiles?.[0] || { p50: 0, p90: 0, p95: 0, p99: 0 },
            },
            languages: topLanguages.map((l) => ({ language: l.language, count: l._count })),
            period: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
        });
    });
    app.get('/bot/:botId/conversations', async (request, reply) => {
        const { botId } = request.params;
        const { from, to, interval = 'day' } = request.query;
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Organization ID is required' });
        }
        const orgId = user.organizationId;
        await app.validateBotAccess(botId, orgId);
        const dateFrom = getFromDate(from);
        const dateTo = getToDate(to);
        const trunc = interval === 'hour' ? 'hour' : interval === 'week' ? 'week' : 'day';
        const data = await app.prisma.$queryRaw `
      SELECT DATE_TRUNC(${trunc}, "startedAt") as period, COUNT(*) as count
      FROM "Conversation"
      WHERE "botId" = ${botId} AND "startedAt" >= ${dateFrom} AND "startedAt" <= ${dateTo}
      GROUP BY period
      ORDER BY period
    `;
        reply.send({ data, interval });
    });
    app.get('/bot/:botId/satisfaction', async (request, reply) => {
        const { botId } = request.params;
        const { from, to } = request.query;
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Organization ID is required' });
        }
        const orgId = user.organizationId;
        await app.validateBotAccess(botId, orgId);
        const dateFrom = getFromDate(from);
        const dateTo = getToDate(to);
        const [distribution, trend] = await Promise.all([
            app.prisma.$queryRaw `
        SELECT rating, COUNT(*) as count
        FROM "Conversation"
        WHERE "botId" = ${botId} AND rating IS NOT NULL AND "startedAt" >= ${dateFrom} AND "startedAt" <= ${dateTo}
        GROUP BY rating
        ORDER BY rating
      `,
            app.prisma.$queryRaw `
        SELECT DATE_TRUNC('day', "startedAt") as day, AVG(rating)::float as avg_rating
        FROM "Conversation"
        WHERE "botId" = ${botId} AND rating IS NOT NULL AND "startedAt" >= ${dateFrom} AND "startedAt" <= ${dateTo}
        GROUP BY day
        ORDER BY day
      `,
        ]);
        reply.send({
            distribution: distribution.map((d) => ({ rating: d.rating, count: Number(d.count) })),
            trend: trend.map((d) => ({ day: d.day, avgRating: d.avg_rating })),
        });
    });
    app.get('/bot/:botId/response-time', async (request, reply) => {
        const { botId } = request.params;
        const { from, to } = request.query;
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Organization ID is required' });
        }
        const orgId = user.organizationId;
        await app.validateBotAccess(botId, orgId);
        const dateFrom = getFromDate(from);
        const dateTo = getToDate(to);
        const [percentiles, trend] = await Promise.all([
            app.prisma.$queryRaw `
        WITH response_times AS (
          SELECT
            EXTRACT(EPOCH FROM (m."createdAt" - LAG(m."createdAt") OVER (PARTITION BY m."conversationId" ORDER BY m."createdAt"))) as response_time
          FROM "Message" m
          JOIN "Conversation" c ON m."conversationId" = c.id
          WHERE c."botId" = ${botId} AND m.role = 'ASSISTANT' AND m."createdAt" >= ${dateFrom} AND m."createdAt" <= ${dateTo}
        )
        SELECT 
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time)::float as p50,
          PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY response_time)::float as p75,
          PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY response_time)::float as p90,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time)::float as p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time)::float as p99
        FROM response_times
        WHERE response_time IS NOT NULL
      `,
            app.prisma.$queryRaw `
        WITH response_times AS (
          SELECT
            DATE_TRUNC('day', m."createdAt") as day,
            EXTRACT(EPOCH FROM (m."createdAt" - LAG(m."createdAt") OVER (PARTITION BY m."conversationId" ORDER BY m."createdAt"))) as response_time
          FROM "Message" m
          JOIN "Conversation" c ON m."conversationId" = c.id
          WHERE c."botId" = ${botId} AND m.role = 'ASSISTANT' AND m."createdAt" >= ${dateFrom} AND m."createdAt" <= ${dateTo}
        )
        SELECT day, AVG(response_time)::float as avg_response
        FROM response_times
        WHERE response_time IS NOT NULL
        GROUP BY day
        ORDER BY day
      `,
        ]);
        reply.send({
            percentiles: percentiles?.[0] || { p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
            trend: trend.map((d) => ({ day: d.day, avgResponseTime: d.avg_response })),
        });
    });
    app.get('/bot/:botId/leads', async (request, reply) => {
        const { botId } = request.params;
        const { from, to } = request.query;
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Organization ID is required' });
        }
        const orgId = user.organizationId;
        await app.validateBotAccess(botId, orgId);
        const dateFrom = getFromDate(from);
        const dateTo = getToDate(to);
        const [funnel, bySource, byDay, topBots] = await Promise.all([
            app.prisma.lead.groupBy({
                by: ['status'],
                where: { botId, createdAt: { gte: dateFrom, lte: dateTo } },
                _count: true,
            }),
            app.prisma.lead.groupBy({
                by: ['source'],
                where: { botId, createdAt: { gte: dateFrom, lte: dateTo } },
                _count: true,
            }),
            app.prisma.$queryRaw `
        SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*) as count
        FROM "Lead"
        WHERE "botId" = ${botId} AND "createdAt" >= ${dateFrom} AND "createdAt" <= ${dateTo}
        GROUP BY day
        ORDER BY day
      `,
            app.prisma.lead.groupBy({
                by: ['botId'],
                where: { createdAt: { gte: dateFrom, lte: dateTo } },
                _count: true,
                orderBy: { _count: { botId: 'desc' } },
                take: 5,
            }),
        ]);
        reply.send({
            funnel: funnel.map((f) => ({ status: f.status, count: f._count })),
            bySource: bySource.map((s) => ({ source: s.source, count: s._count })),
            byDay: byDay.map((d) => ({ day: d.day, count: Number(d.count) })),
            topBots: topBots.map((b) => ({ botId: b.botId, count: b._count })),
        });
    });
    app.get('/bot/:botId/top-questions', async (request, reply) => {
        const { botId } = request.params;
        const { from, to, limit = 20 } = request.query;
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Organization ID is required' });
        }
        const orgId = user.organizationId;
        await app.validateBotAccess(botId, orgId);
        const dateFrom = getFromDate(from);
        const dateTo = getToDate(to);
        // Simple approach: get user messages and group by similarity
        // In production, use embedding clustering or LLM summarization
        const messages = await app.prisma.message.findMany({
            where: {
                role: 'USER',
                conversation: { botId, startedAt: { gte: dateFrom, lte: dateTo } },
            },
            select: { content: true },
            take: 1000,
        });
        // Simple frequency analysis (in production, use semantic clustering)
        const questionCounts = {};
        messages.forEach((m) => {
            const normalized = m.content.toLowerCase().trim()
                .replace(/[؟?!.،,]/g, '')
                .replace(/\s+/g, ' ')
                .substring(0, 100);
            questionCounts[normalized] = (questionCounts[normalized] || 0) + 1;
        });
        const topQuestions = Object.entries(questionCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, Number(limit))
            .map(([question, count]) => ({ question, count }));
        reply.send({ topQuestions, period: { from: dateFrom.toISOString(), to: dateTo.toISOString() } });
    });
    app.get('/bot/:botId/export', async (request, reply) => {
        const { botId } = request.params;
        const { type = 'conversations', format = 'json', from, to } = request.query;
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Organization ID is required' });
        }
        const orgId = user.organizationId;
        await app.validateBotAccess(botId, orgId);
        const dateFrom = getFromDate(from);
        const dateTo = getToDate(to);
        let data;
        let filename;
        if (type === 'conversations') {
            data = await app.prisma.conversation.findMany({
                where: { botId, startedAt: { gte: dateFrom, lte: dateTo } },
                include: { messages: true, lead: true },
                orderBy: { startedAt: 'desc' },
            });
            filename = `conversations-${botId}-${Date.now()}`;
        }
        else if (type === 'leads') {
            data = await app.prisma.lead.findMany({
                where: { botId, createdAt: { gte: dateFrom, lte: dateTo } },
                include: { bot: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
            });
            filename = `leads-${botId}-${Date.now()}`;
        }
        else {
            data = await app.prisma.message.findMany({
                where: { conversation: { botId }, createdAt: { gte: dateFrom, lte: dateTo } },
                include: { conversation: { select: { id: true, sessionId: true } } },
                orderBy: { createdAt: 'desc' },
                take: 10000,
            });
            filename = `messages-${botId}-${Date.now()}`;
        }
        if (format === 'csv') {
            // Convert to CSV
            const headers = Object.keys(data[0] || {}).filter(k => typeof data[0][k] !== 'object');
            const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))].join('\n');
            return reply
                .header('Content-Type', 'text/csv')
                .header('Content-Disposition', `attachment; filename="${filename}.csv"`)
                .send(csv);
        }
        return reply
            .header('Content-Type', 'application/json')
            .header('Content-Disposition', `attachment; filename="${filename}.json"`)
            .send(data);
    });
};
