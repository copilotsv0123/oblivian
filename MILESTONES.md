**Milestone 1: Foundation**

* Set up Next.js app with auth, SQLite schema, deck CRUD, and card types.
* FSRS engine in place. Study queue returns due and new cards.
* Acceptance: create deck, add cards manually, study 10 cards, answers persist, next due time updates.

**Milestone 2: CardMaker MCP and one-click gen**

* Build MCP server with gen\_cards tool and other necessary tools for an MCP server to list cards etc.
* Provider adapter with user token config.
* UI to generate N cards for a topic, preview list, bulk import.
* Acceptance: generate 50 cards across all types. Retry once on schema error. Import works.

**Milestone 3: Study loop and scoring**

* Daily study with timer and skip option.
* Reviews recorded. Deck score computed (private, d30 accuracy).
* Show gentle warning if daily load too high.
* Acceptance: complete a session, score updates, warning shows correctly.

**Milestone 4: Recommendations and rankings**

* Deck embeddings built from title + sample cards. Cosine similarity search.
* Show top 5 related decks.
* Public deck usage stats (d7, d30) computed and ranking feed displayed.
* Acceptance: related decks appear, rankings update after sessions.

**Milestone 5: Packaging and docs**

* Docker Compose with web + SQLite.
* Seed script with sample decks and a demo user.
* Minimal README with setup and provider config.
* Acceptance: clean install to first study in <10 minutes.
