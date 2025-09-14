import { AchievementTracker } from '../lib/achievements/tracker'

async function checkAndUnlockAchievements() {
  const userId = '03fdc299-8363-4543-b7b0-e6fc61000401'
  const tracker = new AchievementTracker(userId)

  console.log('Checking achievements for user:', userId)

  // Check and unlock achievements
  const newAchievements = await tracker.checkAchievements()

  if (newAchievements.length > 0) {
    console.log('Unlocked achievements:', newAchievements)
  } else {
    console.log('No new achievements unlocked')
  }

  // Get all achievements and progress
  const result = await tracker.getUserAchievements()

  console.log('\nStats:')
  console.log('- Total sessions:', result.stats?.totalSessions)
  console.log('- Cards reviewed:', result.stats?.totalCardsReviewed)
  console.log('- Cards created:', result.stats?.totalCardsCreated)
  console.log('- Decks created:', result.stats?.decksCreated)

  console.log('\nUnlocked achievements:')
  const unlocked = result.achievements.filter(a => a.unlocked)
  unlocked.forEach(a => {
    console.log(`- ${a.name}: ${a.description} (${a.points} points)`)
  })

  console.log('\nTotal points:', result.totalPoints)

  process.exit(0)
}

checkAndUnlockAchievements().catch(console.error)