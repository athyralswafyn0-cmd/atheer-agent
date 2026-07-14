/// <reference types="vitest" />
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/index.js';
import { PrismaClient, createTestUser, createTestOrg, createTestPartner, createTestBot, cleanupTestData } from '../setup.js';

describe('Core Modules Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let authToken: string;
  let testUserId: string;
  let testOrgId: string;
  let testPartnerId: string;
  let testBotId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    prisma = new PrismaClient();
    
    // Clean up before all tests (correct order to respect foreign keys)
      await prisma.bot.deleteMany({ where: { name: { contains: 'Test Bot' } } });
      await prisma.organizationMember.deleteMany({ where: { user: { email: { contains: 'test-' } } } });
      await prisma.organization.deleteMany({ where: { name: { contains: 'Test Org' } } });
      await prisma.user.deleteMany({ where: { email: { contains: 'test-' } } });
      await prisma.license.deleteMany({ where: { partner: { name: { contains: 'Test' } } } });
      await prisma.partner.deleteMany({ where: { name: { contains: 'Test Partner' } } });
      await prisma.embedScript.deleteMany({ where: { domain: { contains: 'test' } } });
      await prisma.brand.deleteMany({ where: { customDomain: { contains: 'test' } } });
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  // ============================================
  // AUTH MODULE TESTS
  // ============================================
  describe('Auth Module', () => {
    it('should register a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'test-user@example.com',
          password: 'Password123!',
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.user).toBeDefined();
      expect(body.tokens).toBeDefined();
      expect(body.tokens.accessToken).toBeDefined();
      expect(body.tokens.refreshToken).toBeDefined();

      authToken = body.tokens.accessToken;
      testUserId = body.user.id;
    });

    it('should login with valid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test-user@example.com',
          password: 'Password123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.tokens).toBeDefined();
      expect(body.tokens.accessToken).toBeDefined();
      expect(body.tokens.refreshToken).toBeDefined();
      expect(body.user.id).toBe(testUserId);
    });

    it('should reject login with invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test-user@example.com',
          password: 'WrongPassword!',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should refresh access token', async () => {
      // First login to get refresh token
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test-user@example.com',
          password: 'Password123!',
        },
      });
      const { refreshToken } = JSON.parse(loginResponse.body).tokens;

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    it('should get user profile with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/profile',
        headers: { Authorization: 'Bearer ' + authToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.user.id).toBe(testUserId);
      expect(body.user.email).toBe('test-user@example.com');
    });

    it('should reject request without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/profile',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================
  // TENANT MODULE TESTS
  // ============================================
  describe('Tenant Module', () => {
    it('should create organization for user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        headers: { Authorization: 'Bearer ' + authToken },
        payload: {
          name: 'Test Organization',
          domain: 'test-org.example.com',
          description: 'A test organization',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
      expect(body.name).toBe('Test Organization');
      expect(body.slug).toBeDefined();
      testOrgId = body.id;
    });

    it('should get organization by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/' + testOrgId,
        headers: { Authorization: 'Bearer ' + authToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(testOrgId);
      expect(body.name).toBe('Test Organization');
    });

    it('should list user organizations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations',
        headers: { Authorization: 'Bearer ' + authToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    it('should invite member to organization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations/' + testOrgId + '/members',
        headers: { Authorization: 'Bearer ' + authToken },
        payload: {
          email: 'member@test.com',
          role: 'MEMBER',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBeDefined();
    });

    it('should get organization members', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/' + testOrgId + '/members',
        headers: { Authorization: 'Bearer ' + authToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toBeInstanceOf(Array);
      expect(body.length).toBeGreaterThan(0);
    });

    it('should update organization white-label config', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/organizations/' + testOrgId + '/brand',
        headers: { Authorization: 'Bearer ' + authToken },
        payload: {
          brandName: 'Custom Brand',
          primaryColor: '#ff0000',
          customDomain: 'custom-' + Date.now() + '.example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.brandName).toBe('Custom Brand');
      expect(body.primaryColor).toBe('#ff0000');
    });

    it('should check quota limits', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/' + testOrgId + '/quota',
        headers: { Authorization: 'Bearer ' + authToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.maxBots).toBeDefined();
      expect(body.maxUsers).toBeDefined();
    });
  });

  // ============================================
  // PARTNER MODULE TESTS
  // ============================================
  describe('Partner Module', () => {
    let testPartnerId: string;

    it('should create partner', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/partners',
        headers: { Authorization: 'Bearer ' + authToken },
        payload: {
          name: 'Test Partner',
          email: 'partner@test.com',
          password: 'PartnerPass123!',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.partner.id).toBeDefined();
      expect(body.partner.name).toBe('Test Partner');
      testPartnerId = body.partner.id;
    });

    it('should get partner by ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/partners/' + testPartnerId,
        headers: { Authorization: 'Bearer ' + authToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.partner.id).toBe(testPartnerId);
    });

    it('should create license for partner', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/partners/' + testPartnerId + '/license',
        headers: { Authorization: 'Bearer ' + authToken },
        payload: {
          plan: 'professional',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          maxOrganizations: 50,
          maxBots: 200,
          maxUsers: 500,
          maxMessages: 1000000,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.license.plan).toBe('professional');
    });

    it('should create white-label brand for partner', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/partners/' + testPartnerId + '/brand',
        headers: { Authorization: 'Bearer ' + authToken },
        payload: {
          brandName: 'Partner White Label',
          primaryColor: '#00ff00',
          customDomain: 'partner-' + Date.now() + '.example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.brand.brandName).toBe('Partner White Label');
    });

    it('should track usage for organization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/internal/usage/track',
        headers: { Authorization: 'Bearer ' + authToken },
        payload: {
          organizationId: testOrgId,
          messages: 100,
          conversations: 10,
          leads: 5,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.usage).toBeDefined();
    });

    it('should get organization usage', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/organizations/' + testOrgId + '/usage',
        headers: { Authorization: 'Bearer ' + authToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.usage).toBeInstanceOf(Array);
      expect(body.totals).toBeDefined();
    });
  });

  // ============================================
    // BOT MODULE TESTS
    // ============================================
    describe('Bot Module', () => {
      let testBotId: string;

      it('should create bot', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/bots',
          headers: { Authorization: 'Bearer ' + authToken },
          payload: {
            name: 'Test Bot',
            description: 'A test bot',
            welcomeMessage: 'Hello! How can I help?',
            primaryColor: '#0000ff',
          },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body);
        expect(body.id).toBeDefined();
        expect(body.name).toBe('Test Bot');
        testBotId = body.id;
      });

      it('should get bot by ID', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/bots/' + testBotId,
          headers: { Authorization: 'Bearer ' + authToken },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.bot.id).toBe(testBotId);
      });

      it('should list bots for organization', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/bots',
          headers: { Authorization: 'Bearer ' + authToken },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.bots).toBeInstanceOf(Array);
        expect(body.bots.length).toBeGreaterThan(0);
      });

      it('should update bot', async () => {
        const response = await app.inject({
          method: 'PATCH',
          url: '/api/v1/bots/' + testBotId,
          headers: { Authorization: 'Bearer ' + authToken },
          payload: {
            name: 'Updated Test Bot',
            welcomeMessage: 'Welcome to updated bot!',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.bot.name).toBe('Updated Test Bot');
      });

      it('should activate bot', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/bots/' + testBotId + '/activate',
          headers: { Authorization: 'Bearer ' + authToken },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.bot.status).toBe('ACTIVE');
      });

    it('should create knowledge base for bot', async () => {
          const response = await app.inject({
            method: 'POST',
            url: '/api/v1/bots/' + testBotId + '/knowledge-bases',
            headers: { Authorization: 'Bearer ' + authToken },
            payload: {
              name: 'Test Knowledge Base',
              type: 'document',
              source: 'https://example.com/docs',
              content: 'This is test content for the knowledge base.',
            },
          });

          expect(response.statusCode).toBe(201);
          const body = JSON.parse(response.body);
          expect(body.id).toBeDefined();
          expect(body.name).toBe('Test Knowledge Base');
        });

        it('should start training for bot', async () => {
          const response = await app.inject({
            method: 'POST',
            url: '/api/v1/bots/' + testBotId + '/training',
            headers: { Authorization: 'Bearer ' + authToken },
          });

          expect(response.statusCode).toBe(201);
          const body = JSON.parse(response.body);
          expect(body.id).toBeDefined();
          expect(body.status).toBe('pending');
        });

        it('should get available models', async () => {
          const response = await app.inject({
            method: 'GET',
            url: '/api/v1/bots/' + testBotId + '/models',
            headers: { Authorization: 'Bearer ' + authToken },
          });

          expect(response.statusCode).toBe(200);
          const body = JSON.parse(response.body);
          expect(body.models).toBeInstanceOf(Array);
          expect(body.models.length).toBeGreaterThan(0);
          // Check for models from different providers
          const providers = body.models.map((m: any) => m.provider);
          expect(providers).toContain('openai');
          expect(providers).toContain('anthropic');
          expect(providers).toContain('google');
        });

        it('should route request to model', async () => {
          const response = await app.inject({
            method: 'POST',
            url: '/api/v1/bots/' + testBotId + '/route',
            headers: { Authorization: 'Bearer ' + authToken },
            payload: {
              messages: [{ role: 'user', content: 'Hello, how are you?' }],
              temperature: 0.7,
            },
          });

          expect(response.statusCode).toBe(200);
          const body = JSON.parse(response.body);
          expect(body.result.primaryModel).toBeDefined();
          expect(body.result.fallbackModels).toBeInstanceOf(Array);
          expect(body.result.estimatedCost).toBeGreaterThan(0);
        });

        it('should get embed script', async () => {
          const response = await app.inject({
            method: 'GET',
            url: '/api/v1/bots/' + testBotId + '/embed',
            headers: { Authorization: 'Bearer ' + authToken },
            query: { domain: 'localhost' },
          });

          expect(response.statusCode).toBe(200);
          const body = JSON.parse(response.body);
          expect(body.script.script).toContain(testBotId);
          expect(body.script.script).toContain('AtheerWidget');
        });

        it('should deactivate bot', async () => {
          const response = await app.inject({
            method: 'POST',
            url: '/api/v1/bots/' + testBotId + '/deactivate',
            headers: { Authorization: 'Bearer ' + authToken },
          });

          expect(response.statusCode).toBe(200);
          const body = JSON.parse(response.body);
          expect(body.bot.status).toBe('INACTIVE');
        });
      });

  // ============================================
  // CROSS-MODULE INTEGRATION TESTS
  // ============================================
  describe('Cross-Module Integration', () => {
    let crossTestPartnerId: string;
    let crossTestOrgId: string;
    let crossTestBotId: string;

    it('should associate organization with partner', async () => {
      // Create a new partner
      const partnerResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/partners',
        headers: { Authorization: 'Bearer ' + authToken },
        payload: {
          name: 'Integration Partner ' + Date.now(),
          email: 'integration-' + Date.now() + '@partner.com',
          password: 'PartnerPass123!',
        },
      });
      crossTestPartnerId = JSON.parse(partnerResponse.body).partner.id;
      crossTestOrgId = testOrgId; // Use the org created in Tenant Module tests

      // Assign organization to partner
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/partners/' + crossTestPartnerId + '/organizations/' + crossTestOrgId,
        headers: { Authorization: 'Bearer ' + authToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should get partner organizations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/partners/' + crossTestPartnerId + '/organizations',
        headers: { Authorization: 'Bearer ' + authToken },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    it('should validate embed domain for bot', async () => {
      // Create a bot first
      const botResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/bots',
        headers: { Authorization: 'Bearer ' + authToken },
        payload: {
          name: 'Cross Test Bot',
          description: 'A test bot for cross-module integration',
          welcomeMessage: 'Hello!',
          primaryColor: '#0000ff',
        },
      });
      crossTestBotId = JSON.parse(botResponse.body).id;

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/bots/' + crossTestBotId + '/embed/validate',
        headers: { Authorization: 'Bearer ' + authToken },
        payload: { domain: 'localhost' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.valid).toBeDefined();
    });
  });
});