type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: unknown;
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: string, data?: unknown): string {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...(context ? { context } : {}),
      ...(data !== undefined ? { data } : {})
    };
    return JSON.stringify(payload);
  }

  info(message: string, context?: string, data?: unknown): void {
    console.log(this.formatLog('info', message, context, data));
  }

  warn(message: string, context?: string, data?: unknown): void {
    console.warn(this.formatLog('warn', message, context, data));
  }

  error(message: string, context?: string, data?: unknown): void {
    console.error(this.formatLog('error', message, context, data));
  }

  debug(message: string, context?: string, data?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatLog('debug', message, context, data));
    }
  }
}

export const logger = new Logger();
