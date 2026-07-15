import { FastifyInstance } from 'fastify';

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

export async function setupTelemetry(fastify: FastifyInstance): Promise<void> {
  // Only enable in production/staging
  const isEnabled = process.env.OTEL_ENABLED === 'true' || process.env.NODE_ENV === 'production';
  
  if (!isEnabled) {
    console.log('OpenTelemetry disabled (set OTEL_ENABLED=true to enable)');
    fastify.decorate('otel', createNoopOtel());
    return;
  }

  // Use require to avoid TS issues with opentelemetry
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const opentelemetry = require('@opentelemetry/api');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const { Resource } = require('@opentelemetry/resources');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const { registerInstrumentations } = require('@opentelemetry/instrumentation');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const { FastifyInstrumentation } = require('@opentelemetry/instrumentation-fastify');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const { PgInstrumentation } = require('@opentelemetry/instrumentation-pg');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const { RedisInstrumentation } = require('@opentelemetry/instrumentation-redis');
  // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
  const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');

  // Configure resource
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'atheer-agent-api',
    'service.version': process.env.APP_VERSION || '1.0.0',
    'deployment.environment': process.env.NODE_ENV || 'development',
    'service.namespace': 'atheer-agent',
  });

  // Create tracer provider
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const provider = new NodeTracerProvider({ resource });

  // Jaeger Exporter
  const jaegerEndpoint = process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces';
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const jaegerExporter = new JaegerExporter({
    endpoint: jaegerEndpoint,
  });

  // Use SimpleSpanProcessor
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const spanProcessor = new SimpleSpanProcessor(jaegerExporter);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  provider.addSpanProcessor(spanProcessor);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  provider.register();

  // Register instrumentations
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  registerInstrumentations({
    instrumentations: [
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      new FastifyInstrumentation({
        requestHook: (span: any, request: any) => {
          span.setAttribute('http.route', request.url);
          span.setAttribute('http.method', request.method);
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      new HttpInstrumentation({
        requestHook: (span: any, request: any) => {
          span.setAttribute('http.method', request.method);
          span.setAttribute('http.url', request.url);
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      new PgInstrumentation({
        enhancedDatabaseReporting: true,
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      new RedisInstrumentation(),
    ],
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const { trace, SpanStatusCode } = opentelemetry;

  // Create OTEL utility object
  const otel = {
    tracer: trace.getTracer('atheer-agent-api'),
    
    startSpan: (name: string, options: any = {}) => {
      return trace.getTracer('atheer-agent-api').startSpan(name, {
        kind: options.kind || 1,
        attributes: options.attributes || {},
      });
    },

    traceAsync: async <T>(name: string, fn: () => Promise<any>, attributes?: Record<string, any>): Promise<any> => {
      const span = trace.getTracer('atheer-agent-api').startSpan(name);
      try {
        if (attributes) {
          span.setAttributes(attributes);
        }
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
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
  fastify.decorate('otel', otel);

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

export default setupTelemetry;