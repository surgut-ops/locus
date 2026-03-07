type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = ((process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel) || 'info';

export class LoggerService {
  public constructor(private readonly context: string) {}

  public debug(message: string, metadata?: Record<string, unknown>) {
    this.log('debug', message, metadata);
  }

  public info(message: string, metadata?: Record<string, unknown>) {
    this.log('info', message, metadata);
  }

  public warn(message: string, metadata?: Record<string, unknown>) {
    this.log('warn', message, metadata);
  }

  public error(message: string, metadata?: Record<string, unknown>) {
    this.log('error', message, metadata);
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
    if (levelPriority[level] < levelPriority[configuredLevel]) {
      return;
    }

    const payload = {
      ts: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...metadata,
    };
    const line = JSON.stringify(payload);

    if (level === 'error') {
      console.error(line);
      return;
    }
    if (level === 'warn') {
      console.warn(line);
      return;
    }
    console.log(line);
  }
}
