import { FastifyInstance } from 'fastify';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { trace, SpanStatusCode, Span, context, propagation, SpanKind } from '@opentelemetry/api';

declare module 'fastify' {
  interface FastifyInstance {
    tracer: any;
    otel: {
      tracer: any;
      startSpan: (name: string, options?: any) => any;
      traceAsync: <T>(name: string, fn: () => Promise<any>, attributes?: Record<string, any>) => Promise<any>;
      injectTrace: (carrier: Record<string, string>) => void;
      extractTrace: (carrier: Record<string, string>) => any;
    };
  }
  
  interface FastifyRequest {
    span?: any;
  }
}

export async function setupTelemetry(fastify: any): Promise<void> {
  // Only enable in production/staging
  const isEnabled = process.env.OTEL_ENABLED === 'true' || process.env.NODE_ENV === 'production';
  
  if (!isEnabled) {
    console.log('OpenTelemetry disabled (set OTEL_ENABLED=true to enable)');
    fastify.decorate('otel', createNoopOtel());
    return;
  }

  // Configure resource
  const resource = new Resource({
    'service.name': 'atheer-agent-api',
    'service.version': process.env.APP_VERSION || '1.0.0',
    'deployment.environment': process.env.NODE_ENV || 'development',
    'service.namespace': 'atheer-agent',
  });

  // Create tracer provider
  const provider = new NodeTracerProvider({ resource });

  // Jaeger Exporter
  const jaegerEndpoint = process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces';
  const jaegerExporter = new JaegerExporter({
    endpoint: jaegerEndpoint,
  });

  provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter, {
    maxExportBatchSize: 100,
    scheduledDelayMillis: 5000,
    maxQueueSize: 2048,
  }));

  provider.register();

  // Register instrumentations
  registerInstrumentations({
    instrumentations: [
      new FastifyInstrumentation({
        requestHook: (span: any, request: any) => {
          span.setAttribute('http.route', request.url);
          span.setAttribute('http.method', request.method);
        },
      }),
      new HttpInstrumentation({
        requestHook: (span: any, request: any) => {
          span.setAttribute('http.method', request.method);
          span.setAttribute('http.url', request.url);
        },
      }),
      new PgInstrumentation({
        enhancedDatabaseReporting: true,
      }),
      new RedisInstrumentation(),
    ],
  });

  const tracer = trace.getTracer('atheer-agent-api');

  // Create OTEL utility object
  const otel = {
    tracer,
    
    startSpan: (name: string, options: any = {}) => {
      return trace.getTracer('atheer-agent-api').startSpan(name, {
        kind: options.kind || 1,
        attributes: options.attributes || {},
      });
    },

    traceAsync: async <T>(name: string, fn: () => Promise<any>, attributes?: Record<string, any>): Promise<any> => {
      const tracer = trace.getTracer('atheer-agent-api');
      const span = trace.getTracer('atheer-agent-api').startSpan(name);
      try {
        if (attributes) {
          span.setAttributes(attributes);
        }
        const result = await fn();
        span.setStatus({ code: 0 }); // OK
        return result;
      } catch (error) {
        span.setStatus({ code: 2, message: error instanceof Error ? error.message : String(error) });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    },

    injectTrace: (carrier: Record<string, string>) => {
      // propagation.inject(context.active(), carrier);
    },

    extractTrace: (carrier: Record<string, string>) => {
      return {};
    },
  };

  // Add to fastify instance
  const fastify = globalThis as any;
  fastify.decorate('otel', otel);

  // Add trace context to all requests
  // Note: This will be added when fastify is available

  console.log('OpenTelemetry initialized');
}

// No-op OTEL for development
function createNoopOtel() {
  const noopSpan = {
    setAttribute: () => {},
    setAttributes: () => {},
    addEvent: () => {},
    setStatus: () => {},
    recordException: () => {},
    end: () => {},
    spanContext: () => ({ traceId: '', spanId: '' }),
  };

  return {
    tracer: {
      startSpan: () => ({ ...noopSpan }),
      startActiveSpan: (name: string, fn: (span: any) => any) => fn({ ...noopSpan }),
    },
    startSpan: () => ({ ...{} }),
    traceAsync: async <T>(_name: string, fn: () => Promise<any>): Promise<any> => fn(),
    injectTrace: () => {},
    extractTrace: () => ({}),
  };
}

export default {};