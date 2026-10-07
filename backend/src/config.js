import dotenv from 'dotenv';
import { resolve } from 'node:path';

for (const envPath of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '.env'),
]) {
  dotenv.config({ path: envPath });
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  sessionSecret: process.env.SESSION_SECRET || 'change_me_session_secret',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost',
  whatsappNumber: process.env.WHATSAPP_NUMBER || '5491112345678',
  databaseUrl: process.env.DATABASE_URL || null,
};
