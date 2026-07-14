/**
 * Module Interfaces - Contract definitions for each domain module
 * These define the public API each module exposes to others
 */

import { PrismaClient } from '@prisma/client';

// ============================================
// SHARED TYPES
// ============================================

export interface ModuleContext {
  prisma: PrismaClient;
  config: ModuleConfig;
}

export interface ModuleConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

// ============================================
// AUTH MODULE INTERFACE
// ============================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  userId: string;
  organizationId: string;
  role: string;
  email: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
  avatar?: string | null;
  emailVerified?: Date | null;
  lastLoginAt?: Date | null;
}

export interface SessionInfo {
  id: string;
  device?: string;
  browser?: string;
  ip?: string;
  location?: string;
  createdAt: Date;
  lastActiveAt: Date;
  current: boolean;
}

export interface AuthModuleInterface {
  // Core auth operations
  register(input: RegisterInput): Promise<{ user: UserProfile; tokens: AuthTokens }>;
  login(input: LoginInput): Promise<{ user: UserProfile; tokens: AuthTokens }>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  logout(userId: string): Promise<void>;
  
  // Password management
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  
  // 2FA / MFA
  enable2FA(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }>;
  verify2FA(userId: string, token: string): Promise<boolean>;
  disable2FA(userId: string): Promise<void>;
  
  // OAuth / OIDC
  getOAuthUrl(provider: 'google' | 'github', redirectUri: string): Promise<string>;
  handleOAuthCallback(provider: 'google' | 'github', code: string): Promise<{ user: UserProfile; tokens: AuthTokens }>;
  
  // Passkeys / WebAuthn
  startPasskeyRegistration(userId: string): Promise<{ challenge: string; options: any }>;
  finishPasskeyRegistration(userId: string, credential: any): Promise<void>;
  startPasskeyAuthentication(): Promise<{ challenge: string; options: any }>;
  finishPasskeyAuthentication(credential: any): Promise<{ user: UserProfile; tokens: AuthTokens }>;
  
  // Session management
  getUserSessions(userId: string): Promise<SessionInfo[]>;
  revokeSession(userId: string, sessionId: string): Promise<void>;
  revokeAllSessions(userId: string): Promise<void>;
  
  // Token validation (for other modules)
  validateToken(token: string): Promise<JWTPayload | null>;
  verifyToken(token: string): JWTPayload;
  signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string;
}

// ============================================
// TENANT MODULE INTERFACE
// ============================================

export interface OrganizationInput {
  name: string;
  domain?: string;
  description?: string;
  industry?: string;
  size?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface UpdateOrganizationInput extends Partial<OrganizationInput> {}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  description?: string;
  industry?: string;
  size?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  status: string;
  plan: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'PARTNER_ADMIN' | 'PARTNER_VIEWER';
  joinedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
}

export interface InvitationInput {
  email: string;
  role: string;
  organizationId: string;
  invitedBy: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

export interface QuotaConfig {
  maxOrganizations: number;
  maxBots: number;
  maxUsers: number;
  maxMessagesPerMonth: number;
  maxStorageMB: number;
  maxKnowledgeBases: number;
  maxTeamMembers: number;
}

export interface WhiteLabelConfig {
  logo?: string;
  favicon?: string;
  brandName?: string;
  primaryColor: string;
  secondaryColor: string;
  font?: string;
  emailSender?: string;
  supportEmail?: string;
  supportPhone?: string;
  customDomain?: string;
  privacyPolicy?: string;
  terms?: string;
  footer?: string;
  loginBackground?: string;
  faviconDark?: string;
}

export interface DNSRecord {
  type: 'A' | 'CNAME' | 'TXT';
  name: string;
  value: string;
  verified: boolean;
}

export interface OrganizationFilters {
  status?: string;
  plan?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TenantModuleInterface {
  // Organization CRUD
  createOrganization(input: OrganizationInput, ownerId: string): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | null>;
  getOrganizationBySlug(slug: string): Promise<Organization | null>;
  getOrganizationByDomain(domain: string): Promise<Organization | null>;
  updateOrganization(id: string, input: UpdateOrganizationInput, userId: string): Promise<Organization>;
  deleteOrganization(id: string, userId: string): Promise<void>;
  listOrganizations(userId: string, filters?: OrganizationFilters): Promise<{ organizations: Organization[]; pagination: PaginationResult }>;
  
  // Members & RBAC
  getMembers(organizationId: string): Promise<OrganizationMember[]>;
  addMember(organizationId: string, userId: string, role: string): Promise<OrganizationMember>;
  updateMemberRole(userId: string, role: string): Promise<OrganizationMember>;
  removeMember(organizationId: string, userId: string, removedBy: string): Promise<void>;
  
  // Invitations
  inviteMember(input: InvitationInput): Promise<Invitation>;
  acceptInvitation(token: string, userId: string): Promise<OrganizationMember>;
  revokeInvitation(invitationId: string): Promise<void>;
  listInvitations(organizationId: string): Promise<Invitation[]>;
  
  // Quotas & Limits
  getQuota(organizationId: string): Promise<QuotaConfig>;
  checkQuota(organizationId: string, resource: keyof QuotaConfig): Promise<{ allowed: boolean; current: number; limit: number }>;
  incrementUsage(organizationId: string, resource: keyof QuotaConfig, amount?: number): Promise<void>;
  getCurrentUsage(resource: keyof QuotaConfig, sums: any): number;
  
  // White-label config
  getWhiteLabelConfig(organizationId: string): Promise<WhiteLabelConfig | null>;
  updateWhiteLabelConfig(organizationId: string, config: Partial<WhiteLabelConfig>): Promise<WhiteLabelConfig>;
  
  // Domain verification
  verifyCustomDomain(organizationId: string, domain: string): Promise<{ verified: boolean; records: DNSRecord[] }>;
  getDNSRecords(organizationId: string): Promise<DNSRecord[]>;

  // Helper
  formatOrganization(org: any): Organization;
  formatInvitation(inv: any): Invitation;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================
// PARTNER MODULE INTERFACE
// ============================================

export interface Partner {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  license?: PartnerLicense;
  brand?: PartnerBrand;
  _count?: {
    organizations: number;
  };
}

export interface CreatePartnerInput {
  name: string;
  email: string;
  password?: string;
}

export interface UpdatePartnerInput {
  name?: string;
  email?: string;
  isActive?: boolean;
}

export interface PartnerLicense {
  id: string;
  plan: string;
  partnerId: string;
  expiresAt: Date;
  maxOrganizations: number;
  maxBots: number;
  maxUsers: number;
  maxMessages: number;
  maxStorage: number;
  status: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLicenseInput {
  plan: 'starter' | 'professional' | 'enterprise';
  expiresAt: string;
  maxOrganizations?: number;
  maxBots?: number;
  maxUsers?: number;
  maxMessages?: number;
  maxStorage?: number;
}

export interface UpdateLicenseInput extends Partial<CreateLicenseInput> {
  status?: 'active' | 'expired' | 'suspended';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

export interface PartnerBrand {
  id: string;
  partnerId?: string;
  organizationId?: string;
  logo?: string;
  favicon?: string;
  brandName?: string;
  primaryColor: string;
  secondaryColor: string;
  font?: string;
  emailSender?: string;
  supportEmail?: string;
  supportPhone?: string;
  customDomain?: string;
  privacyPolicy?: string;
  terms?: string;
  footer?: string;
  loginBackground?: string;
  faviconDark?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBrandInput {
  partnerId?: string;
  organizationId?: string;
  logo?: string;
  favicon?: string;
  brandName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  font?: string;
  emailSender?: string;
  supportEmail?: string;
  supportPhone?: string;
  customDomain?: string;
  privacyPolicy?: string;
  terms?: string;
  footer?: string;
  loginBackground?: string;
  faviconDark?: string;
}

export interface UsageRecord {
  id: string;
  organizationId: string;
  date: Date;
  messages: number;
  conversations: number;
  leads: number;
  storageMB: number;
  tokensUsed: number;
  apiCalls: number;
  llmCost: number;
}

export interface UsageAggregates {
  messages: number;
  conversations: number;
  leads: number;
  storageMB: number;
  tokensUsed: number;
  apiCalls: number;
  llmCost: number;
}

export interface PartnerFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
}

export interface UsageFilters {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PartnerUsageFilters {
  startDate?: string;
  endDate?: string;
}

export interface TrackUsageInput {
  organizationId: string;
  date?: string;
  messages?: number;
  conversations?: number;
  leads?: number;
  storageMB?: number;
  tokensUsed?: number;
  apiCalls?: number;
  llmCost?: number;
}

export interface PartnerModuleInterface {
  // Partner CRUD (Super Admin)
  listPartners(filters: PartnerFilters): Promise<{ partners: Partner[]; pagination: PaginationResult }>;
  getPartner(id: string): Promise<Partner | null>;
  createPartner(input: CreatePartnerInput): Promise<Partner>;
  updatePartner(id: string, input: UpdatePartnerInput): Promise<Partner>;
  deletePartner(id: string): Promise<void>;
  
  // License Management
  getLicense(partnerId: string): Promise<PartnerLicense | null>;
  createOrUpdateLicense(partnerId: string, input: CreateLicenseInput): Promise<PartnerLicense>;
  updateLicense(partnerId: string, input: UpdateLicenseInput): Promise<PartnerLicense>;
  
  // Brand Management (White-label)
  getBrandByPartner(partnerId: string): Promise<PartnerBrand | null>;
  getBrandByOrganization(organizationId: string): Promise<PartnerBrand | null>;
  createOrUpdateBrandForPartner(partnerId: string, input: CreateBrandInput): Promise<PartnerBrand>;
  createOrUpdateBrandForOrganization(organizationId: string, input: CreateBrandInput): Promise<PartnerBrand>;
  
  // Usage & Metering
  getOrganizationUsage(organizationId: string, filters: UsageFilters): Promise<{ usage: UsageRecord[]; totals: UsageAggregates; pagination: PaginationResult }>;
  getPartnerUsage(partnerId: string, filters: PartnerUsageFilters): Promise<Record<string, { organization: { id: string; name: string }; totals: UsageAggregates }>>;
  trackUsage(input: TrackUsageInput): Promise<UsageRecord>;
  
  // Partner-Organization relationship
  getPartnerOrganizations(partnerId: string): Promise<Organization[]>;
  assignOrganizationToPartner(partnerId: string, organizationId: string): Promise<void>;
  removeOrganizationFromPartner(partnerId: string, organizationId: string): Promise<void>;
}

// ============================================
// BOT MODULE INTERFACE
// ============================================

export interface Bot {
  id: string;
  name: string;
  description?: string;
  type: BotType;
  status: BotStatus;
  avatar?: string;
  primaryColor: string;
  secondaryColor: string;
  position: string;
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
  collectLeads: boolean;
  leadFields: LeadField[];
  notifyOnLead: boolean;
  notificationChannels: NotificationChannel[];
  notificationEmails: string[];
  totalConversations: number;
  totalMessages: number;
  avgResponseTime: number;
  satisfactionRate: number;
  organizationId: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BotType = 'CUSTOMER_SUPPORT' | 'LEAD_GENERATION' | 'APPOINTMENT_BOOKING' | 'PRODUCT_RECOMMENDATION' | 'FAQ' | 'CUSTOM';
export type BotStatus = 'ACTIVE' | 'INACTIVE' | 'TRAINING' | 'ERROR';

export interface LeadField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
}

export type NotificationChannel = 'EMAIL' | 'TELEGRAM' | 'SLACK' | 'WEBHOOK';

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'meta' | 'mistral' | 'custom';
  capabilities: string[];
  maxTokens: number;
  costPer1kTokens: { input: number; output: number };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

export interface CreateBotInput {
  name: string;
  description?: string;
  type?: BotType;
  avatar?: string;
  primaryColor?: string;
  secondaryColor?: string;
  position?: string;
  welcomeMessage?: string;
  placeholder?: string;
  showBranding?: boolean;
  language?: string;
  supportedLanguages?: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt: string;
  fallbackMessage?: string;
  collectLeads?: boolean;
  leadFields?: LeadField[];
  notifyOnLead?: boolean;
  notificationChannels?: NotificationChannel[];
  notificationEmails?: string[];
}

export interface UpdateBotInput extends Partial<CreateBotInput> {}

export interface KnowledgeBase {
  id: string;
  name: string;
  type: string;
  source: string;
  content?: string;
  chunksCount: number;
  status: string;
  error?: string;
  metadata: Record<string, any>;
  botId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateKnowledgeBaseInput {
  name: string;
  type: string;
  source: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface TrainingJob {
  id: string;
  botId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  sessionId: string;
  visitorId?: string;
  userIp?: string;
  userAgent?: string;
  language: string;
  status: string;
  metadata: Record<string, any>;
  startedAt: Date;
  endedAt?: Date;
  rating?: number;
  feedback?: string;
  messageCount: number;
  avgResponseTime?: number;
  lastMessageAt?: Date;
  botId: string;
  organizationId: string;
}

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  tokens?: number;
  model?: string;
  metadata: Record<string, any>;
  conversationId: string;
  createdAt: Date;
}

export interface BotFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: BotStatus;
  type?: BotType;
}

export interface BotModuleInterface {
  // Bot CRUD
  createBot(organizationId: string, ownerId: string, input: CreateBotInput): Promise<Bot>;
  getBot(id: string, organizationId: string): Promise<Bot | null>;
  getBotById(id: string): Promise<Bot | null>;
  getBotByOrganization(organizationId: string, filters?: BotFilters): Promise<{ bots: Bot[]; pagination: PaginationResult }>;
  updateBot(id: string, organizationId: string, input: UpdateBotInput): Promise<Bot>;
  deleteBot(id: string, organizationId: string): Promise<void>;

  // Bot Status & Deployment
  activateBot(id: string, organizationId: string): Promise<Bot>;
  deactivateBot(id: string, organizationId: string): Promise<Bot>;
  getEmbedScript(botId: string, domain?: string): Promise<{ script: string; scriptUrl: string }>;
  validateEmbedDomain(botId: string, domain: string): Promise<boolean>;

  // Model Routing
  getAvailableModels(): Promise<ModelInfo[]>;
  routeRequest(botId: string, messages: ChatMessage[]): Promise<ModelRouteResult>;

  // Training Pipeline
  startTraining(botId: string, organizationId: string): Promise<TrainingJob>;
  getTrainingStatus(jobId: string): Promise<TrainingJob | null>;
  cancelTraining(jobId: string): Promise<void>;
  getTrainingHistory(botId: string): Promise<TrainingJob[]>;

  // Knowledge Base / RAG
  createKnowledgeBase(botId: string, input: CreateKnowledgeBaseInput): Promise<KnowledgeBase>;
  getKnowledgeBase(id: string): Promise<KnowledgeBase | null>;
  getKnowledgeBases(botId: string): Promise<KnowledgeBase[]>;
  updateKnowledgeBase(id: string, input: Partial<CreateKnowledgeBaseInput>): Promise<KnowledgeBase>;
  deleteKnowledgeBase(kbId: string): Promise<void>;
  triggerKnowledgeBaseSync(kbId: string): Promise<void>;

  // Conversations
  getConversations(botId: string, filters?: ConversationFilters): Promise<{ conversations: Conversation[]; pagination: PaginationResult }>;
  getConversation(id: string): Promise<Conversation | null>;
  getMessages(conversationId: string): Promise<Message[]>;

  // Analytics
  getBotAnalytics(botId: string, startDate: Date, endDate: Date): Promise<BotAnalytics>;
  exportConversations(botId: string, startDate: Date, endDate: Date): Promise<Conversation[]>;
}

export interface ConversationFilters {
  status?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface BotAnalytics {
  totalConversations: number;
  totalMessages: number;
  avgResponseTime: number;
  satisfactionRate: number;
  conversationsByDate: { date: Date; count: number }[];
  messagesByDate: { date: Date; count: number }[];
  topQuestions: { question: string; count: number }[];
  languageDistribution: { language: string; count: number }[];
}

// ============================================
// CONVERSATION MODULE INTERFACE (for Stage 3)
// ============================================

export interface ConversationModuleInterface {
  // Real-time messaging
  sendMessage(conversationId: string, content: string, role: 'USER' | 'ASSISTANT', metadata?: Record<string, any>): Promise<Message>;
  streamMessage(conversationId: string, content: string, onChunk: (chunk: string) => void): Promise<Message>;
  
  // Human escalation
  requestEscalation(conversationId: string, reason: string): Promise<void>;
  assignAgent(conversationId: string, agentId: string): Promise<void>;
  
  // WebSocket management
  subscribeToConversation(conversationId: string, clientId: string): Promise<void>;
  unsubscribeFromConversation(conversationId: string, clientId: string): Promise<void>;
  
  // History & Search
  searchConversations(organizationId: string, query: string, filters?: ConversationFilters): Promise<Conversation[]>;
  getConversationTimeline(conversationId: string): Promise<ConversationEvent[]>;
}

export interface ConversationEvent {
  id: string;
  conversationId: string;
  type: 'message' | 'escalation' | 'assignment' | 'rating' | 'status_change';
  data: Record<string, any>;
  createdAt: Date;
}

// ============================================
// AI SERVICES MODULE INTERFACE (for Stage 3)
// ============================================

export interface AIModuleInterface {
  // LLM Gateway
  complete(prompt: string, options: LLMOptions): Promise<LLMResponse>;
  streamComplete(prompt: string, options: LLMOptions, onChunk: (chunk: string) => void): Promise<LLMResponse>;
  
  // Embeddings
  embed(text: string | string[], model?: string): Promise<number[][]>;
  
  // Reranking
  rerank(query: string, documents: string[], topK: number): Promise<{ index: number; score: number }[]>;
  
  // Moderation
  moderate(content: string): Promise<ModerationResult>;
  
  // Model routing
  routeRequest(request: ModelRouteRequest): Promise<ModelRouteResult>;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: Tool[];
  responseFormat?: 'text' | 'json';
}

export interface LLMResponse {
  content: string;
  tokensUsed: { prompt: number; completion: number; total: number };
  model: string;
  finishReason: string;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  categoryScores: Record<string, number>;
}

export interface ModelRouteRequest {
  task: 'chat' | 'embedding' | 'rerank' | 'moderate';
  complexity: 'low' | 'medium' | 'high';
  language?: string;
  maxCost?: number;
  requiredCapabilities?: string[];
}

export interface ModelRouteResult {
  primaryModel: ModelInfo;
  fallbackModels: ModelInfo[];
  estimatedCost: number;
}

// ============================================
// EVENT BUS INTERFACE (for Stage 3)
// ============================================

export interface EventBusInterface {
  publish(topic: string, event: any): Promise<void>;
  subscribe(topic: string, handler: (event: any) => Promise<void>): Promise<() => void>;
  publishBatch(topic: string, events: any[]): Promise<void>;
}

export type DomainEvent = 
  | { type: 'bot.training.started'; payload: { botId: string; jobId: string } }
  | { type: 'bot.training.completed'; payload: { botId: string; jobId: string } }
  | { type: 'bot.training.failed'; payload: { botId: string; jobId: string; error: string } }
  | { type: 'conversation.created'; payload: { conversationId: string; botId: string; organizationId: string } }
  | { type: 'conversation.ended'; payload: { conversationId: string; messageCount: number } }
  | { type: 'lead.captured'; payload: { leadId: string; botId: string; organizationId: string; data: Record<string, any> } }
  | { type: 'partner.licensed'; payload: { partnerId: string; licenseId: string } }
  | { type: 'billing.payment.succeeded'; payload: { organizationId: string; amount: number; currency: string } }
  | { type: 'billing.payment.failed'; payload: { organizationId: string; amount: number; error: string } }
  | { type: 'audit.log'; payload: { action: string; entityType: string; entityId: string; userId: string; metadata: Record<string, any> } }
  | { type: 'analytics.event'; payload: { event: string; organizationId: string; properties: Record<string, any> } };

// ============================================
// MODULE REGISTRY
// ============================================

export interface ModuleRegistry {
  auth: AuthModuleInterface;
  tenant: TenantModuleInterface;
  partner: PartnerModuleInterface;
  bot: BotModuleInterface;
  conversation?: ConversationModuleInterface;
  ai?: AIModuleInterface;
  eventBus?: EventBusInterface;
}

// Attach modules to Fastify instance - augment Fastify types