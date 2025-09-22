# Oblivian - Feature TODO List

## Core Technical Improvements
- [ ] **Repository Pattern for Frontend** - Replace isolated fetch calls with proper repository structure:
  - Create client-side repositories (SessionRepository, ReviewRepository, etc.)
  - Replace direct `fetch('/api/study/${id}/session', {...})` calls with `sessionRepo.update()`
  - Centralize API calls, error handling, and data transformation
  - Enable better testing, caching, and offline capabilities
- [x] **OpenAI Integration** - Integrate OpenAI API for computing embeddings (replace or complement current pgvector implementation)
- [ ] **Mobile Swipe Gestures** - Add swipe interactions for card reviews:
  - Swipe left → Don't know
  - Swipe down → Maybe/Hard
  - Swipe right → Know/Easy

## High Priority Features

### 1. AI Memory Coach ⭐
- [ ] Detect when users are pattern-matching instead of truly understanding
- [ ] Dynamically generate follow-up questions to test comprehension
- [ ] Intervene in real-time during review sessions
- [ ] Track understanding metrics beyond simple recall

### 2. Knowledge Graph Visualization ⭐
- [ ] Create interactive 3D graph showing connections between cards/concepts
- [ ] Use embeddings to auto-link related cards across decks
- [ ] Reveal hidden knowledge patterns and gaps
- [ ] Allow navigation through concept relationships

### 4. Daily Challenge Mode ⭐
- [ ] Create competitive daily challenges (like Wordle for flashcards)
- [ ] Everyone gets the same cards each day
- [ ] Compare retention rates with friends
- [ ] Implement blind test mechanics
- [ ] Add leaderboards and statistics

### 8. Voice Explanation Feature ⭐
- [ ] Allow users to record themselves explaining concepts after answering
- [ ] Use AI to analyze explanations for gaps/misconceptions
- [ ] Provide feedback on understanding quality
- [ ] Build true mastery assessment, not just recall

## Medium Priority Features

### 9. Streak Betting System
- [ ] Design virtual points/currency system
- [ ] Define streak milestones and rewards
- [ ] Determine unlockable features/themes
- [ ] Create risk/reward mechanics for maintaining streaks
- [ ] **Need to deep dive**: What's the real value for users? What gets unlocked?

### 10. Context-Aware Cards
- [ ] Generate cards based on current date (e.g., "X years ago today")
- [ ] Location-based card generation
- [ ] Current events integration
- [ ] AI-powered contextual content generation
- [ ] Special event-triggered decks

## Low Priority Features

### 3. AI Deck Generation
- [ ] Generate entire decks from themes (already possible via MCP)
- [ ] Extend existing decks with more cards
- [ ] **Note**: Low priority since this is already achievable through Claude MCP integration

## Features Not Pursuing
- ❌ Voice Review Mode (hands-free study)
- ❌ Adaptive Energy Scheduling (cognitive peak learning)
- ❌ Memory Palace Builder (spatial card organization)

## Notes
- Focus on features that enhance true understanding vs memorization
- Prioritize social/competitive elements for engagement
- Leverage existing AI capabilities (Claude MCP) before building new integrations