import { db } from '@/lib/db'
import { apiTokens, users } from '@/lib/db/schema'
import { eq, and, or, isNull, gte } from 'drizzle-orm'

export async function validateApiToken(token: string) {
  if (!token || !token.startsWith('obl_')) {
    return null
  }

  try {
    // Find token and associated user
    const result = await db
      .select({
        tokenId: apiTokens.id,
        userId: apiTokens.userId,
        userEmail: users.email,
        expiresAt: apiTokens.expiresAt,
      })
      .from(apiTokens)
      .innerJoin(users, eq(apiTokens.userId, users.id))
      .where(
        and(
          eq(apiTokens.token, token),
          or(
            isNull(apiTokens.expiresAt),
            gte(apiTokens.expiresAt, new Date())
          )
        )
      )
      .get()

    if (!result) {
      return null
    }

    // Update last used timestamp
    await db
      .update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, result.tokenId))

    return {
      userId: result.userId,
      userEmail: result.userEmail,
    }
  } catch (error) {
    console.error('Error validating API token:', error)
    return null
  }
}