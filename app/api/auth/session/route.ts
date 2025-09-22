import { withApiHandler } from '@/lib/middleware/api-wrapper'
import { getCurrentSession } from '@/lib/auth/session'

export const GET = withApiHandler(async () => {
  const session = await getCurrentSession()

  if (!session) {
    return {
      authenticated: false,
      user: null,
    }
  }

  return {
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? session.user.email,
      avatarUrl: session.user.avatarUrl,
    },
    expiresAt: session.expiresAt.toISOString(),
  }
}, { requireAuth: false })
