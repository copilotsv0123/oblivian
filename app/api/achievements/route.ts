import { withApiHandler, ApiContext } from '@/lib/middleware/api-wrapper'
import { getUserAchievements } from '@/lib/achievements/tracker'

export const GET = withApiHandler(async ({ user }: ApiContext) => {
  const data = await getUserAchievements(user.id)
  return data
})