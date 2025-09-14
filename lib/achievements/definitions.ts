export interface Achievement {
  id: string
  name: string
  description: string
  icon: string // emoji or icon name
  category: 'study' | 'streak' | 'cards' | 'decks' | 'performance' | 'special'
  points: number
  requirement: {
    type: string
    value: number
  }
}

export const ACHIEVEMENTS: Achievement[] = [
  // Study Achievements
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first study session',
    icon: '👶',
    category: 'study',
    points: 10,
    requirement: { type: 'total_sessions', value: 1 }
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Complete 10 study sessions',
    icon: '📚',
    category: 'study',
    points: 25,
    requirement: { type: 'total_sessions', value: 10 }
  },
  {
    id: 'scholar',
    name: 'Scholar',
    description: 'Complete 50 study sessions',
    icon: '🎓',
    category: 'study',
    points: 50,
    requirement: { type: 'total_sessions', value: 50 }
  },
  {
    id: 'professor',
    name: 'Professor',
    description: 'Complete 100 study sessions',
    icon: '👨‍🏫',
    category: 'study',
    points: 100,
    requirement: { type: 'total_sessions', value: 100 }
  },

  // Streak Achievements
  {
    id: 'consistency_king',
    name: 'Consistency King',
    description: 'Study 7 days in a row',
    icon: '👑',
    category: 'streak',
    points: 30,
    requirement: { type: 'streak_days', value: 7 }
  },
  {
    id: 'marathon_runner',
    name: 'Marathon Runner',
    description: 'Study 30 days in a row',
    icon: '🏃',
    category: 'streak',
    points: 75,
    requirement: { type: 'streak_days', value: 30 }
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Study 100 days in a row',
    icon: '🚀',
    category: 'streak',
    points: 200,
    requirement: { type: 'streak_days', value: 100 }
  },

  // Card Achievements
  {
    id: 'card_novice',
    name: 'Card Novice',
    description: 'Review 100 cards total',
    icon: '🃏',
    category: 'cards',
    points: 20,
    requirement: { type: 'total_cards_reviewed', value: 100 }
  },
  {
    id: 'card_master',
    name: 'Card Master',
    description: 'Review 1,000 cards total',
    icon: '♠️',
    category: 'cards',
    points: 50,
    requirement: { type: 'total_cards_reviewed', value: 1000 }
  },
  {
    id: 'card_legend',
    name: 'Card Legend',
    description: 'Review 10,000 cards total',
    icon: '♦️',
    category: 'cards',
    points: 150,
    requirement: { type: 'total_cards_reviewed', value: 10000 }
  },

  // Deck Achievements
  {
    id: 'deck_builder',
    name: 'Deck Builder',
    description: 'Create 5 decks',
    icon: '🏗️',
    category: 'decks',
    points: 25,
    requirement: { type: 'decks_created', value: 5 }
  },
  {
    id: 'knowledge_hoarder',
    name: 'Knowledge Hoarder',
    description: 'Add 500 cards to your collection',
    icon: '📦',
    category: 'decks',
    points: 40,
    requirement: { type: 'total_cards_created', value: 500 }
  },
  {
    id: 'polyglot',
    name: 'Polyglot',
    description: 'Create decks in 3 different languages',
    icon: '🌍',
    category: 'decks',
    points: 60,
    requirement: { type: 'languages_used', value: 3 }
  },

  // Performance Achievements
  {
    id: 'perfect_score',
    name: 'Perfect Score',
    description: 'Get 20 cards right in a row',
    icon: '💯',
    category: 'performance',
    points: 35,
    requirement: { type: 'correct_streak', value: 20 }
  },
  {
    id: 'memory_master',
    name: 'Memory Master',
    description: 'Achieve A+ grade on any deck',
    icon: '🧠',
    category: 'performance',
    points: 50,
    requirement: { type: 'a_plus_grade', value: 1 }
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Answer 10 cards correctly in under 30 seconds total',
    icon: '⚡',
    category: 'performance',
    points: 45,
    requirement: { type: 'speed_cards', value: 10 }
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete 5 sessions with 100% accuracy',
    icon: '✨',
    category: 'performance',
    points: 55,
    requirement: { type: 'perfect_sessions', value: 5 }
  },

  // Special Achievements
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Study between midnight and 4 AM',
    icon: '🦉',
    category: 'special',
    points: 15,
    requirement: { type: 'night_study', value: 1 }
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'Study between 5 AM and 7 AM',
    icon: '🐦',
    category: 'special',
    points: 15,
    requirement: { type: 'early_study', value: 1 }
  },
  {
    id: 'weekend_warrior',
    name: 'Weekend Warrior',
    description: 'Study on 10 weekends',
    icon: '⚔️',
    category: 'special',
    points: 30,
    requirement: { type: 'weekend_sessions', value: 10 }
  },
  {
    id: 'comeback_kid',
    name: 'Comeback Kid',
    description: 'Return to study after a 7+ day break',
    icon: '💪',
    category: 'special',
    points: 25,
    requirement: { type: 'comeback', value: 1 }
  },
  {
    id: 'social_learner',
    name: 'Social Learner',
    description: 'Make 3 decks public',
    icon: '🤝',
    category: 'special',
    points: 35,
    requirement: { type: 'public_decks', value: 3 }
  }
]

export const getTotalPossiblePoints = () => {
  return ACHIEVEMENTS.reduce((sum, achievement) => sum + achievement.points, 0)
}

export const getAchievementById = (id: string) => {
  return ACHIEVEMENTS.find(a => a.id === id)
}

export const getAchievementsByCategory = (category: Achievement['category']) => {
  return ACHIEVEMENTS.filter(a => a.category === category)
}