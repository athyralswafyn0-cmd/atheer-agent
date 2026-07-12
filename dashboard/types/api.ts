// API Types for Atheer AI Dashboard

// Base types
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: Pagination;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  validation?: ZodIssue[];
}

export interface ZodIssue {
  code: string;
  path: (string | number)[];
  message: string;
}

// Bot types
export interface Bot {
  id: string;
  name: string;
  description?: string;
  type: 'CUSTOM' | 'SUPPORT' | 'SALES' | 'LEAD_GEN';
  status: 'ACTIVE' | 'INACTIVE' | 'TRAINING' | 'ERROR';
  avatar?: string;
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
  trainingStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  lastTrainedAt?: string;
  trainingError?: string;
  collectLeads: boolean;
  leadFields: string[];
  notifyOnLead: boolean;
  notificationChannels: ('EMAIL' | 'SLACK' | 'WEBHOOK')[];
  notificationEmails: string[];
  totalConversations: number;
  totalMessages: number;
  avgResponseTime: number;
  satisfactionRate: number;
  queueName?: string;
  organizationId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBotRequest {
  name: string;
  description?: string;
  type?: 'CUSTOM' | 'SUPPORT' | 'SALES' | 'LEAD_GEN';
}

export interface UpdateBotRequest {
  name?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  avatar?: string;
  primaryColor?: string;
  secondaryColor?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  welcomeMessage?: string;
  placeholder?: string;
  showBranding?: boolean;
  language?: string;
  supportedLanguages?: string[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  fallbackMessage?: string;
  collectLeads?: boolean;
  leadFields?: string[];
  notifyOnLead?: boolean;
  notificationChannels?: ('EMAIL' | 'SLACK' | 'WEBHOOK')[];
  notificationEmails?: string[];
}

export interface BotSelect {
  id: string;
  name: string;
  status: string;
  totalConversations: number;
}

// Conversation types
export interface Conversation {
  id: string;
  sessionId: string;
  visitorId?: string;
  userIp?: string;
  userAgent?: string;
  language: string;
  status: 'ACTIVE' | 'CLOSED' | 'ESCALATED' | 'PENDING';
  metadata: Record<string, unknown>;
  startedAt: string;
  endedAt?: string;
  rating?: number;
  feedback?: string;
  messageCount: number;
  avgResponseTime: number;
  lastMessageAt?: string;
  botId: string;
  bot: BotSelect;
  lead?: Lead | null;
  messages?: Message[];
}

export interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata?: Record<string, unknown>;
  tokens?: number;
  model?: string;
  createdAt: string;
}

// Lead types
export interface Lead {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  customData: Record<string, unknown>;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
  source: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  assignedTo?: string;
  notes?: string;
  botId: string;
  bot?: BotSelect;
  conversationId?: string;
  conversation?: Conversation | null;
  organizationId?: string;
  assignedUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  conversionRate: number;
  avgTimeToConvert: number;
}

// Knowledge Base types
export interface KnowledgeBase {
  id: string;
  botId: string;
  bot?: BotSelect;
  name: string;
  type: 'PDF' | 'URL' | 'TEXT' | 'SITEMAP' | 'QA';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  source: string;
  content?: string;
  metadata?: Record<string, unknown>;
  chunksCount: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBaseChunk {
  id: string;
  knowledgeBaseId: string;
  content: string;
  chunkIndex: number;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

// Integration types
export interface Integration {
  id: string;
  name: string;
  type: 'EMAIL' | 'TELEGRAM' | 'SLACK' | 'WEBHOOK' | 'HUBSPOT' | 'PIPEDRIVE' | 'CUSTOM';
  config: Record<string, unknown>;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

// Embed Script types
export interface EmbedScript {
  id: string;
  botId: string;
  bot?: BotSelect;
  domain: string;
  allowed: boolean;
  scriptVersion: string;
  createdAt: string;
  updatedAt: string;
}

// Analytics types
export interface AnalyticsOverview {
  totalConversations: number;
  totalMessages: number;
  totalLeads: number;
  avgResponseTime: number;
  satisfactionRate: number;
  conversationsTrend: TrendPoint[];
  messagesTrend: TrendPoint[];
  leadsTrend: TrendPoint[];
  topBots: BotStats[];
  conversationsByStatus: Record<string, number>;
  conversationsByLanguage: Record<string, number>;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface BotStats {
  botId: string;
  botName: string;
  conversations: number;
  messages: number;
  leads: number;
  avgResponseTime: number;
  satisfactionRate: number;
}

// Embed types
export interface EmbedConfig {
  bot: {
    id: string;
    name: string;
    welcomeMessage: string;
    avatar?: string;
    primaryColor: string;
    language: string;
    fallbackMessage: string;
  };
}

export interface EmbedChatRequest {
  message: string;
  conversationId?: string;
  sessionId?: string;
}

export interface EmbedChatResponse {
  message: {
    id: string;
    role: string;
    content: string;
    tokens?: number;
    model?: string;
    metadata?: Record<string, unknown>;
    conversationId: string;
    createdAt: string;
  };
  conversationId: string;
  showLeadForm: boolean;
  leadFields: string[];
}

export interface EmbedLeadRequest {
  conversationId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  metadata?: Record<string, unknown>;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// User/Organization types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER';
  organizationId: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  trialEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification types
export interface Notification {
  id: string;
  type: 'NEW_LEAD' | 'NEW_MESSAGE' | 'CONVERSATION_CLOSED' | 'LEAD_CONVERTED' | 'BOT_ERROR' | 'TRAINING_COMPLETE' | 'SYSTEM';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// Settings types
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    newLead: boolean;
    newMessage: boolean;
    conversationClosed: boolean;
    leadConverted: boolean;
    botError: boolean;
    trainingComplete: boolean;
  };
}

export interface BotSettings {
  collectLeads: boolean;
  leadFields: string[];
  notifyOnLead: boolean;
  notificationChannels: ('EMAIL' | 'SLACK' | 'WEBHOOK')[];
  notificationEmails: string[];
}

// Pagination helper
export interface PaginatedParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Form types for validation
export interface BotFormData {
  name: string;
  description?: string;
  type: 'CUSTOM' | 'SUPPORT' | 'SALES' | 'LEAD_GEN';
  welcomeMessage: string;
  primaryColor: string;
  language: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  fallbackMessage: string;
  collectLeads: boolean;
  leadFields: string[];
}

export interface LeadFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status?: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
  notes?: string;
  assignedTo?: string;
}

export interface KnowledgeBaseFormData {
  name: string;
  type: 'PDF' | 'URL' | 'TEXT' | 'SITEMAP' | 'QA';
  source: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationFormData {
  name: string;
  type: 'EMAIL' | 'TELEGRAM' | 'SLACK' | 'WEBHOOK' | 'HUBSPOT' | 'PIPEDRIVE' | 'CUSTOM';
  config: Record<string, unknown>;
}

// Zod issue type for validation errors
export interface ZodIssue {
  code: string;
  path: (string | number)[];
  message: string;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// User/Organization types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER';
  organizationId: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  trialEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification types
export interface Notification {
  id: string;
  type: 'NEW_LEAD' | 'NEW_MESSAGE' | 'CONVERSATION_CLOSED' | 'LEAD_CONVERTED' | 'BOT_ERROR' | 'TRAINING_COMPLETE' | 'SYSTEM';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// Settings types
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    newLead: boolean;
    newMessage: boolean;
    conversationClosed: boolean;
    leadConverted: boolean;
    botError: boolean;
    trainingComplete: boolean;
  };
}

export interface BotSettings {
  collectLeads: boolean;
  leadFields: string[];
  notifyOnLead: boolean;
  notificationChannels: ('EMAIL' | 'SLACK' | 'WEBHOOK')[];
  notificationEmails: string[];
}

// Pagination helper
export interface PaginatedParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Form types for validation
export interface BotFormData {
  name: string;
  description?: string;
  type: 'CUSTOM' | 'SUPPORT' | 'SALES' | 'LEAD_GEN';
  welcomeMessage: string;
  primaryColor: string;
  language: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  fallbackMessage: string;
  collectLeads: boolean;
  leadFields: string[];
}

export interface LeadFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status?: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
  notes?: string;
  assignedTo?: string;
}

export interface KnowledgeBaseFormData {
  name: string;
  type: 'PDF' | 'URL' | 'TEXT' | 'SITEMAP' | 'QA';
  source: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationFormData {
  name: string;
  type: 'EMAIL' | 'TELEGRAM' | 'SLACK' | 'WEBHOOK' | 'HUBSPOT' | 'PIPEDRIVE' | 'CUSTOM';
  config: Record<string, unknown>;
}

// Zod issue type for validation errors
export interface ZodIssue {
  code: string;
  path: (string | number)[];
  message: string;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// User/Organization types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER';
  organizationId: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
  trialEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification types
export interface Notification {
  id: string;
  type: 'NEW_LEAD' | 'NEW_MESSAGE' | 'CONVERSATION_CLOSED' | 'LEAD_CONVERTED' | 'BOT_ERROR' | 'TRAINING_COMPLETE' | 'SYSTEM';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// Settings types
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    newLead: boolean;
    newMessage: boolean;
    conversationClosed: boolean;
    leadConverted: boolean;
    botError: boolean;
    trainingComplete: boolean;
  };
}

export interface BotSettings {
  collectLeads: boolean;
  leadFields: string[];
  notifyOnLead: boolean;
  notificationChannels: ('EMAIL' | 'SLACK' | 'WEBHOOK')[];
  notificationEmails: string[];
}

// Pagination helper
export interface PaginatedParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Form types for validation
export interface BotFormData {
  name: string;
  description?: string;
  type: 'CUSTOM' | 'SUPPORT' | 'SALES' | 'LEAD_GEN';
  welcomeMessage: string;
  primaryColor: string;
  language: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  fallbackMessage: string;
  collectLeads: boolean;
  leadFields: string[];
}

export interface LeadFormData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status?: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
  notes?: string;
  assignedTo?: string;
}

export interface KnowledgeBaseFormData {
  name: string;
  type: 'PDF' | 'URL' | 'TEXT' | 'SITEMAP' | 'QA';
  source: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationFormData {
  name: string;
  type: 'EMAIL' | 'TELEGRAM' | 'SLACK' | 'WEBHOOK' | 'HUBSPOT' | 'PIPEDRIVE' | 'CUSTOM';
  config: Record<string, unknown>;
}

// Zod issue type for validation errors
export interface ZodIssue {
  code: string;
  path: (string | number)[];
  message: string;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}