import { db } from '@/lib/db'
import { apiTokens, type ApiToken, type NewApiToken } from '@/lib/db'
import { eq, and, lt } from 'drizzle-orm'
import { BaseRepository, CreateResult, UpdateResult, DeleteResult } from './base-repository'

export interface CreateApiTokenInput {
  userId: string
  name: string
  token: string
  expiresAt?: Date
}

export interface UpdateApiTokenInput {
  name?: string
  expiresAt?: Date
}

export class ApiTokenRepository extends BaseRepository {
  async findById(tokenId: string): Promise<ApiToken | null> {
    try {
      const token = await db
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.id, tokenId))
        .then(res => res[0] || null)
      
      return token || null
    } catch (error) {
      this.handleError(error, 'findById')
    }
  }

  async findByToken(token: string): Promise<ApiToken | null> {
    try {
      this.validateRequiredFields({ token }, ['token'])
      
      const apiToken = await db
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.token, token))
        .then(res => res[0] || null)
      
      return apiToken || null
    } catch (error) {
      this.handleError(error, 'findByToken')
    }
  }

  async findByUserId(userId: string): Promise<ApiToken[]> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])
      
      const tokens = await db
        .select()
        .from(apiTokens)
        .where(eq(apiTokens.userId, userId))
        
      
      return tokens
    } catch (error) {
      this.handleError(error, 'findByUserId')
    }
  }

  async findTokensWithPreview(userId: string): Promise<Array<{id: string, name: string, createdAt: Date, lastUsedAt: Date | null, expiresAt: Date | null, tokenPreview: string | null}>> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])
      
      const tokens = await db
        .select({
          id: apiTokens.id,
          name: apiTokens.name,
          createdAt: apiTokens.createdAt,
          lastUsedAt: apiTokens.lastUsedAt,
          expiresAt: apiTokens.expiresAt,
          // Don't return the actual token for security
          tokenPreview: apiTokens.token,
        })
        .from(apiTokens)
        .where(eq(apiTokens.userId, userId))
        
      
      // Show only first 8 and last 4 characters of token
      const tokensWithPreview = tokens.map(token => ({
        id: token.id,
        name: token.name,
        createdAt: token.createdAt || new Date(),
        lastUsedAt: token.lastUsedAt,
        expiresAt: token.expiresAt,
        tokenPreview: token.tokenPreview ? 
          `${token.tokenPreview.slice(0, 8)}...${token.tokenPreview.slice(-4)}` : 
          null
      }))
      
      return tokensWithPreview
    } catch (error) {
      this.handleError(error, 'findTokensWithPreview')
    }
  }

  async findValidByToken(token: string): Promise<ApiToken | null> {
    try {
      this.validateRequiredFields({ token }, ['token'])
      
      const now = new Date()
      const apiToken = await db
        .select()
        .from(apiTokens)
        .where(
          and(
            eq(apiTokens.token, token),
            // Token is either not expired or has no expiration
            // Note: SQLite stores timestamps as integers
          )
        )
        .then(res => res[0] || null)
      
      // Additional check for expiration since SQLite date comparison can be tricky
      if (apiToken && apiToken.expiresAt && new Date(apiToken.expiresAt) < now) {
        return null
      }
      
      return apiToken || null
    } catch (error) {
      this.handleError(error, 'findValidByToken')
    }
  }

  async create(input: CreateApiTokenInput): Promise<CreateResult<ApiToken>> {
    try {
      this.validateRequiredFields(input, ['userId', 'name', 'token'])
      
      const [newToken] = await db
        .insert(apiTokens)
        .values({
          userId: input.userId,
          name: input.name,
          token: input.token,
          expiresAt: input.expiresAt || null,
        })
        .returning()

      return {
        success: true,
        data: newToken,
        id: newToken.id,
      }
    } catch (error) {
      this.handleError(error, 'create')
    }
  }

  async update(tokenId: string, input: UpdateApiTokenInput): Promise<UpdateResult<ApiToken>> {
    try {
      this.validateRequiredFields({ tokenId }, ['tokenId'])

      const updateData: Partial<NewApiToken> = {}
      
      if (input.name !== undefined) {
        updateData.name = input.name
      }
      
      if (input.expiresAt !== undefined) {
        updateData.expiresAt = input.expiresAt
      }

      if (Object.keys(updateData).length === 0) {
        return { success: true, changes: 0 }
      }

      const [updatedToken] = await db
        .update(apiTokens)
        .set(updateData)
        .where(eq(apiTokens.id, tokenId))
        .returning()

      return {
        success: true,
        data: updatedToken,
        changes: updatedToken ? 1 : 0,
      }
    } catch (error) {
      this.handleError(error, 'update')
    }
  }

  async updateLastUsed(tokenId: string): Promise<void> {
    try {
      this.validateRequiredFields({ tokenId }, ['tokenId'])

      await db
        .update(apiTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiTokens.id, tokenId))
    } catch (error) {
      this.handleError(error, 'updateLastUsed')
    }
  }

  async updateLastUsedByToken(token: string): Promise<void> {
    try {
      this.validateRequiredFields({ token }, ['token'])

      await db
        .update(apiTokens)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiTokens.token, token))
    } catch (error) {
      this.handleError(error, 'updateLastUsedByToken')
    }
  }

  async delete(tokenId: string): Promise<DeleteResult> {
    try {
      this.validateRequiredFields({ tokenId }, ['tokenId'])

      await db.delete(apiTokens).where(eq(apiTokens.id, tokenId))

      return {
        success: true,
        deletedId: tokenId,
      }
    } catch (error) {
      this.handleError(error, 'delete')
    }
  }

  async deleteByIdAndUserId(tokenId: string, userId: string): Promise<DeleteResult> {
    try {
      this.validateRequiredFields({ tokenId, userId }, ['tokenId', 'userId'])

      // Delete only if it belongs to the user
      await db
        .delete(apiTokens)
        .where(
          and(
            eq(apiTokens.id, tokenId),
            eq(apiTokens.userId, userId)
          )
        )

      return {
        success: true,
        deletedId: tokenId,
      }
    } catch (error) {
      this.handleError(error, 'deleteByIdAndUserId')
    }
  }

  async deleteByUserId(userId: string): Promise<{ success: boolean; deletedCount: number }> {
    try {
      this.validateRequiredFields({ userId }, ['userId'])

      const tokensToDelete = await this.findByUserId(userId)
      await db.delete(apiTokens).where(eq(apiTokens.userId, userId))

      return {
        success: true,
        deletedCount: tokensToDelete.length,
      }
    } catch (error) {
      this.handleError(error, 'deleteByUserId')
    }
  }

  async deleteExpired(): Promise<{ success: boolean; deletedCount: number }> {
    try {
      const now = new Date()
      const expiredTokens = await db
        .select()
        .from(apiTokens)
        .where(lt(apiTokens.expiresAt, now))
        

      if (expiredTokens.length > 0) {
        await db
          .delete(apiTokens)
          .where(lt(apiTokens.expiresAt, now))
      }

      return {
        success: true,
        deletedCount: expiredTokens.length,
      }
    } catch (error) {
      this.handleError(error, 'deleteExpired')
    }
  }
}

export const apiTokenRepository = new ApiTokenRepository()