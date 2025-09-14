# 🧠 Oblivian Technical Guide for Claude

This document contains comprehensive technical instructions for working with the Oblivian codebase - an AI-powered spaced repetition learning application.

## 🏗️ Project Architecture

**Oblivian** is a full-stack Next.js application built with TypeScript, focusing on spaced repetition learning with AI-powered flashcard generation via Claude Desktop MCP integration.

### Tech Stack
- **Frontend**: Next.js 15 + TypeScript 5.9 + Tailwind CSS 3.4
- **Backend**: Next.js API routes (Node.js runtime)
- **Database**: PostgreSQL with Drizzle ORM + pgvector for embeddings
- **Authentication**: Custom JWT-based auth with bcrypt password hashing
- **AI Integration**: Claude Desktop via Model Context Protocol (MCP)
- **Spaced Repetition**: FSRS algorithm implementation
- **Styling**: Tailwind CSS with custom design system, Lucide React icons
- **Deployment**: Vercel with Neon PostgreSQL

### Project Structure
```
oblivian/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (pages)/           # Page components
│   └── layout.tsx         # Root layout
├── lib/                   # Core business logic
│   ├── auth/              # Authentication utilities
│   ├── db/                # Database schema & connection
│   ├── repositories/      # Data access layer
│   ├── fsrs/              # FSRS algorithm implementation
│   └── embeddings/        # Vector similarity search
├── components/            # React components
├── mcp-server/           # MCP server implementation
└── drizzle-postgres/     # Database migrations
```

## 🛠️ Development Guidelines

### Code Standards
- **TypeScript**: Strict mode enabled, no `any` types
- **Components**: Functional components with hooks, no class components
- **Styling**: Tailwind CSS only, no custom CSS unless absolutely necessary
- **Database**: Use repository pattern, all queries through repositories
- **API**: RESTful endpoints with proper error handling via `ApiError` class
- **Authentication**: JWT tokens with middleware protection

### Commands
```bash
# Development
npm run dev          # Start development server (with Turbo)
npm run build        # Production build
npm run lint         # ESLint
npm run start        # Production server

# Database
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Drizzle Studio
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations

# MCP Testing
npm run mcp:test     # Test MCP server functionality
```

### Environment Variables Required
```env
DATABASE_URL="postgresql://..."  # Neon PostgreSQL connection
JWT_SECRET="your-secure-secret"  # JWT signing key
```

## 🏛️ Database Schema

Uses PostgreSQL with Drizzle ORM. Schema defined in `lib/db/schema-postgres.ts`:

### Core Tables
- **users**: User accounts with email/password
- **api_tokens**: API tokens for MCP authentication
- **decks**: Flashcard decks with metadata (title, level, language, visibility)
- **cards**: Individual flashcards with type, content, and advanced notes
- **reviews**: FSRS review records with scheduling data
- **study_sessions**: Learning session tracking
- **deck_scores**: Performance analytics per user/deck
- **deck_usage**: Deck popularity metrics
- **deck_embeddings**: Vector embeddings for similarity search (1536 dimensions)
- **deck_rankings**: Calculated deck popularity rankings

### Key Features
- UUID primary keys throughout
- Vector similarity using pgvector extension
- FSRS algorithm state storage in reviews
- Cascade deletes for data integrity
- Timestamp tracking for created/updated records

## 🎯 Core Features & Implementation

### 1. Spaced Repetition (FSRS)
- **Location**: `lib/fsrs/scheduler.ts`
- **Algorithm**: FSRS (Free Spaced Repetition Scheduler)
- **Library**: `ts-fsrs` npm package
- **State Management**: Reviews table stores interval, stability, difficulty
- **Ratings**: Again (1), Hard (2), Good (3), Easy (4)

### 2. Authentication System
- **Implementation**: Custom JWT with secure httpOnly cookies
- **Password**: bcrypt hashing with salt rounds
- **Middleware**: `lib/auth/middleware.ts` for route protection
- **API Tokens**: Separate token system for MCP authentication

### 3. MCP (Model Context Protocol) Integration
- **Server**: `mcp-server/` directory
- **Endpoint**: `/api/mcp` route
- **Tools**: Deck/card CRUD operations, batch operations
- **Authentication**: Bearer token via API tokens table
- **Claude Desktop**: Configured via `claude_desktop_config.json`

### 4. Vector Search & Recommendations
- **Database**: pgvector extension for vector storage
- **Embeddings**: 1536-dimension vectors (OpenAI compatible)
- **Service**: `lib/embeddings/service.ts`
- **Use Case**: Similar deck recommendations
- **Implementation**: Cosine similarity search

### 5. Card Types
- **Basic**: Traditional front/back flashcards
- **Cloze**: Fill-in-the-blank with deletion syntax
- **Multiple Choice**: Questions with choice options (JSON stored)
- **Explanation**: Cards with detailed explanations
- **Advanced Notes**: Additional context for deeper learning

## 🎨 Design System

### Tailwind Configuration
- **Colors**: CSS variables for theming (`hsl(var(--primary))` pattern)
- **Typography**: Inter font family via CSS variables
- **Radius**: Configurable border radius via CSS variables
- **Plugins**: @tailwindcss/forms, @tailwindcss/typography

### Design Principles
- **Minimalist**: Clean, Apple/Linear/Stripe-inspired interfaces
- **Responsive**: Mobile-first design with tablet/desktop optimization
- **Professional**: Consistent spacing, typography, and color usage
- **Component-Based**: Reusable components with consistent styling

### Color System
```css
/* CSS Variables defined in globals.css */
--primary: /* Main brand color */
--secondary: /* Secondary actions */
--muted: /* Subtle backgrounds */
--accent: /* Highlights and calls-to-action */
--destructive: /* Error states */
--border: /* Border colors */
```

## 📊 Repository Pattern

All database operations use repository classes in `lib/repositories/`:

### Base Repository
- **File**: `base-repository.ts`
- **Purpose**: Common CRUD operations, query building
- **Database**: Drizzle ORM with PostgreSQL

### Specific Repositories
- **DeckRepository**: Deck CRUD, similarity search, public deck filtering
- **CardRepository**: Card management, batch operations
- **ReviewRepository**: FSRS review tracking, scheduling
- **UserRepository**: User management, authentication
- **ApiTokenRepository**: MCP token management
- **RankingRepository**: Deck popularity calculations

### Usage Pattern
```typescript
// Always use repositories, never direct database queries
const deckRepo = new DeckRepository()
const decks = await deckRepo.findByOwner(userId)
```

## 🔒 Security Considerations

### Authentication
- JWT tokens with secure httpOnly cookies
- Password hashing with bcrypt (12 rounds)
- Protected API routes with middleware
- Token expiration and refresh handling

### API Security
- Input validation on all endpoints
- SQL injection prevention via Drizzle ORM
- Rate limiting considerations for MCP endpoints
- Secure token storage in database (hashed)

### Data Privacy
- User data isolation via proper foreign keys
- Cascade deletes for data cleanup
- No sensitive data in client-side storage
- API tokens with controlled scope

## 🚀 Deployment & Operations

### Vercel Deployment
- **Platform**: Vercel with automatic GitHub integration
- **Database**: Neon PostgreSQL (serverless)
- **Environment**: Production environment variables in Vercel
- **Build**: Next.js production build with static optimization

### Database Migrations
```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Push schema directly (development)
npm run db:push
```

### Performance Considerations
- Next.js App Router for optimal performance
- Database indexing on frequently queried columns
- Vector search optimization for embeddings
- API response caching where appropriate

## 🧪 Development Workflow

### Adding New Features
1. **Plan**: Use TodoWrite tool to track implementation steps
2. **Schema**: Update database schema if needed (`schema-postgres.ts`)
3. **Repository**: Add/modify repository methods for data access
4. **API**: Create/update API routes in `app/api/`
5. **Components**: Build React components with Tailwind
6. **Test**: Verify functionality works end-to-end
7. **Lint**: Run `npm run lint` before commits

### Code Quality Checklist
- [ ] TypeScript strict compliance
- [ ] Repository pattern for database access
- [ ] Error handling with ApiError class
- [ ] Tailwind CSS (no custom CSS)
- [ ] Component reusability
- [ ] Security considerations (auth, validation)
- [ ] Database performance (indexes, queries)

### Common Tasks

#### Adding New Card Type
1. Update `lib/types/cards.ts` with new type
2. Modify `CardRepository` for type-specific logic
3. Update card creation/editing components
4. Add MCP support in `app/api/mcp/route.ts`

#### Adding New API Endpoint
1. Create route in `app/api/[endpoint]/route.ts`
2. Use `apiHandler` wrapper from `lib/middleware/api-wrapper.ts`
3. Implement proper authentication if needed
4. Add error handling with `ApiError`
5. Update MCP server if endpoint should be exposed

#### Database Schema Changes
1. Modify `lib/db/schema-postgres.ts`
2. Run `npm run db:generate` to create migration
3. Test migration with `npm run db:migrate`
4. Update repository classes as needed
5. Update TypeScript types

## 🔧 Troubleshooting

### Common Issues
- **Database Connection**: Check `DATABASE_URL` environment variable
- **JWT Issues**: Verify `JWT_SECRET` is set and secure
- **MCP Connection**: Ensure API token is valid and Claude Desktop config is correct
- **Build Errors**: Run `npm run lint` and fix TypeScript errors
- **Migration Issues**: Use `npm run db:studio` to inspect database state

### Debug Commands
```bash
# Check database connection
npm run db:studio

# Test MCP server
npm run mcp:test

# Lint and type checking
npm run lint
npx tsc --noEmit
```

## 📚 Key Files Reference

### Configuration
- `package.json` - Dependencies and scripts
- `tailwind.config.js` - Tailwind CSS configuration
- `drizzle.config.ts` - Database configuration
- `tsconfig.json` - TypeScript configuration
- `next.config.mjs` - Next.js configuration

### Core Logic
- `lib/db/schema-postgres.ts` - Database schema
- `lib/repositories/` - Data access layer
- `lib/fsrs/scheduler.ts` - Spaced repetition algorithm
- `lib/auth/` - Authentication system
- `app/api/mcp/route.ts` - MCP server implementation

### Frontend
- `app/layout.tsx` - Root layout with providers
- `app/globals.css` - Global styles and CSS variables
- `components/AppLayout.tsx` - Main application layout

---

**Remember**: Always follow the repository pattern, use TypeScript strictly, and maintain consistency with the existing codebase architecture. When in doubt, refer to existing implementations as examples.