import { fetch } from 'undici';

export function createBotModule(context: any) {
  const botServiceURL = process.env.BOT_SERVICE_URL || 'http://localhost:3004';

  return {
    // ============================================
    // BOT CRUD
    // ============================================

    async createBot(input: any, ownerId: string) {
      const url = `${botServiceURL}/api/v1/bot/bots`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, ownerId })
      });
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error || 'Creation failed');
      }
      return response.json();
    },

    async getBot(botId: string) {
      const url = `${botServiceURL}/api/v1/bot/bots/${botId}`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Fetch failed');
      }
      return response.json();
    },

    async updateBot(botId: string, input: any, userId: string) {
      const url = `${botServiceURL}/api/v1/bot/bots/${botId}`;
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

    async deleteBot(botId: string, userId: string) {
      const url = `${botServiceURL}/api/v1/bot/bots/${botId}`;
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

    async listBots(query?: any) {
      const params = new URLSearchParams(query || {});
      const url = `${botServiceURL}/api/v1/bot/bots?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('List bots failed: ' + response.status);
      }
      return response.json();
    },

    // ============================================
    // BOT CONFIGURATION
    // ============================================

    async updateBotConfig(botId: string, config: any) {
      const url = `${botServiceURL}/api/v1/bot/bots/${botId}/config`;
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Config update failed');
      }
      return response.json();
    },

    async getBotConfig(botId: string) {
      const url = `${botServiceURL}/api/v1/bot/bots/${botId}/config`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Config fetch failed');
      }
      return response.json();
    },

    // ============================================
    // KNOWLEDGE BASE
    // ============================================

    async addKnowledge(botId: string, input: any) {
      const url = `${botServiceURL}/api/v1/bot/bots/${botId}/knowledge`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      if (!response.ok) {
        throw new Error('Add knowledge failed: ' + response.status);
      }
      return response.json();
    },

    async listKnowledge(botId: string) {
      const url = `${botServiceURL}/api/v1/bot/bots/${botId}/knowledge`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('List knowledge failed: ' + response.status);
      }
      return response.json();
    },

    async deleteKnowledge(botId: string, knowledgeId: string) {
      const url = `${botServiceURL}/api/v1/bot/bots/${botId}/knowledge/${knowledgeId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Delete knowledge failed: ' + response.status);
      }
      return response.json();
    },

    // ============================================
    // HEALTH CHECK
    // ============================================

    async healthCheck() {
      const url = `${botServiceURL}/health`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Health check failed: ' + response.status);
      }
      return response.json();
    }
  };
}