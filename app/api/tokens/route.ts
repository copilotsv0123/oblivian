import { withApiHandler, getJsonBody, getParams, ApiContext } from '@/lib/middleware/api-wrapper'
import { apiTokenRepository } from '@/lib/repositories'
import crypto from 'crypto'

// GET /api/tokens - List user's tokens
export const GET = withApiHandler(async ({ user }: ApiContext) => {
  const tokens = await apiTokenRepository.findTokensWithPreview(user.id)

  return { tokens }
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
  let expiresAt: Date | undefined = undefined
  if (expiresInDays && typeof expiresInDays === 'number') {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)
  }

  const result = await apiTokenRepository.create({
    userId: user.id,
    name,
    token: tokenValue,
    expiresAt,
  })

  if (!result.success || !result.data) {
    throw new Error('Failed to create token')
  }

  // Return the full token only on creation
  return {
    token: {
      id: result.data.id,
      name: result.data.name,
      token: result.data.token, // Full token shown only once
      createdAt: result.data.createdAt,
      expiresAt: result.data.expiresAt,
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

  await apiTokenRepository.deleteByIdAndUserId(tokenId, user.id)

  return { message: 'Token deleted successfully' }
})