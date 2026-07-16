import { fetch } from 'undici';

export function createConversationModule(context: any) {
  const conversationServiceURL = process.env.CONVERSATION_SERVICE_URL || 'http://localhost:3005';

  return {
    // ============================================
    // CONVERSATION CRUD
    // ============================================

    async createConversation(input: any, userId: string) {
      const url = `${conversationServiceURL}/api/v1/conversation/conversations`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, userId })
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

    async updateConversation(conversationId: string, input: any, userId: string) {
      const url = `${conversationServiceURL}/api/v1/conversation/conversations/${conversationId}`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, userId })
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Update failed');
      }
      return response.json();
    },

    async deleteConversation(conversationId: string, userId: string) {
      const url = `${conversationServiceURL}/api/v1/conversation/conversations/${conversationId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
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
    // MESSAGES
    // ============================================

    async addMessage(conversationId: string, input: any) {
      const url = `${conversationServiceURL}/api/v1/conversation/conversations/${conversationId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
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
    // ANALYTICS
    // ============================================

    async getAnalytics(conversationId: string) {
      const url = `${conversationServiceURL}/api/v1/conversation/conversations/${conversationId}/analytics`;
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
      if (!response.ok) {
        throw new Error('Health check failed: ' + response.status);
      }
      return response.json();
    }
  };
}