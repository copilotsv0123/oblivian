// Base repository class to ensure consistent patterns across all repositories
export abstract class BaseRepository {
  protected handleError(error: unknown, operation: string): never {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Repository error in ${operation}:`, errorMessage)
    throw new Error(`${operation} failed: ${errorMessage}`)
  }

  protected validateRequiredFields(data: Record<string, any>, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null) {
        throw new Error(`Required field '${field}' is missing`)
      }
    }
  }
}

// Common result types for repository operations
export interface RepositoryResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResult<T> {
  items: T[]
  totalCount?: number
  hasMore?: boolean
}

export interface CreateResult<T> {
  success: boolean
  data: T
  id: string
}

export interface UpdateResult<T> {
  success: boolean
  data?: T
  changes: number
}

export interface DeleteResult {
  success: boolean
  deletedId: string
}