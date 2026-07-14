-- ============================================================================
-- MIGRATION: Add RLS (Row-Level Security) Policies for Multi-Tenant Isolation
-- Run this AFTER the enhanced schema is applied
-- ============================================================================

-- ============================================================================
-- 1. ENABLE RLS ON ALL TENANT-ISOLATED TABLES
-- ============================================================================

-- Core tenant tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BotTrainingJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KnowledgeBase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KnowledgeChunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmbedScript" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageHourly" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Integration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Webhook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PartnerCommission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UsageHourly" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentWorkflow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentExecution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SecurityEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationSummary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationDataset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationExample" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Webhook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AgentMemory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationSummary" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationDataset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationExample" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvaluationRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Webhook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookDelivery" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CREATE SESSION CONTEXT FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION set_tenant_context(org_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_org_id', org_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_partner_context(partner_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_partner_id', partner_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_org_id', '', false);
  PERFORM set_config('app.current_partner_id', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current org_id from session
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS uuid AS $$
BEGIN
  RETURN nullif(current_setting('app.current_org_id', true), '')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_partner_id()
RETURNS uuid AS $$
BEGIN
  RETURN nullif(current_setting('app.current_partner_id', true), '')::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. RLS POLICIES FOR ORGANIZATION-ISOLATED TABLES
-- ============================================================================

-- Organization: Users can only see their own organization
CREATE POLICY org_isolation ON "Organization"
  USING (id = current_org_id());

-- User: Users can only see users in their organization
CREATE POLICY user_org_isolation ON "User"
  USING ("organizationId" = current_org_id());

-- OrganizationMember: Users can only see members of their organization
CREATE POLICY org_member_isolation ON "OrganizationMember"
  USING ("organizationId" = current_org_id());

-- Bot: Users can only see bots in their organization
CREATE POLICY bot_org_isolation ON "Bot"
  USING ("organizationId" = current_org_id());

-- BotTrainingJob
CREATE POLICY bot_training_job_isolation ON "BotTrainingJob"
  USING ("botId" IN (SELECT id FROM "Bot" WHERE "organizationId" = current_org_id()));

-- KnowledgeBase
CREATE POLICY knowledge_base_isolation ON "KnowledgeBase"
  USING ("botId" IN (SELECT id FROM "Bot" WHERE "organizationId" = current_org_id()));

-- KnowledgeChunk
CREATE POLICY knowledge_chunk_isolation ON "KnowledgeChunk"
  USING ("knowledgeBaseId" IN (
    SELECT id FROM "KnowledgeBase" 
    WHERE "botId" IN (SELECT id FROM "Bot" WHERE "organizationId" = current_org_id())
  ));

-- Conversation
CREATE POLICY conversation_isolation ON "Conversation"
  USING ("organizationId" = current_org_id());

-- Message
CREATE POLICY message_isolation ON "Message"
  USING ("conversationId" IN (
    SELECT id FROM "Conversation" WHERE "organizationId" = current_org_id()
  ));

-- Lead
CREATE POLICY lead_isolation ON "Lead"
  USING ("organizationId" = current_org_id());

-- EmbedScript
CREATE POLICY embed_script_isolation ON "EmbedScript"
  USING ("botId" IN (SELECT id FROM "Bot" WHERE "organizationId" = current_org_id()));

-- Usage
CREATE POLICY usage_isolation ON "Usage"
  USING ("organizationId" = current_org_id());

-- UsageHourly
CREATE POLICY usage_hourly_isolation ON "UsageHourly"
  USING ("organizationId" = current_org_id());

-- ApiKey
CREATE POLICY api_key_isolation ON "ApiKey"
  USING ("organizationId" = current_org_id());

-- Integration
CREATE POLICY integration_isolation ON "Integration"
  USING ("organizationId" = current_org_id());

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id()));

-- Activity
CREATE POLICY activity_isolation ON "Activity"
  USING ("organizationId" = current_org_id());

-- Notification
CREATE POLICY notification_isolation ON "Notification"
  USING ("organizationId" = current_org_id());

-- Subscription
CREATE POLICY subscription_isolation ON "Subscription"
  USING ("organizationId" = current_org_id());

-- Invoice
CREATE POLICY invoice_isolation ON "Invoice"
  USING ("organizationId" = current_org_id());

-- Payment
CREATE POLICY payment_isolation ON "Payment"
  USING ("invoiceId" IN (SELECT id FROM "Invoice" WHERE "organizationId" = current_org_id()));

-- AgentWorkflow
CREATE POLICY agent_workflow_isolation ON "AgentWorkflow"
  USING ("organizationId" = current_org_id());

-- AgentExecution
CREATE POLICY agent_execution_isolation ON "AgentExecution"
  USING ("organizationId" = current_org_id());

-- Activity
CREATE POLICY activity_isolation ON "Activity"
  USING ("organizationId" = current_org_id());

-- AuditLog
CREATE POLICY audit_log_isolation ON "AuditLog"
  USING ("organizationId" = current_org_id());

-- SecurityEvent
CREATE POLICY security_event_isolation ON "SecurityEvent"
  USING ("organizationId" = current_org_id() OR "organizationId" IS NULL);

-- ApiKey
CREATE POLICY api_key_isolation ON "ApiKey"
  USING ("organizationId" = current_org_id());

-- Notification
CREATE POLICY notification_isolation ON "Notification"
  USING ("organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id()));

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id()));

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id()));

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id()));

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id()));

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id()));

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id()));

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id()));

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id()));

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id()));

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id());

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id()));

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id());

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id());

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id());

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id());

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id());

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id());

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id());

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id());

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id());

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id());

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id());

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id());

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id());

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id()));

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id());

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  USING ("templateId" IN (SELECT id FROM "PromptTemplate" WHERE "organizationId" = current_org_id());

-- EvaluationDataset
CREATE POLICY evaluation_dataset_isolation ON "EvaluationDataset"
  USING ("organizationId" = current_org_id());

-- EvaluationExample
CREATE POLICY evaluation_example_isolation ON "EvaluationExample"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- EvaluationRun
CREATE POLICY evaluation_run_isolation ON "EvaluationRun"
  USING ("datasetId" IN (SELECT id FROM "EvaluationDataset" WHERE "organizationId" = current_org_id()));

-- Webhook
CREATE POLICY webhook_isolation ON "Webhook"
  USING ("organizationId" = current_org_id());

-- WebhookDelivery
CREATE POLICY webhook_delivery_isolation ON "WebhookDelivery"
  USING ("webhookId" IN (SELECT id FROM "Webhook" WHERE "organizationId" = current_org_id());

-- AgentMemory
CREATE POLICY agent_memory_isolation ON "AgentMemory"
  USING ("organizationId" = current_org_id());

-- ConversationSummary
CREATE POLICY conversation_summary_isolation ON "ConversationSummary"
  USING ("organizationId" = current_org_id());

-- PromptTemplate
CREATE POLICY prompt_template_isolation ON "PromptTemplate"
  USING ("organizationId" = current_org_id());

-- PromptVersion
CREATE POLICY prompt_version_isolation ON "PromptVersion"
  US