import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with real test data...');

  // =========================================================================
  // 1. CREATE TEST PARTNER
  // =========================================================================
  const partnerPassword = await bcrypt.hash('partner123', 10);
  
  const partner = await prisma.partner.upsert({
    where: { email: 'partner@atheer-agent.com' },
    update: {},
    create: {
      name: 'Atheer Partner Demo',
      email: 'partner@atheer-agent.com',
      passwordHash: partnerPassword,
      isActive: true,
    },
  });
  console.log('✅ Partner created:', partner.email);

  // =========================================================================
  // 2. CREATE LICENSE FOR PARTNER
  // =========================================================================
  const license = await prisma.license.upsert({
    where: { partnerId: partner.id },
    update: {},
    create: {
      partnerId: partner.id,
      plan: 'ENTERPRISE',
      expiresAt: new Date('2027-12-31'),
      maxOrganizations: 100,
      maxBots: 500,
      maxUsers: 1000,
      maxMessages: 10000000,
      maxStorage: 1000000,
      status: 'ACTIVE',
    },
  });
  console.log('✅ License created:', license.plan);

  // =========================================================================
  // 3. CREATE BRAND FOR PARTNER
  // =========================================================================
  const brand = await prisma.brand.upsert({
    where: { partnerId: partner.id },
    update: {},
    create: {
      partnerId: partner.id,
      brandName: 'Atheer AI',
      primaryColor: '#2563eb',
      secondaryColor: '#ffffff',
      emailSender: 'noreply@atheer-agent.com',
      supportEmail: 'support@atheer-agent.com',
    },
  });
  console.log('✅ Brand created:', brand.brandName);

  // =========================================================================
  // 4. CREATE TEST ORGANIZATION
  // =========================================================================
  const organization = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      domain: 'demo.atheer-agent.com',
      description: 'Demo organization for testing',
      industry: 'Technology',
      size: '51-200',
      website: 'https://demo.atheer-agent.com',
      email: 'contact@demo.atheer-agent.com',
      status: 'ACTIVE',
      plan: 'PROFESSIONAL',
    },
  });
  console.log('✅ Organization created:', organization.name);

  // Link organization to partner
  await prisma.partner.update({
    where: { id: partner.id },
    data: {
      organizations: {
        connect: { id: organization.id },
      },
    },
  });
  console.log('✅ Organization linked to partner');

  // =========================================================================
  // 5. CREATE USERS
  // =========================================================================
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.atheer-agent.com' },
    update: {},
    create: {
      email: 'admin@demo.atheer-agent.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
      organizationId: organization.id,
      emailVerified: new Date(),
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  const regularUser = await prisma.user.upsert({
    where: { email: 'user@demo.atheer-agent.com' },
    update: {},
    create: {
      email: 'user@demo.atheer-agent.com',
      passwordHash: userPassword,
      name: 'Regular User',
      role: 'MEMBER',
      organizationId: organization.id,
      emailVerified: new Date(),
    },
  });
  console.log('✅ Regular user created:', regularUser.email);

  // Organization membership
  await prisma.organizationMember.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      organizationId: organization.id,
      role: 'ADMIN',
    },
  });

  await prisma.organizationMember.upsert({
    where: { userId: regularUser.id },
    update: {},
    create: {
      userId: regularUser.id,
      organizationId: organization.id,
      role: 'MEMBER',
    },
  });
  console.log('✅ Organization memberships created');

  // =========================================================================
  // 6. CREATE TEST BOTS
  // =========================================================================
  const supportBot = await prisma.bot.upsert({
    where: { id: 'support-bot-001' },
    update: {},
    create: {
      id: 'support-bot-001',
      name: 'Customer Support Bot',
      description: 'Handles customer inquiries and support tickets',
      type: 'CUSTOMER_SUPPORT',
      status: 'ACTIVE',
      primaryColor: '#2563eb',
      welcomeMessage: 'مرحباً! كيف يمكنني مساعدتك اليوم؟',
      language: 'ar',
      supportedLanguages: ['ar', 'en'],
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 2000,
      systemPrompt: 'أنت مساعد ذكي لخدمة العملاء. ساعد العملاء بأسلوب ودود ومهني.',
      collectLeads: true,
      leadFields: JSON.stringify([
        { name: 'name', label: 'الاسم', required: true },
        { name: 'email', label: 'البريد الإلكتروني', required: true },
        { name: 'phone', label: 'رقم الهاتف', required: false },
      ]),
      notifyOnLead: true,
      organizationId: organization.id,
      ownerId: adminUser.id,
    },
  });
  console.log('✅ Support bot created:', supportBot.name);

  const leadBot = await prisma.bot.upsert({
    where: { id: 'lead-bot-001' },
    update: {},
    create: {
      id: 'lead-bot-001',
      name: 'Lead Generation Bot',
      description: 'Captures and qualifies leads',
      type: 'LEAD_GENERATION',
      status: 'ACTIVE',
      primaryColor: '#16a34a',
      welcomeMessage: 'أهلاً بك! هل تبحث عن حلول لشركتك؟',
      language: 'ar',
      supportedLanguages: ['ar', 'en'],
      model: 'gpt-4o',
      temperature: 0.5,
      maxTokens: 1500,
      systemPrompt: 'أنت مساعد لتوليد العملاء المحتملين. اجمع المعلومات الأساسية من الزوار.',
      collectLeads: true,
      leadFields: JSON.stringify([
        { name: 'name', label: 'الاسم', required: true },
        { name: 'email', label: 'البريد الإلكتروني', required: true },
        { name: 'company', label: 'الشركة', required: true },
        { name: 'position', label: 'المنصب', required: false },
        { name: 'phone', label: 'رقم الهاتف', required: false },
      ]),
      notifyOnLead: true,
      organizationId: organization.id,
      ownerId: adminUser.id,
    },
  });
  console.log('✅ Lead bot created:', leadBot.name);

  // =========================================================================
  // 7. CREATE KNOWLEDGE BASES
  // =========================================================================
  const kb = await prisma.knowledgeBase.upsert({
    where: { id: 'kb-support-001' },
    update: {},
    create: {
      id: 'kb-support-001',
      name: 'Support Documentation',
      type: 'text',
      source: 'Internal docs',
      content: `منتجاتنا:
- Atheer Chat: منصة محادثة ذكية
- Atheer Bot: بوتات خدمة العملاء
- Atheer Analytics: تحليلات المحادثات

الأسعار:
- Starter: $29/شهر
- Professional: $99/شهر  
- Enterprise: تواصل معنا

ساعات الدعم: 24/7
قنوات الدعم: الشات، الإيميل، الهاتف`,
      chunksCount: 0,
      status: 'COMPLETED',
      botId: supportBot.id,
    },
  });
  console.log('✅ Knowledge base created:', kb.name);

  // =========================================================================
  // 8. CREATE CONVERSATIONS & MESSAGES (Realistic test data)
  // =========================================================================
  const conversationData = [
    {
      sessionId: 'session-001',
      visitorId: 'visitor-001',
      language: 'ar',
      status: 'CLOSED' as const,
      messageCount: 5,
      botId: supportBot.id,
      organizationId: organization.id,
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
      rating: 5,
      messages: [
        { role: 'USER' as const, content: 'مرحباً، لدي مشكلة في تسجيل الدخول', tokens: 15 },
        { role: 'ASSISTANT' as const, content: 'أهلاً بك! ما هي المشكلة التي تواجهها في تسجيل الدخول؟', tokens: 25 },
        { role: 'USER' as const, content: 'أدخل كلمة المرور الصحيحة لكن يقول لي كلمة مرور خاطئة', tokens: 20 },
        { role: 'ASSISTANT' as const, content: 'جرب إعادة تعيين كلمة المرور من رابط "نسيت كلمة المرور"', tokens: 30 },
        { role: 'USER' as const, content: 'شكراً، نجح الأمر!', tokens: 10 },
      ]
    },
    {
      sessionId: 'session-002',
      visitorId: 'visitor-002',
      language: 'ar',
      status: 'ACTIVE' as const,
      messageCount: 3,
      botId: supportBot.id,
      organizationId: organization.id,
      startedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      rating: null,
      messages: [
        { role: 'USER' as const, content: 'ما هي أسعار الباقات؟', tokens: 12 },
        { role: 'ASSISTANT' as const, content: 'لدينا 3 باقات: Starter ($29)، Professional ($99)، Enterprise (مخصص)', tokens: 35 },
        { role: 'USER' as const, content: 'أريد الباقة الاحترافية', tokens: 15 },
      ]
    },
    {
      sessionId: 'session-003',
      visitorId: 'visitor-003',
      language: 'en',
      status: 'CLOSED' as const,
      messageCount: 6,
      botId: leadBot.id,
      organizationId: organization.id,
      startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000),
      rating: 4,
      messages: [
        { role: 'USER' as const, content: 'Hello, I want to know about your enterprise features', tokens: 18 },
        { role: 'ASSISTANT' as const, content: 'Our enterprise plan includes custom integrations, dedicated support, SLA, and advanced analytics.', tokens: 40 },
        { role: 'USER' as const, content: 'Can I schedule a demo?', tokens: 10 },
        { role: 'ASSISTANT' as const, content: 'Sure! Please provide your name, email, company, and preferred time.', tokens: 28 },
        { role: 'USER' as const, content: 'John Smith, john@acme.com, Acme Corp, tomorrow 10am', tokens: 22 },
        { role: 'ASSISTANT' as const, content: 'Thank you! Our team will contact you shortly to confirm the demo.', tokens: 25 },
      ]
    },
    {
      sessionId: 'session-004',
      visitorId: 'visitor-004',
      language: 'ar',
      status: 'ACTIVE' as const,
      messageCount: 2,
      botId: leadBot.id,
      organizationId: organization.id,
      startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      messages: [
        { role: 'USER' as const, content: 'أحتاج مساعدة في إعداد البوت', tokens: 15 },
        { role: 'ASSISTANT' as const, content: 'بالتأكيد! ما هو نوع البوت الذي تريد إعداده؟', tokens: 20 },
      ]
    },
    {
      sessionId: 'session-005',
      visitorId: 'visitor-005',
      language: 'ar',
      status: 'ESCALATED' as const,
      messageCount: 4,
      botId: supportBot.id,
      organizationId: organization.id,
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 20 * 60 * 1000),
      rating: 2,
      messages: [
        { role: 'USER' as const, content: 'الخدمة سيئة جداً، أريد التحدث مع مدير', tokens: 20 },
        { role: 'ASSISTANT' as const, content: 'أعتذر عن التجربة السيئة. سأحويلك لموظف مباشر فوراً.', tokens: 25 },
        { role: 'USER' as const, content: 'متى سيتصل بي أحد؟', tokens: 12 },
        { role: 'ASSISTANT' as const, content: 'خلال 30 دقيقة سيتصل بك مشرف الدعم', tokens: 18 },
      ]
    }
  ];

  for (const conv of conversationData) {
    const { messages, ...convData } = conv;
    
    const conversation = await prisma.conversation.upsert({
      where: { sessionId: conv.sessionId },
      update: {},
      create: convData,
    });

    // Add messages
    for (let i = 0; i < messages.length; i++) {
      await prisma.message.upsert({
        where: { 
          id: `${conversation.id}-msg-${i}` 
        },
        update: {},
        create: {
          id: `${conversation.id}-msg-${i}`,
          role: messages[i].role,
          content: messages[i].content,
          tokens: messages[i].tokens,
          model: 'gpt-4o',
          conversationId: conversation.id,
          createdAt: new Date(convData.startedAt.getTime() + i * 2 * 60 * 1000),
        },
      });
    }
  }
  console.log('✅ Conversations & messages created:', conversationData.length);

  // =========================================================================
  // 9. CREATE LEADS
  // =========================================================================
  const leads = [
    {
      name: 'John Smith',
      email: 'john@acme.com',
      phone: '+1-555-0100',
      company: 'Acme Corp',
      position: 'CTO',
      status: 'QUALIFIED' as const,
      source: 'chat_widget',
      botId: leadBot.id,
      conversationId: conversationData[2].sessionId,
      organizationId: organization.id,
      score: 85,
    },
    {
      name: 'سارة أحمد',
      email: 'sara@techstart.io',
      phone: '+966-50-123-4567',
      company: 'TechStart',
      position: 'مديرة التسويق',
      status: 'CONVERTED' as const,
      source: 'chat_widget',
      botId: supportBot.id,
      organizationId: organization.id,
      score: 90,
      convertedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'Michael Chen',
      email: 'mchen@globaltech.com',
      phone: '+1-555-0200',
      company: 'GlobalTech Solutions',
      position: 'VP Engineering',
      status: 'NEW' as const,
      source: 'chat_widget',
      botId: leadBot.id,
      organizationId: organization.id,
      score: 65,
    },
  ];

  for (const lead of leads) {
    await prisma.lead.upsert({
      where: { id: `${lead.email}-${lead.botId}` },
      update: {},
      create: {
        id: `${lead.email}-${lead.botId}`,
        ...lead,
        conversationId: lead.conversationId ? (await prisma.conversation.findUnique({ where: { sessionId: lead.conversationId } }))?.id : undefined,
      },
    });
  }
  console.log('✅ Leads created:', leads.length);

  // =========================================================================
  // 10. CREATE USAGE DATA
  // =========================================================================
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    await prisma.usage.upsert({
      where: {
        organizationId_date: {
          organizationId: organization.id,
          date,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        date,
        messages: Math.floor(Math.random() * 500) + 100,
        conversations: Math.floor(Math.random() * 50) + 10,
        leads: Math.floor(Math.random() * 5),
        storageMB: Math.floor(Math.random() * 100) + 50,
        tokensUsed: Math.floor(Math.random() * 100000) + 50000,
        apiCalls: Math.floor(Math.random() * 1000) + 500,
        llmCost: Math.random() * 50 + 10,
      },
    });
  }
  console.log('✅ Usage data created: 30 days');

  // =========================================================================
  // 11. CREATE API KEY
  // =========================================================================
  const apiKeyPrefix = 'ak_test';
  const apiKeyRandom = '1234567890abcdef';
  const apiKey = apiKeyPrefix + apiKeyRandom;

  await prisma.apiKey.upsert({
    where: { prefix: apiKeyPrefix + apiKeyRandom.substring(0, 8) },
    update: {},
    create: {
      name: 'Test API Key',
      keyHash: await bcrypt.hash('sk_test_123456789', 10),
      prefix: apiKeyPrefix + apiKeyRandom.substring(0, 8),
      permissions: ['chat:read', 'chat:write', 'bot:read', 'conversation:read', 'lead:read'],
      isActive: true,
      organizationId: organization.id,
      userId: adminUser.id,
    },
  });
  console.log('✅ API Key created:', apiKeyPrefix + apiKeyRandom.substring(0, 8));

  // =========================================================================
  // 12. CREATE NOTIFICATIONS
  // =========================================================================
  await prisma.notification.createMany({
    data: [
      {
        type: 'lead_created',
        title: 'عميل محتمل جديد',
        message: 'تم إنشاء عميل محتمل جديد: سارة أحمد من TechStart',
        channel: 'EMAIL',
        recipient: 'admin@demo.atheer-agent.com',
        status: 'DELIVERED',
        userId: adminUser.id,
        organizationId: organization.id,
      },
      {
        type: 'conversation_escalated',
        title: 'محادثة تم تحويلها',
        message: 'محادثة session-005 تم تحويلها لموظف مباشر',
        channel: 'EMAIL',
        recipient: 'admin@demo.atheer-agent.com',
        status: 'DELIVERED',
        userId: adminUser.id,
        organizationId: organization.id,
      },
    ],
  });
  console.log('✅ Notifications created');

  // =========================================================================
  // 13. CREATE ACTIVITY LOGS
  // =========================================================================
  const activities = [
    { action: 'USER_LOGIN', entityType: 'User', entityId: adminUser.id, metadata: { ip: '192.168.1.1' } },
    { action: 'BOT_CREATED', entityType: 'Bot', entityId: supportBot.id, metadata: { name: supportBot.name } },
    { action: 'CONVERSATION_STARTED', entityType: 'Conversation', entityId: conversationData[0].sessionId, metadata: {} },
    { action: 'LEAD_CREATED', entityType: 'Lead', entityId: leads[0].email + '-' + leadBot.id, metadata: { email: leads[0].email } },
    { action: 'API_KEY_CREATED', entityType: 'ApiKey', entityId: apiKeyPrefix + apiKeyRandom.substring(0, 8), metadata: { prefix: apiKeyPrefix + apiKeyRandom.substring(0, 8) } },
  ];

  for (const act of activities) {
    await prisma.activity.create({
      data: {
        ...act,
        userId: adminUser.id,
        organizationId: organization.id,
        botId: act.entityType === 'Bot' ? act.entityId : undefined,
      },
    });
  }
  console.log('✅ Activity logs created:', activities.length);

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔑 Partner Login:');
  console.log('   Email: partner@atheer-agent.com');
  console.log('   Password: partner123');
  console.log('');
  console.log('🏢 Admin Login:');
  console.log('   Email: admin@demo.atheer-agent.com');
  console.log('   Password: admin123');
  console.log('');
  console.log('👤 User Login:');
  console.log('   Email: user@demo.atheer-agent.com');
  console.log('   Password: user123');
  console.log('');
  console.log('🔌 API Key:');
  console.log(`   ${apiKey}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });