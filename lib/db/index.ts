import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema-postgres'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables')
}

const pool = new Pool({ connectionString: DATABASE_URL })

export const db = drizzle(pool, { schema })

export * from './schema-postgres'