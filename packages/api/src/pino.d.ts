/// <reference types="pino" />

declare module 'pino' {
  interface LoggerOptions<CustomLevels extends string = never> {
    level?: string | number;
    transport?: {
      target: string;
      options?: Record<string, unknown>;
    } | undefined;
    [key: string]: unknown;
  }

  interface Logger<CustomLevels extends string = never> {
    level: string;
    info: (obj: unknown, msg?: string) => void;
    warn: (obj: unknown, msg?: string) => void;
    error: (obj: unknown, msg?: string) => void;
    debug: (obj: unknown, msg?: string) => void;
    trace: (obj: unknown, msg?: string) => void;
    fatal: (obj: unknown, msg?: string) => void;
    child: (bindings: Record<string, unknown>) => Logger<CustomLevels>;
    [key: string]: unknown;
  }

  interface LevelMapping {
    [key: string]: number;
  }

  export function pino<CustomLevels extends string = never>(optionsOrStream?: LoggerOptions<CustomLevels> | NodeJS.WritableStream): Logger<CustomLevels>;
  export function pino<CustomLevels extends string = never>(options: LoggerOptions<CustomLevels>, stream?: NodeJS.WritableStream): Logger<CustomLevels>;

  export const version: string;
  export const levels: LevelMapping;
  export const stdSerializers: Record<string, (obj: unknown) => string>;
  export const stdTimeFunctions: Record<string, () => string>;
  export const symbols: Record<string, symbol>;

  export default function pino<CustomLevels extends string = never>(optionsOrStream?: LoggerOptions<CustomLevels> | NodeJS.WritableStream): Logger<CustomLevels>;
  export default function pino<CustomLevels extends string = never>(options: LoggerOptions<CustomLevels>, stream?: NodeJS.WritableStream): Logger<CustomLevels>;

  export type { Logger, LoggerOptions, LevelMapping };
}