export const partnersRoutes = async (app) => {
    // ===== GET /api/v1/partners/organizations =====
    app.get('/organizations', { preHandler: [app.authenticate] }, async (request, reply) => {
        const user = request.user;
        if (!user || !user.organizationId) {
            return reply.code(400).send({ error: 'User not associated with an organization' });
        }
        // Find the user's organization and its partners
        const org = await app.prisma.organization.findUnique({
            where: { id: user.organizationId },
            include: { partners: { select: { id: true, name: true, email: true, isActive: true, createdAt: true } } },
        });
        return org?.partners || [];
    });
};
