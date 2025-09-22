# 🗄️ Database Configuration & Context

## Neon PostgreSQL Connection Details

- **Project ID**: `round-wildflower-28023156`
- **Production Branch**: `br-holy-silence-ab2jmzdi`
- **Database Engine**: PostgreSQL with pgvector extension
- **ORM**: Drizzle ORM
- **Connection**: Via `DATABASE_URL` environment variable

## Database Schema Overview

### Core Tables

#### `decks` Table
Primary table for flashcard decks with complete tagging support:

```sql
CREATE TABLE decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  level text NOT NULL DEFAULT 'simple',
  language text NOT NULL DEFAULT 'en',
  is_public boolean NOT NULL DEFAULT false,
  tags text NOT NULL DEFAULT '[]', -- JSON array of strings
  auto_reveal_seconds integer DEFAULT 5,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
```

**Key Features:**
- Tags stored as JSON array (`text` column with JSON content)
- Supports filtering with `JSON_CONTAINS` for tag queries
- Foreign key cascade delete from users table
- Default values for level ('simple') and language ('en')

#### Other Key Tables

- **`users`**: User accounts with email/password authentication
- **`api_tokens`**: API tokens for MCP authentication
- **`cards`**: Individual flashcards (front, back, advancedNotes required)
- **`reviews`**: FSRS spaced repetition review records
- **`study_sessions`**: Learning session tracking
- **`deck_scores`**: Performance analytics per user/deck
- **`deck_usage`**: Deck popularity metrics
- **`deck_embeddings`**: Vector embeddings for similarity search (1536 dimensions)
- **`deck_rankings`**: Calculated deck popularity rankings

## Recent Schema Changes

### Migration: Add Tags Support
- **File**: `/drizzle-postgres/0002_wealthy_cobalt_man.sql`
- **Applied**: Successfully migrated using Neon MCP
- **Change**: Added `tags` column to `decks` table

```sql
ALTER TABLE "decks" ADD COLUMN "tags" text DEFAULT '[]' NOT NULL;
```

## Tagging System Implementation

### Tag Storage Format
- **Type**: JSON array stored as text
- **Example**: `'["tech", "javascript", "frontend"]'`
- **Validation**: Normalized to lowercase, max 10 tags per deck
- **Max Length**: 50 characters per tag

### Tag Filtering Queries
The repository uses PostgreSQL's JSON functions for efficient tag filtering:

```sql
-- Find decks with specific tags
SELECT * FROM decks
WHERE JSON_CONTAINS(tags, '["tech"]')

-- Multiple tag OR filtering
SELECT * FROM decks
WHERE JSON_CONTAINS(tags, '["tech"]')
   OR JSON_CONTAINS(tags, '["javascript"]')
```

### Repository Methods
- `findByFilters()`: Supports tag filtering with other criteria
- `getUserTags()`: Returns all unique tags for a user's decks
- `updateWithOwnershipCheckWithTags()`: Updates deck with tag validation

## Database Operations

### Development Commands
```bash
# Push schema changes to database
npm run db:push

# Open database studio
npm run db:studio

# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate
```

### Neon MCP Usage
For production database operations, use Neon MCP tools:

```typescript
// Run SQL queries
mcp__neon__run_sql({
  projectId: "round-wildflower-28023156",
  branchId: "br-holy-silence-ab2jmzdi",
  sql: "SELECT * FROM decks WHERE tags != '[]'"
})

// Describe table schema
mcp__neon__describe_table_schema({
  projectId: "round-wildflower-28023156",
  branchId: "br-holy-silence-ab2jmzdi",
  tableName: "decks"
})
```

## Performance Considerations

### Indexes
- Primary key indexes on all UUID columns
- Consider adding GIN index for tags column if tag filtering becomes heavy:
  ```sql
  CREATE INDEX idx_decks_tags ON decks USING gin ((tags::jsonb));
  ```

### Vector Search
- Uses pgvector extension for deck similarity recommendations
- 1536-dimension embeddings stored in `deck_embeddings` table
- Embeddings generated via OpenAI/Anthropic APIs with deterministic local fallback
- Cosine similarity search for related deck suggestions

## Data Integrity

### Foreign Key Constraints
- `decks.owner_user_id` → `users.id` (CASCADE DELETE)
- `cards.deck_id` → `decks.id` (CASCADE DELETE)
- `reviews.card_id` → `cards.id` (CASCADE DELETE)

### Validation Rules
- Tags: lowercase, alphanumeric + spaces/hyphens/underscores only
- Card types: always 'basic' (enforced in application layer)
- Required fields: `advancedNotes` mandatory for all cards

## Backup & Recovery

### Neon Features
- Automatic backups with point-in-time recovery
- Branch-based development workflow
- Production branch protection

### Migration Strategy
1. Test schema changes on development branch
2. Generate migration files with Drizzle
3. Apply to production using Neon MCP tools
4. Verify with table schema inspection

## Current Database Status

✅ **Tags system fully implemented and migrated**
- Column added successfully
- Repository methods updated
- Frontend components integrated
- MCP contract supports tag operations

**Last Updated**: Applied tags column migration to production branch
**Schema Version**: 0002_wealthy_cobalt_man.sql