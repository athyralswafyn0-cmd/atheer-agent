import { fetch } from 'undici';

export function createWidgetModule(context: any) {
  const widgetServiceURL = process.env.WIDGET_SERVICE_URL || 'http://localhost:3006';
  return {
    async exampleMethod() {
      const url = widgetServiceURL + '/api/v1/widget/example';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Example method failed: ' + response.status);
      }
      return response.json();
    }
  };
}