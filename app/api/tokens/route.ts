import { withApiHandler, getJsonBody, getParams, ApiContext } from '@/lib/middleware/api-wrapper'
import { db } from '@/lib/db'
import { apiTokens } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'

// GET /api/tokens - List user's tokens
export const GET = withApiHandler(async ({ user }: ApiContext) => {
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
    .where(eq(apiTokens.userId, user.id))
    .all()

  // Show only first 8 and last 4 characters of token
  const tokensWithPreview = tokens.map(token => ({
    ...token,
    tokenPreview: token.tokenPreview ? 
      `${token.tokenPreview.slice(0, 8)}...${token.tokenPreview.slice(-4)}` : 
      null
  }))

  return { tokens: tokensWithPreview }
})

// POST /api/tokens - Create a new token
export const POST = withApiHandler(async ({ user, request }: ApiContext) => {
  const { name, expiresInDays } = await getJsonBody(request)

  if (!name || typeof name !== 'string') {
    throw new Error('bad request: Token name is required')
  }

  // Generate a secure random token
  const tokenValue = `obl_${crypto.randomBytes(32).toString('base64url')}`
  
  // Calculate expiration date if provided
  let expiresAt = null
  if (expiresInDays && typeof expiresInDays === 'number') {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)
  }

  const [newToken] = await db
    .insert(apiTokens)
    .values({
      userId: user.id,
      name,
      token: tokenValue,
      expiresAt,
    })
    .returning()

  // Return the full token only on creation
  return {
    token: {
      id: newToken.id,
      name: newToken.name,
      token: newToken.token, // Full token shown only once
      createdAt: newToken.createdAt,
      expiresAt: newToken.expiresAt,
    },
    message: 'Save this token securely. You won\'t be able to see it again.',
  }
})

// DELETE /api/tokens - Delete a token
export const DELETE = withApiHandler(async ({ user, request }: ApiContext) => {
  const searchParams = getParams(request)
  const tokenId = searchParams.get('id')

  if (!tokenId) {
    throw new Error('bad request: Token ID is required')
  }

  // Delete only if it belongs to the user
  await db
    .delete(apiTokens)
    .where(
      and(
        eq(apiTokens.id, tokenId),
        eq(apiTokens.userId, user.id)
      )
    )

  return { message: 'Token deleted successfully' }
})