import axios from 'axios';

export interface Bot {
  id: string;
  name: string;
  description?: string;
  type: 'CUSTOM' | 'SUPPORT' | 'SALES' | 'LEAD_GEN' | 'FAQ';
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  avatar?: string | null;
  primaryColor: string;
  secondaryColor: string;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  welcomeMessage: string;
  placeholder: string;
  showBranding: boolean;
  language: string;
  supportedLanguages: string[];
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  fallbackMessage: string;
  trainingStatus: string;
  lastTrainedAt: string | null;
  trainingError: string | null;
  collectLeads: boolean;
  leadFields: string[];
  notifyOnLead: boolean;
  notificationChannels: string[];
  notificationEmails: string[];
  totalConversations: number;
  totalMessages: number;
  avgResponseTime: number;
  satisfactionRate: number;
  queueName: string | null;
  organizationId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  knowledgeBases?: any[];
  _count?: {
    conversations: number;
    knowledgeBases: number;
    leads: number;
  };
  owner?: {
    id: string;
    name: string;
    email: string;
  };
}

const client = axios.create({
  baseURL: 'http://localhost:3001/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

if (typeof window !== 'undefined') {
  const at = localStorage.getItem('accessToken');
  if (at) client.defaults.headers.common.Authorization = `Bearer ${at}`;
}

async function login(payload: { email: string; password: string }) {
  const { data } = await client.post<{ user: { id: string; email: string; name: string; role: string; organizationId: string; avatar?: string }; token: string }>('/auth/login', payload);
  localStorage.setItem('accessToken', data.token);
  client.defaults.headers.common.Authorization = `Bearer ${data.token}`;
  return data;
}

async function register(payload: { email: string; password: string; name: string }) {
  const { data } = await client.post<{ user: { id: string; email: string; name: string; role: string; organizationId: string; avatar?: string }; token: string }>('/auth/register', payload);
  localStorage.setItem('accessToken', data.token);
  client.defaults.headers.common.Authorization = `Bearer ${data.token}`;
  return data;
}

async function logout() {
  try { await client.post('/auth/logout'); } finally { localStorage.removeItem('accessToken'); delete client.defaults.headers.common.Authorization; }
}

export const api = {
  // Auth
  login: async (payload: { email: string; password: string }) => {
    const { data } = await client.post<{ user: { id: string; email: string; name: string; role: string; organizationId: string; avatar?: string }; token: string }>('/auth/login', payload);
    localStorage.setItem('accessToken', data.token);
    client.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    return data;
  },
  register: async (payload: { email: string; password: string; name: string }) => {
    const { data } = await client.post<{ user: { id: string; email: string; name: string; role: string; organizationId: string; avatar?: string }; token: string }>('/auth/register', payload);
    localStorage.setItem('accessToken', data.token);
    client.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    return data;
  },
  logout: async () => { try { await client.post('/auth/logout'); } finally { localStorage.removeItem('accessToken'); delete client.defaults.headers.common.Authorization; } },

  // Generic HTTP methods
  get: <T,>(url: string, config?: { params?: Record<string, any> }) => client.get<T>(url, config).then(r => r.data),
  post: <T,>(url: string, data?: any, config?: any) => client.post<T>(url, data, config).then(r => r.data),
  patch: <T,>(url: string, data?: any) => client.patch<T>(url, data).then(r => r.data),
  delete: (url: string) => client.delete(url).then(r => r.data),

  // Bots
  getBots: (params?: { page?: number; limit?: number; search?: string; status?: string }) => client.get('/bots', { params }).then(r => r.data),
  getBot: (id: string) => client.get(`/bots/${id}`).then(r => r.data),
  createBot: (data: { name: string; description?: string }) => client.post('/bots', data).then(r => r.data),
  updateBot: (id: string, data: Record<string, unknown>) => client.patch(`/bots/${id}`, data),
  deleteBot: (id: string) => client.delete(`/bots/${id}`),

  // Conversations
  getConversations: (botId: string, params?: { page?: number; limit?: number; status?: string }) => client.get(`/conversations/bot/${botId}`, { params }),
  getConversation: (id: string) => client.get(`/conversations/${id}`),

  // Leads
  getLeads: (botId: string, params?: { page?: number; limit?: number; status?: string; search?: string }) => client.get(`/leads/bot/${botId}`, { params }),
  createLead: (data: { name: string; email?: string; phone?: string; company?: string; botId: string }) => client.post('/leads', data),

  // Knowledge Base
  getKnowledgeBases: (botId: string, page = 1, limit = 20) => client.get(`/knowledge/bot/${botId}`, { params: { page, limit } }),
  createKnowledgeBase: (botId: string, data: { name: string; type: string; source: string; metadata?: Record<string, unknown> }) => client.post(`/knowledge/bot/${botId}`, data),
  deleteKnowledgeBase: (id: string) => client.delete(`/knowledge/${id}`),

  // Integrations
  getIntegrations: () => client.get('/integrations'),
  createIntegration: (data: { name: string; type: string; config: Record<string, unknown> }) => client.post('/integrations', data),

  // Analytics
  getAnalyticsOverview: (botId?: string) => client.get('/analytics/overview', { params: { botId } }),

  // Embed
  getEmbedConfig: (botId: string) => client.get(`/embed/bots/${botId}/config`),
  sendEmbedMessage: (botId: string, data: { message: string; conversationId?: string; sessionId?: string }) => client.post(`/embed/bots/${botId}/chat`, data),
  submitLead: (botId: string, data: { conversationId: string; name: string; email: string; phone?: string; company?: string; metadata?: Record<string, unknown> }) => client.post(`/embed/bots/${botId}/leads`, data),

  // Partner
  getPartnerProfile: () => client.get('/partners/profile').then(r => r.data),
  getPartnerAnalytics: (params?: { range?: string }) => client.get('/partners/analytics', { params }).then(r => r.data),
  getPartnerOrganizations: (params?: { page?: number; limit?: number; search?: string; status?: string }) => client.get('/partners/organizations', { params }).then(r => r.data),
  getPartnerOrganization: (id: string) => client.get(`/partners/organizations/${id}`).then(r => r.data),
  createPartnerOrganization: (data: { name: string; slug: string; plan: string; status: string; logo?: string }) => client.post('/partners/organizations', data).then(r => r.data),
  updatePartnerOrganization: (id: string, data: Partial<{ name: string; slug: string; plan: string; status: string; logo: string }>) => client.patch(`/partners/organizations/${id}`, data).then(r => r.data),
  deletePartnerOrganization: (id: string) => client.delete(`/partners/organizations/${id}`),
  getPartnerBrand: () => client.get('/partners/brand').then(r => r.data),
  upsertPartnerBrand: (data: any) => client.post('/partners/brand', data).then(r => r.data),
  updatePartnerBrand: (data: any) => client.patch('/partners/brand', data).then(r => r.data),
  getOrganizationBrand: (orgId: string) => client.get(`/partners/organizations/${orgId}/brand`).then(r => r.data),
  upsertOrganizationBrand: (orgId: string, data: any) => client.post(`/partners/organizations/${orgId}/brand`, data).then(r => r.data),
  updateOrganizationBrand: (orgId: string, data: Partial<{ brandName: string; primaryColor: string; secondaryColor: string; font: string; emailSender: string; supportEmail: string; supportPhone: string; customDomain: string; privacyPolicy: string; terms: string; footer: string; loginBackground: string; logo?: string }>) => client.patch(`/partners/organizations/${orgId}/brand`, data).then(r => r.data),
  getPartnerLicense: () => client.get('/partners/license').then(r => r.data),
  upgradePartnerLicense: (plan: string) => client.post('/partners/license/upgrade', { plan }).then(r => r.data),
  getPartnerUsage: (params?: { range?: string }) => client.get('/partners/usage/summary', { params }).then(r => r.data),
  getPartnerInvoices: (params?: { page?: number; limit?: number }) => client.get('/partners/invoices', { params }).then(r => r.data),
};