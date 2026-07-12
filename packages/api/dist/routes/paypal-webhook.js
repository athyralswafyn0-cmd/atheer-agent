import { z } from 'zod';
const paypalWebhookSchema = z.object({
    id: z.string(),
    event_version: z.string(),
    create_time: z.string(),
    resource_type: z.string(),
    event_type: z.enum([
        'BILLING.PLAN.ACTIVATED',
        'BILLING.PLAN.CREATED',
        'BILLING.PLAN.DEACTIVATED',
        'BILLING.PLAN.PRICING_CHANGE.ACTIVATED',
        'BILLING.PLAN.PRICING_CHANGE.INPROGRESS',
        'BILLING.PLAN.UPDATED',
        'BILLING.SUBSCRIPTION.ACTIVATED',
        'BILLING.SUBSCRIPTION.CANCELLED',
        'BILLING.SUBSCRIPTION.CREATED',
        'BILLING.SUBSCRIPTION.EXPIRED',
        'BILLING.SUBSCRIPTION.PAYMENT.FAILED',
        'BILLING.SUBSCRIPTION.RE_ACTIVATED',
        'BILLING.SUBSCRIPTION.SUSPENDED',
        'BILLING.SUBSCRIPTION.UPDATED',
    ]),
    summary: z.string(),
    resource: z.record(z.unknown()),
});
export const paypalWebhookRoutes = async (app) => {
    app.post('/paypal', async (request, reply) => {
        try {
            const payload = paypalWebhookSchema.parse(request.body);
            app.log.info({
                event_type: payload.event_type,
                resource_type: payload.resource_type,
                subscription_id: payload.resource?.id
            }, 'PayPal webhook received');
            // Handle subscription events
            switch (payload.event_type) {
                case 'BILLING.SUBSCRIPTION.CREATED':
                    await handleSubscriptionCreated(app, payload.resource);
                    break;
                case 'BILLING.SUBSCRIPTION.ACTIVATED':
                    await handleSubscriptionActivated(app, payload.resource);
                    break;
                case 'BILLING.SUBSCRIPTION.UPDATED':
                    await handleSubscriptionUpdated(app, payload.resource);
                    break;
                case 'BILLING.SUBSCRIPTION.CANCELLED':
                    await handleSubscriptionCancelled(app, payload.resource);
                    break;
                case 'BILLING.SUBSCRIPTION.SUSPENDED':
                    await handleSubscriptionSuspended(app, payload.resource);
                    break;
                case 'BILLING.SUBSCRIPTION.EXPIRED':
                    await handleSubscriptionExpired(app, payload.resource);
                    break;
                case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
                    await handlePaymentFailed(app, payload.resource);
                    break;
                case 'BILLING.SUBSCRIPTION.RE_ACTIVATED':
                    await handleSubscriptionReactivated(app, payload.resource);
                    break;
                default:
                    app.log.info({ event_type: payload.event_type }, 'Unhandled webhook event type');
            }
            return { status: 'ok', message: 'Webhook processed' };
        }
        catch (error) {
            app.log.error({ err: error }, 'PayPal webhook processing failed');
            return reply.code(400).send({ error: 'Invalid webhook payload' });
        }
    });
};
async function handleSubscriptionCreated(app, resource) {
    const subscriptionId = resource.id;
    const planId = resource.plan_id;
    const status = resource.status;
    app.log.info({ subscriptionId, planId, status }, 'Subscription created');
    // Find user by subscription ID or plan ID and update their subscription status
    // You may need to map planId to your internal plan IDs
    // await app.prisma.user.update({ where: { subscriptionId }, data: { subscriptionStatus: status } });
}
async function handleSubscriptionActivated(app, resource) {
    const subscriptionId = resource.id;
    const status = resource.status;
    app.log.info({ subscriptionId, status }, 'Subscription activated');
    // Update user subscription status to active
    // await app.prisma.user.update({ 
    //   where: { subscriptionId }, 
    //   data: { 
    //     subscriptionStatus: 'ACTIVE',
    //     subscriptionActivatedAt: new Date()
    //   } 
    // });
}
async function handleSubscriptionUpdated(app, resource) {
    const subscriptionId = resource.id;
    const status = resource.status;
    app.log.info({ subscriptionId, status }, 'Subscription updated');
    // Update user subscription details
    // await app.prisma.user.update({ 
    //   where: { subscriptionId }, 
    //   data: { subscriptionStatus: status } 
    // });
}
async function handleSubscriptionCancelled(app, resource) {
    const subscriptionId = resource.id;
    app.log.info({ subscriptionId }, 'Subscription cancelled');
    // Update user subscription status
    // await app.prisma.user.update({ 
    //   where: { subscriptionId }, 
    //   data: { 
    //     subscriptionStatus: 'CANCELLED',
    //     subscriptionCancelledAt: new Date()
    //   } 
    // });
}
async function handleSubscriptionSuspended(app, resource) {
    const subscriptionId = resource.id;
    const reason = resource.suspension_reason;
    app.log.info({ subscriptionId, reason }, 'Subscription suspended');
    // await app.prisma.user.update({ 
    //   where: { subscriptionId }, 
    //   data: { subscriptionStatus: 'SUSPENDED' } 
    // });
}
async function handleSubscriptionExpired(app, resource) {
    const subscriptionId = resource.id;
    app.log.info({ subscriptionId }, 'Subscription expired');
    // await app.prisma.user.update({ 
    //   where: { subscriptionId }, 
    //   data: { 
    //     subscriptionStatus: 'EXPIRED',
    //     subscriptionExpiredAt: new Date()
    //   } 
    // });
}
async function handlePaymentFailed(app, resource) {
    const subscriptionId = resource.id;
    const paymentFailureReason = resource.payment_failure_reason;
    app.log.warn({ subscriptionId, paymentFailureReason }, 'Subscription payment failed');
    // await app.prisma.user.update({ 
    //   where: { subscriptionId }, 
    //   data: { 
    //     subscriptionStatus: 'PAYMENT_FAILED',
    //     lastPaymentFailureReason: paymentFailureReason
    //   } 
    // });
    // Could trigger email notification to user
}
async function handleSubscriptionReactivated(app, resource) {
    const subscriptionId = resource.id;
    app.log.info({ subscriptionId }, 'Subscription reactivated');
    // await app.prisma.user.update({ 
    //   where: { subscriptionId }, 
    //   data: { subscriptionStatus: 'ACTIVE' } 
    // });
}
