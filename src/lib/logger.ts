type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  route?: string;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context) {
    entry.context = context;
  }

  if (error) {
    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    } else {
      entry.error = error;
    }
  }

  return JSON.stringify(entry);
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(formatLog('info', message, context));
  },
  warn(message: string, context?: LogContext) {
    console.warn(formatLog('warn', message, context));
  },
  error(message: string, context?: LogContext, error?: unknown) {
    console.error(formatLog('error', message, context, error));
  },
};
