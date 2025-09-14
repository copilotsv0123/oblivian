# 🧠 Oblivian - AI-Powered Spaced Repetition Learning

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-green?style=flat-square&logo=postgresql)
![MCP](https://img.shields.io/badge/MCP-Compatible-purple?style=flat-square)
![Claude Desktop](https://img.shields.io/badge/Claude_Desktop-Ready-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**Master any subject with AI-generated flashcards and scientifically-proven spaced repetition**

[Live Demo](https://oblivian.vercel.app) • [Documentation](#-documentation) • [Getting Started](#-getting-started) • [Claude Desktop Integration](#-claude-desktop-integration)

</div>

---

## ✨ Features

### 🎯 Core Learning Features
- **FSRS Algorithm** - State-of-the-art spaced repetition scheduling for optimal memory retention
- **Advanced Notes** - Add deeper insights and explanations to cards for comprehensive learning
- **Multiple Card Types** - Basic, Cloze deletion, Multiple choice, and Explanation cards
- **Smart Study Sessions** - Adaptive difficulty based on your performance with session timing
- **Progress Tracking** - Visual analytics, learning streaks, and detailed statistics
- **Deck Rankings** - Discover popular decks based on community usage

### 🤖 AI Integration
- **Claude Desktop MCP** - Generate high-quality flashcards using Claude's AI directly from your desktop
- **API Token Authentication** - Secure token-based access for AI features
- **Batch Card Generation** - Create up to 100 cards at once with AI assistance
- **Smart Recommendations** - AI-powered similar deck suggestions using vector embeddings (pgvector)
- **Natural Language Commands** - Create decks and cards with simple prompts

### 🎨 Modern Design
- **Beautiful UI** - Clean, minimalist interface inspired by Apple, Linear, and Stripe
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Custom Theming** - Tailwind CSS v3 with custom design system
- **Smooth Animations** - Polished interactions and transitions
- **Professional Components** - Reusable, consistent UI components

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL database (we recommend [Neon](https://neon.tech))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/sderosiaux/oblivian.git
cd oblivian
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
DATABASE_URL="postgresql://..."  # Your Neon PostgreSQL connection string
JWT_SECRET="your-secret-key"     # Generate a secure random string
```

4. **Initialize the database**
```bash
npm run db:push
```

5. **Start the development server**
```bash
npm run dev
```

Visit `http://localhost:3000` to see your app running! 🎉

### Deployment

The app is configured for automatic deployment on Vercel:

1. Push to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on every push to main

## 🤖 Claude Desktop Integration

Oblivian integrates with Claude Desktop using the Model Context Protocol (MCP) for AI-powered card generation.

### Setup MCP

1. **Create an API token** in the Settings page after logging in

2. **Configure Claude Desktop** by adding to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "oblivian": {
      "command": "/opt/homebrew/bin/npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://oblivian.vercel.app/api/mcp",
        "--header",
        "Authorization: Bearer ${OBLIVIAN_TOKEN}"
      ],
      "env": {
        "OBLIVIAN_TOKEN": "YOUR_API_TOKEN"
      }
    }
  }
}
```

Replace `YOUR_API_TOKEN` with the token from Settings.

3. **Restart Claude Desktop** and start generating cards with natural language:
   - "Create 20 flashcards about Python programming"
   - "Generate cards for learning Spanish vocabulary with advanced notes"
   - "Make a deck about World War II with explanations"

### MCP Tools Available
- `list_decks` - View all your decks
- `create_deck` - Create new decks
- `create_cards_batch` - Generate multiple cards at once with advanced notes
- `list_cards` - Browse cards in a deck
- `delete_card` - Remove cards
- `update_card` - Edit existing cards

## 🏗️ Architecture

```
oblivian/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API routes (including MCP SSE endpoint)
│   ├── login/             # Authentication page
│   └── (main)/            # Main application pages
├── components/            # Reusable React components
├── lib/                   # Core libraries
│   ├── auth/             # JWT & token authentication
│   ├── db/               # Database layer (Drizzle ORM)
│   ├── fsrs/             # Spaced repetition algorithm
│   ├── embeddings/       # Vector similarity features
│   └── repositories/     # Data access layer
└── public/               # Static assets
```

### Tech Stack

- **Frontend**: Next.js 15.5, React 19, TypeScript 5.9
- **Styling**: Tailwind CSS v3, Custom design system
- **Backend**: Next.js API Routes, Server-side rendering
- **Database**: PostgreSQL (Neon) with pgvector extension
- **ORM**: Drizzle ORM with type-safe queries
- **Authentication**: JWT tokens + API tokens for MCP
- **AI Integration**: MCP protocol for Claude Desktop (SSE with stdio bridge)
- **Algorithm**: FSRS (Free Spaced Repetition Scheduler)
- **Deployment**: Vercel with automatic CI/CD
- **Analytics**: Vercel Analytics

## 📚 Documentation

### Key Features

#### Advanced Notes
Cards can include advanced notes for deeper learning:
- Add comprehensive explanations
- Include related concepts and examples
- Collapsible view in deck management
- Displayed during study sessions for better understanding

#### Study Sessions
- Timed sessions with progress tracking
- Four difficulty ratings: Again, Hard, Good, Easy
- Skip option for problematic cards
- Session statistics and time tracking
- Visual progress indicators

#### Deck Rankings
- Discover popular decks based on community usage
- 7-day and 30-day ranking windows
- Metrics include cards reviewed, hours studied, and unique users
- Automatic ranking updates

### Creating Cards

#### Manual Creation
1. Navigate to a deck
2. Click "Add Card"
3. Choose card type and enter content
4. Add advanced notes for deeper insights
5. Save and start studying

#### AI Generation with Claude
1. Configure Claude Desktop with MCP
2. Ask Claude to create cards: "Create flashcards about [topic] with advanced notes"
3. Cards are automatically added to your selected deck
4. Review and edit as needed

### Study Workflow
1. Start a study session from any deck
2. Review cards and expand advanced notes if needed
3. Rate your recall (Again/Hard/Good/Easy)
4. Cards are rescheduled based on FSRS algorithm
5. Track your progress and maintain streaks

## 🎯 Roadmap

### Near Term
- [ ] Import/Export (Anki compatibility)
- [ ] Public deck marketplace
- [ ] Enhanced statistics dashboard
- [ ] Markdown support in cards

### Future
- [ ] Mobile app (React Native)
- [ ] Collaborative decks and sharing
- [ ] Offline mode with sync
- [ ] Voice input for cards
- [ ] Image and diagram support
- [ ] LaTeX formula rendering
- [ ] Multiple language support
- [ ] Gamification features

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs.js) - Advanced spaced repetition scheduling
- [Claude Desktop](https://claude.ai) - AI-powered card generation
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP integration
- [Neon](https://neon.tech) - Serverless PostgreSQL
- [Next.js](https://nextjs.org) - The React framework
- [Vercel](https://vercel.com) - Deployment and hosting
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [Drizzle ORM](https://orm.drizzle.team) - TypeScript ORM

## 💖 Support

If you find Oblivian helpful, please consider:
- ⭐ Starring this repository
- 🐛 Reporting bugs and suggesting features
- 📢 Sharing with friends and colleagues
- 🤝 Contributing to the codebase

---

<div align="center">
Built with ❤️ for learners everywhere

[Live Demo](https://oblivian.vercel.app) • [Report Bug](https://github.com/sderosiaux/oblivian/issues) • [Request Feature](https://github.com/sderosiaux/oblivian/issues)
</div>