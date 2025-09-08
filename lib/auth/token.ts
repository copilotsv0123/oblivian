import { apiTokenRepository } from '@/lib/repositories/api-token-repository'
import { userRepository } from '@/lib/repositories/user-repository'

export async function validateApiToken(token: string) {
  if (!token || !token.startsWith('obl_')) {
    return null
  }

  try {
    // Find valid token
    const apiToken = await apiTokenRepository.findValidByToken(token)
    if (!apiToken) {
      return null
    }

    // Get user info
    const user = await userRepository.findById(apiToken.userId)
    if (!user) {
      return null
    }

    // Update last used timestamp
    await apiTokenRepository.updateLastUsedByToken(token)

    return {
      userId: apiToken.userId,
      userEmail: user.email,
    }
  } catch (error) {
    console.error('Error validating API token:', error)
    return null
  }
}