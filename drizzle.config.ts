import type { Config } from 'drizzle-kit'

export default {
  dialect: 'postgresql',
  schema: './lib/db/schema-postgres.ts',
  out: './drizzle-postgres',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config