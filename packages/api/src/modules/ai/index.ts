import { fetch } from 'undici';

export function createAIModule(context: any) {
  // This module provides AI capabilities - can be local or proxy to external services
  const groqApiKey = process.env.GROQ_API_KEY;
  const googleApiKey = process.env.GOOGLE_AI_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
  const googleModel = process.env.GOOGLE_AI_MODEL || 'gemini-1.5-flash';

  return {
    // ============================================
    // CHAT COMPLETIONS
    // ============================================

    async chatCompletion(messages: any[], options: any = {}) {
      const provider = options.provider || 'groq';
      
      if (provider === 'groq' && groqApiKey) {
        return this.groqChatCompletion(messages, options);
      } else if (provider === 'google' && googleApiKey) {
        return this.googleChatCompletion(messages, options);
      }
      
      throw new Error('No AI provider configured');
    },

    async groqChatCompletion(messages: any[], options: any = {}) {
      const url = 'https://api.groq.com/openai/v1/chat/completions';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: options.model || groqModel,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2000,
          stream: options.stream ?? false
        })
      });
      
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error?.message || 'Groq API error');
      }
      
      return response.json();
    },

    async googleChatCompletion(messages: any[], options: any = {}) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${googleApiKey}`;
      
      // Convert messages to Google format
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 2000,
          }
        })
      });
      
      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error?.message || 'Google API error');
      }
      
      return response.json();
    },

    // ============================================
    // EMBEDDINGS
    // ============================================

    async embeddings(texts: string[], options: any = {}) {
      const provider = options.provider || 'google';
      
      if (provider === 'google' && googleApiKey) {
        return this.googleEmbeddings(texts);
      }
      
      throw new Error('Embedding provider not configured');
    },

    async googleEmbeddings(texts: string[]) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${googleApiKey}`;
      
      const results = [];
      for (const text of texts) {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/text-embedding-004',
            content: { parts: [{ text }] }
          })
        });
        
        if (!response.ok) {
          const error = await response.json() as any;
          throw new Error(error.error?.message || 'Embedding error');
        }
        
        const data = await response.json() as any;
        results.push(data.embedding?.values || []);
      }
      
      return { embeddings: results };
    },

    // ============================================
    // KNOWLEDGE / RAG SUPPORT
    // ============================================

    async searchKnowledgeBase(botId: string, query: string, options: any = {}) {
      // This would proxy to the bot service for knowledge base search
      const botServiceURL = process.env.BOT_SERVICE_URL || 'http://localhost:3004';
      const url = `${botServiceURL}/api/v1/bot/bots/${botId}/knowledge/search`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, ...options })
      });
      
      if (!response.ok) {
        throw new Error('Knowledge search failed: ' + response.status);
      }
      
      return response.json();
    },

    // ============================================
    // HEALTH CHECK
    // ============================================

    async healthCheck() {
      const checks = {
        groq: groqApiKey ? 'configured' : 'not_configured',
        google: googleApiKey ? 'configured' : 'not_configured',
      };
      
      return {
        status: 'ok',
        providers: checks,
        timestamp: new Date().toISOString()
      };
    }
  };
}