import { config } from 'dotenv';
import { resolve } from 'node:path';
config({ path: resolve(import.meta.dirname, '../../.env') });
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/schema/index.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
