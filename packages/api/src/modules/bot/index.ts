import { fetch } from 'undici';

export function createBotModule(context: any) {
  const botServiceURL = process.env.BOT_SERVICE_URL || 'http://localhost:3004';
  return {
    async exampleMethod() {
      const url = botServiceURL + '/api/v1/bot/example';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Example method failed: ' + response.status);
      }
      return response.json();
    }
  };
}