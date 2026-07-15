import { fetch } from 'undici';

export function createWidgetModule(context: any) {
  const widgetServiceURL = process.env.WIDGET_SERVICE_URL || 'http://localhost:3006';
  return {
    // This is a placeholder. In a real scenario, we would map all the methods of the module.
    // For now, we'll just return an object with a placeholder method to show the pattern.
    // You would need to implement each method to call the corresponding endpoint on the {service_name} service.
    async exampleMethod() {
      const response = await fetch(${widgetServiceURL}/api/v1/widget/example);
      if (!response.ok) {
        throw new Error(`Example method failed: ${response.status}`);
      }
      return response.json();
    }
    // Add other methods as needed...
  };
}