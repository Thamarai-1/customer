import morgan from 'morgan';
import { RequestHandler } from 'express';

// Use standard Apache/Nginx combined style for production, concise dev style for local development
export const requestLogger: RequestHandler = morgan(
  process.env.NODE_ENV === 'production'
    ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
    : ':method :url :status :response-time ms - :res[content-length]'
);
