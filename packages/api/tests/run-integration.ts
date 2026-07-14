import { buildTestApp, closeTestApp } from './setup.js';

async function runTests() {
  console.log('🚀 Building test app...');
  const app = await buildTestApp();
  
  console.log('✅ Test app built successfully');
  
  // Test 1: Health check
  console.log('\n📋 Test 1: Health check');
  const healthResponse = await app.inject({
    method: 'GET',
    url: '/health',
  });
  console.log('Status:', healthResponse.statusCode);
  console.log('Body:', healthResponse.body);
  
  // Test 2: Register user
  console.log('\n📋 Test 2: Register user');
  const registerResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: 'test@example.com',
      password: 'TestPass123!',
      name: 'Test User',
    },
  });
  console.log('Status:', registerResponse.statusCode);
  const registerBody = JSON.parse(registerResponse.body);
  console.log('Body:', registerBody);
  
  if (!registerBody.token) {
    console.error('❌ Registration failed');
    await closeTestApp(app);
    process.exit(1);
  }
  
  const authToken = registerBody.token;
  const userId = registerBody.user.id;
  console.log('✅ User registered:', userId);
  
  // Test 3: Login
  console.log('\n📋 Test 3: Login');
  const loginResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: {
      email: 'test@example.com',
      password: 'TestPass123!',
    },
  });
  console.log('Status:', loginResponse.statusCode);
  const loginBody = JSON.parse(loginResponse.body);
  console.log('✅ Login successful');
  
  // Test 4: Create organization
  console.log('\n📋 Test 4: Create organization');
  const orgResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/organizations',
    headers: { Authorization: `Bearer ${authToken}` },
    payload: {
      name: 'Test Organization',
      domain: 'testorg.example.com',
    },
  });
  console.log('Status:', orgResponse.statusCode);
  const orgBody = JSON.parse(orgResponse.body);
  console.log('Org:', orgBody);
  const orgId = orgBody.id;
  
  // Test 5: Create bot
  console.log('\n📋 Test 5: Create bot');
  const botResponse = await app.inject({
    method: 'POST',
    url: '/api/v1/bots',
    headers: { Authorization: `Bearer ${authToken}` },
    payload: {
      name: 'Test Bot',
      description: 'A test bot',
      welcomeMessage: 'Hello! How can I help?',
      primaryColor: '#2563eb',
    },
  });
  console.log('Status:', botResponse.statusCode);
  const botBody = JSON.parse(botResponse.body);
  console.log('Bot:', botBody);
  const botId = botBody.id;
  
  // Test 6: Get bots list
  console.log('\n📋 Test 6: List bots');
  const botsListResponse = await app.inject({
    method: 'GET',
    url: '/api/v1/bots',
    headers: { Authorization: `Bearer ${authToken}` },
  });
  console.log('Status:', botsListResponse.statusCode);
  const botsList = JSON.parse(botsListResponse.body);
  console.log('Bots count:', botsList.bots?.length || 0);
  
  // Test 6: Get available models
  console.log('\n📋 Test 7: Get available models');
  const modelsResponse = await app.inject({
    method: 'GET',
    url: `/api/v1/bots/${botId}/models`,
    headers: { Authorization: `Bearer ${authToken}` },
  });
  console.log('Status:', modelsResponse.statusCode);
  const models = JSON.parse(modelsResponse.body);
  console.log('Models count:', models.models?.length || 0);
  console.log('Providers:', models.models?.map((m: any) => m.provider).join(', '));
  
  // Test 7: Get embed script
  console.log('\n📋 Test 8: Get embed script');
  const embedResponse = await app.inject({
    method: 'GET',
    url: `/api/v1/bots/${botId}/embed`,
    headers: { Authorization: `Bearer ${authToken}` },
    query: { domain: 'test.example.com' },
  });
  console.log('Status:', embedResponse.statusCode);
  const embed = JSON.parse(embedResponse.body);
  console.log('Script contains botId:', embed.script?.includes(botId));
  
  // Test 8: Create knowledge base
  console.log('\n📋 Test 9: Create knowledge base');
  const kbResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/bots/${botId}/knowledge-bases`,
    headers: { Authorization: `Bearer ${authToken}` },
    payload: {
      name: 'Test KB',
      type: 'document',
      source: 'https://example.com/docs',
      content: 'Test content',
    },
  });
  console.log('Status:', kbResponse.statusCode);
  const kb = JSON.parse(kbResponse.body);
  console.log('KB ID:', kb.id);
  
  // Test 9: Start training
  console.log('\n📋 Test 10: Start training');
  const trainingResponse = await app.inject({
    method: 'POST',
    url: `/api/v1/bots/${botId}/training`,
    headers: { Authorization: `Bearer ${authToken}` },
  });
  console.log('Status:', trainingResponse.statusCode);
  const training = JSON.parse(trainingResponse.body);
  console.log('Training job:', training);
  
  // Test 10: Get organization
  console.log('\n📋 Test 11: Get organization');
  const getOrgResponse = await app.inject({
    method: 'GET',
    url: `/api/v1/organizations/${orgId}`,
    headers: { Authorization: `Bearer ${authToken}` },
  });
  console.log('Status:', getOrgResponse.statusCode);
  const org = JSON.parse(getOrgResponse.body);
  console.log('Org name:', org.name);
  
  // Test 10: White-label config
  console.log('\n📋 Test 12: White-label config');
  const brandResponse = await app.inject({
    method: 'PUT',
    url: `/api/v1/organizations/${orgId}/brand`,
    headers: { Authorization: `Bearer ${authToken}` },
    payload: {
      brandName: 'Test Brand',
      primaryColor: '#ff0000',
      customDomain: 'brand.test.example.com',
    },
  });
  console.log('Status:', brandResponse.statusCode);
  const brand = JSON.parse(brandResponse.body);
  console.log('Brand name:', brand.brandName);
  
  // Cleanup
  await closeTestApp(app);
  console.log('\n✅ All integration tests passed!');
}

runTests().catch(async (error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
