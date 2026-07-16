import { fetch } from 'undici';

export function createPartnerModule(context: any) {
  const partnerServiceURL = process.env.PARTNER_SERVICE_URL || 'http://localhost:3003';
  return {
    async exampleMethod() {
      const url = partnerServiceURL + '/api/v1/partner/example';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Example method failed: ' + response.status);
      }
      return response.json();
    }
  };
}