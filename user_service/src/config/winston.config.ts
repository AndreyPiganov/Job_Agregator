import { ConfigService } from '@nestjs/config';
import { WinstonModuleOptions } from 'nest-winston';
import { mkdirSync } from 'node:fs';
import { format, transports } from 'winston';

const onlyLevel = (level: string) => format((info) => (info.level === level ? info : false))();

export function createWinstonConfig(config: ConfigService): WinstonModuleOptions {
  const logDirectory = config.get<string>('logging.directory', 'logs');
  const logLevel = config.get<string>('logging.level', 'info');

  mkdirSync(logDirectory, { recursive: true });

  return {
    level: logLevel,
    format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
    transports: [
      new transports.Console(),
      new transports.File({ filename: `${logDirectory}/error.log`, level: 'error' }),
      new transports.File({ filename: `${logDirectory}/warn.log`, level: 'warn', format: onlyLevel('warn') }),
      new transports.File({ filename: `${logDirectory}/info.log`, level: 'info', format: onlyLevel('info') }),
      new transports.File({ filename: `${logDirectory}/combined.log` }),
    ],
  };
}
