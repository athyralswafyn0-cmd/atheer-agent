import { fetch } from 'undici';

export function createConversationModule(context: any) {
  const conversationServiceURL = process.env.CONVERSATION_SERVICE_URL || 'http://localhost:3005';
  return {
    async exampleMethod() {
      const url = conversationServiceURL + '/api/v1/conversation/example';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Example method failed: ' + response.status);
      }
      return response.json();
    }
  };
}