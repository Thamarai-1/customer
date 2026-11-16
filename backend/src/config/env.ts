import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or backend directory if present
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BACKEND_PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  MONGODB_URI: z
    .string()
    .default('mongodb://localhost:27017/customer_engagement_assistant'),
  MONGODB_TIMEOUT_MS: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  REDIS_CONNECT_TIMEOUT_MS: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive()),
  CORS_ORIGIN: z.string().default('*'),
  JWT_SECRET: z.string().default('replace_with_secure_secret_min_32_characters_long'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('replace_with_secure_refresh_secret_min_32_characters_long'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ADMIN_EMAIL: z.string().default('admin@engagement.hcl.com'),
  ADMIN_PASSWORD: z.string().default('Admin@Secure2026!'),
  ADMIN_NAME: z.string().default('System Administrator'),
  // GenAI Provider Configuration for Phase 5
  AI_PROVIDER: z.enum(['OPENAI', 'GEMINI', 'ANTHROPIC']).default('OPENAI'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-3-5-haiku-20241022'),
  MESSAGE_GENERATION_TEMPERATURE: z.coerce.number().default(0.3),
  MESSAGE_GENERATION_MAX_TOKENS: z.coerce.number().default(1200),
  MESSAGE_GENERATION_TIMEOUT_MS: z.coerce.number().default(30000),
  MESSAGE_GENERATION_RETRY_LIMIT: z.coerce.number().default(2)
});

export type EnvConfig = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown> = process.env): EnvConfig => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errorDetails}`);
  }

  return result.data;
};

export const env: EnvConfig = validateEnv();
