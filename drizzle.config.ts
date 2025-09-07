import type { Config } from 'drizzle-kit'

export default {
  dialect: 'sqlite',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: './data/oblivian.db',
  },
} satisfies Config