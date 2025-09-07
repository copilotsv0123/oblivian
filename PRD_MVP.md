## Product Context

### Vision

A modern, open source, web-based spaced repetition system (SRS) that anyone can use to learn faster. It combines classic Anki-like cards with a one-click AI-powered card generator. It targets individual learners across any subject (languages, politics, tech, geography, etc.) with a simple, powerful desktop web experience.

### Users

* Target: all learners, from casual to expert.
* Mode: solo only for now.
* Platform: web desktop.

### Content

* Decks grouped by difficulty: simple, mid, expert.
* Card types: front/back, cloze, multiple choice, explain.
* Cards are text-only for now. Ignore images.
* Deck-to-deck recommendations: semantic similarity between decks (no graph UI).
* Global ranking of decks: based on cards reviewed and hours studied.

### Card generation

* AI-powered card generation via MCP (Model Context Protocol) integration.
* MCP server provides data API (CRUD operations for decks/cards) - no AI logic.
* The LLM (Claude Desktop or other MCP clients) generates card content based on topic, difficulty, types, and language.
* MCP server validates and stores the generated cards in the database.
* Shared repository layer ensures consistency between REST API and MCP server.
* Authentication handled at database level (userId required for all operations).

### Learning

* Use FSRS scheduling with generic public parameters (no calibration).
* Global parameters (not per deck).
* Scoring: private per user per deck. Based on accuracy only (again=0, hard=0.6, good/easy=1). No speed factor. Show as Low/Medium/High.

### Ranking

* Public deck ranking (d7, d30) based on mix:

  * cards reviewed (70%) + study hours (30%).
* Ranking is by deck usage only, not tied to private user scores.

### Auth

* Simple user system. Local accounts only (email or username/password).
* No teams, no orgs, no groups.

### Business

* Free and open source.
* On-prem install by default. Later: hosted SaaS for deck sharing.

### Non-goals for MVP

* No mobile apps.
* No moderation, versioning, or content review.
* No payments.
* No compliance or enterprise features.
* No RAG.
