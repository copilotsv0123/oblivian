import { withApiHandler, ApiContextOptionalAuth } from '@/lib/middleware/api-wrapper'

export const GET = withApiHandler(async ({ user }: ApiContextOptionalAuth) => {
  if (!user) {
    return { user: null }
  }
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? user.email,
      avatarUrl: user.avatarUrl,
    }
  }
}, { requireAuth: false })