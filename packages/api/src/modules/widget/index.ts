import { fetch } from 'undici';

export function createWidgetModule(context: any) {
  const widgetServiceURL = process.env.WIDGET_SERVICE_URL || 'http://localhost:3006';

  return {
    // ============================================
    // WIDGET CRUD
    // ============================================

    async createWidget(input: any, ownerId: string) {
      const url = `${widgetServiceURL}/api/v1/widget/widgets`;
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

    async getWidget(widgetId: string) {
      const url = `${widgetServiceURL}/api/v1/widget/widgets/${widgetId}`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Fetch failed');
      }
      return response.json();
    },

    async updateWidget(widgetId: string, input: any, userId: string) {
      const url = `${widgetServiceURL}/api/v1/widget/widgets/${widgetId}`;
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

    async deleteWidget(widgetId: string, userId: string) {
      const url = `${widgetServiceURL}/api/v1/widget/widgets/${widgetId}`;
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

    async listWidgets(query?: any) {
      const params = new URLSearchParams(query || {});
      const url = `${widgetServiceURL}/api/v1/widget/widgets?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('List widgets failed: ' + response.status);
      }
      return response.json();
    },

    // ============================================
    // WIDGET CONFIGURATION
    // ============================================

    async updateWidgetConfig(widgetId: string, config: any) {
      const url = `${widgetServiceURL}/api/v1/widget/widgets/${widgetId}/config`;
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

    async getWidgetConfig(widgetId: string) {
      const url = `${widgetServiceURL}/api/v1/widget/widgets/${widgetId}/config`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Config fetch failed');
      }
      return response.json();
    },

    // ============================================
    // WIDGET DEPLOYMENT / EMBED
    // ============================================

    async getEmbedCode(widgetId: string) {
      const url = `${widgetServiceURL}/api/v1/widget/widgets/${widgetId}/embed`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Embed code fetch failed');
      }
      return response.json();
    },

    async getWidgetScript(widgetId: string) {
      const url = `${widgetServiceURL}/api/v1/widget/widgets/${widgetId}/script.js`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) return null;
        const error = await response.json() as any;
        throw new Error(error.error || 'Script fetch failed');
      }
      return response.text();
    },

    // ============================================
    // ANALYTICS
    // ============================================

    async getWidgetAnalytics(widgetId: string, query?: any) {
      const params = new URLSearchParams(query || {});
      const url = `${widgetServiceURL}/api/v1/widget/widgets/${widgetId}/analytics?${params.toString()}`;
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
      const url = `${widgetServiceURL}/health`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Health check failed: ' + response.status);
      }
      return response.json();
    }
  };
}