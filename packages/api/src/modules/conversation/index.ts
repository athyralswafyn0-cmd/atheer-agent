import { fetch } from 'undici';

export function createConversationModule(context: any) {
  const conversationServiceURL = process.env.CONVERSATION_SERVICE_URL || 'http://localhost:3005';

  return {
    // ============================================
    // CONVERSATION CRUD
    // ============================================

    async createConversation(input: any, botId: string, organizationId: string) {
      const url = `${conversationServiceURL}/api/v1/conversation/conversations`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, botId, organizationId })
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Creation failed');
      }
      return response.json();
    },

    async getConversation(conversationId: string) {
      const url = `${conversationServiceURL}/api/v1/conversation/conversations/${conversationId}`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Fetch failed');
      }
      return response.json();
    },

    async updateConversation(conversationId: string, input: any) {
      const url = `${conversationServiceURL}/api/v1/conversation/conversations/${conversationId}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Update failed');
      }
      return response.json();
    },

    async deleteConversation(conversationId: string) {
      const url = `${conversationServiceURL}/api/v1/conversation/conversations/${conversationId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Delete failed: ' + response.status);
      }
      return response.json();
    },

    async listConversations(query?: any) {
      const params = new URLSearchParams(query || {});
      const url = `${conversationServiceURL}/api/v1/conversation/conversations?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('List conversations failed: ' + response.status);
      }
      return response.json();
    },

    // ============================================
    // MESSAGE MANAGEMENT
    // ============================================

    async addMessage(conversationId: string, message: any) {
      const url = `${conversationServiceURL}/api/v1/conversation/conversations/${conversationId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      if (!response.ok) {
        throw new Error('Add message failed: ' + response.status);
      }
      return response.json();
    },

    async getMessages(conversationId: string, query?: any) {
      const params = new URLSearchParams(query || {});
      const url = `${conversationServiceURL}/api/v1/conversation/conversations/${conversationId}/messages?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Get messages failed: ' + response.status);
      }
      return response.json();
    },

    // ============================================
    // CONVERSATION STATE
    // ============================================

    async updateStatus(conversationId: string, status: string) {
      const url = `${conversationServiceURL}/api/v1/conversation/conversations/${conversationId}/status`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        throw new Error('Update status failed: ' + response.status);
      }
      return response.json();
    },

    async assignAgent(conversationId: string, agentId: string) {
      const url = `${conversationServiceURL}/api/v1/conversation/conversations/${conversationId}/assign`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      if (!response.ok) {
        throw new Error('Assign agent failed: ' + response.status);
      }
      return response.json();
    },

    // ============================================
    // ANALYTICS
    // ============================================

    async getConversationAnalytics(botId: string, query?: any) {
      const params = new URLSearchParams(query || {});
      const url = `${conversationServiceURL}/api/v1/conversation/bots/${botId}/analytics?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Get analytics failed: ' + response.status);
      }
      return response.json();
    },

    // ============================================
    // HEALTH CHECK
    // ============================================

    async healthCheck() {
      const url = `${conversationServiceURL}/health`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Health check failed: ' + response.status);
      return response.json();
    }
  };
}