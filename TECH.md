## Tech choices

* Frontend: Next.js + TypeScript + Tailwind.
* Backend: Node.js. Stateless where possible.
* Data: SQLite default (simple, portable). Adapter for Postgres later.
* Embeddings: OpenAI/Anthropic API integration with pgvector storage (local deterministic fallback available).
* Auth: JWT with password or magic link.

Use MCP context7 to ensure you work with the latest technologies and best practices.

---

## Data model

* **users**: id, email, password\_hash, created\_at
* **providers**: id, user\_id, name, api\_key\_encrypted, created\_at
* **decks**: id, owner\_user\_id, title, description, level (simple/mid/expert), language, is\_public, created\_at, updated\_at
* **cards**: id, deck\_id, type, front, back, choices json, explanation, created\_at, updated\_at
* **reviews**: id, user\_id, card\_id, rating (again/hard/good/easy), scheduled\_at, reviewed\_at, interval\_days, stability, difficulty, state json
* **study\_sessions**: id, user\_id, deck\_id, started\_at, ended\_at, seconds\_active
* **deck\_scores**: id, user\_id, deck\_id, window (d7/d30/d90), accuracy\_pct, stability\_avg, lapses, updated\_at
* **deck\_usage**: id, deck\_id, window (d7/d30), cards\_reviewed, study\_hours, updated\_at
* **deck\_embeddings**: id, deck\_id, vector, dim, model, updated\_at
