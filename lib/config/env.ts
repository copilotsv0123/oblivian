/**
 * Centralized environment configuration validation
 * Validates required environment variables at startup
 */

type EmbeddingProvider = 'gemini'

interface EnvConfig {
  JWT_SECRET: string
  DATABASE_URL: string
  NODE_ENV: 'development' | 'production' | 'test'
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
  EMBEDDING_PROVIDER?: EmbeddingProvider
  GEMINI_EMBEDDING_MODEL?: string
}

class ConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

let config: EnvConfig | null = null

/**
 * Validates and returns environment configuration
 * Caches the result after first validation
 */
export function getConfig(): EnvConfig {
  if (config) return config

  const JWT_SECRET = process.env.JWT_SECRET
  const DATABASE_URL = process.env.DATABASE_URL || 'file:./oblivian.db'
  const NODE_ENV = (process.env.NODE_ENV || 'development') as EnvConfig['NODE_ENV']

  const rawProvider = process.env.EMBEDDING_PROVIDER?.toLowerCase()
  const EMBEDDING_PROVIDER = rawProvider === 'gemini'
    ? (rawProvider as EmbeddingProvider)
    : undefined

  // Validate required variables
  const missing: string[] = []
  
  if (!JWT_SECRET) {
    missing.push('JWT_SECRET')
  }

  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(', ')}. Please set them in your .env.local file.`
    
    // In development, log the error but don't crash the server
    if (NODE_ENV === 'development') {
      console.error(`[CONFIG ERROR] ${errorMessage}`)
      // Return a dummy config for development to prevent crashes
      config = {
        JWT_SECRET: 'development-only-secret-do-not-use-in-production',
        DATABASE_URL,
        NODE_ENV,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GEMINI_MODEL: process.env.GEMINI_MODEL,
        EMBEDDING_PROVIDER,
        GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL,
      }
      return config
    }
    
    throw new ConfigurationError(errorMessage)
  }

  config = {
    JWT_SECRET: JWT_SECRET!,
    DATABASE_URL,
    NODE_ENV,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
    EMBEDDING_PROVIDER,
    GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL,
  }

  return config
}

/**
 * Validates configuration is properly set
 * Returns true if valid, false otherwise
 */
export function isConfigValid(): boolean {
  try {
    const cfg = getConfig()
    return cfg.JWT_SECRET !== 'development-only-secret-do-not-use-in-production'
  } catch {
    return false
  }
}