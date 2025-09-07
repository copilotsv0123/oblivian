# 🧠 Oblivian - AI-Powered Spaced Repetition Learning

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)
![MCP](https://img.shields.io/badge/MCP-Compatible-purple?style=flat-square)
![Claude Desktop](https://img.shields.io/badge/Claude_Desktop-Ready-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**Master any subject with AI-generated flashcards and scientifically-proven spaced repetition**

[Demo](https://oblivian.vercel.app) • [Documentation](#-documentation) • [Getting Started](#-getting-started) • [Claude Desktop Integration](#-claude-desktop-integration)

</div>

---

## ✨ Features

### 🎯 Core Learning Features
- **FSRS Algorithm** - State-of-the-art spaced repetition scheduling for optimal memory retention
- **Multiple Card Types** - Basic, Cloze deletion, Multiple choice, and Explanation cards
- **Smart Study Sessions** - Adaptive difficulty based on your performance
- **Progress Tracking** - Visual analytics and learning streaks
- **Deck Management** - Organize your learning with customizable decks

### 🤖 AI Integration
- **Claude Desktop MCP** - Generate high-quality flashcards using Claude's AI directly from your desktop
- **API-Based Architecture** - Secure token authentication for AI features
- **Batch Card Generation** - Create up to 100 cards at once with AI assistance
- **Smart Recommendations** - AI-powered similar deck suggestions using vector embeddings

### 🎨 Modern Design
- **Beautiful UI** - Clean, minimalist interface inspired by Linear and Stripe
- **Dark Mode Ready** - Easy on the eyes during long study sessions
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Real-time Updates** - Instant feedback and smooth animations

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- SQLite (included)

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
# Edit .env.local with your configuration
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
        "http://localhost:3000/api/mcp",
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

**Note:** Using the full path `/opt/homebrew/bin/npx` ensures Claude Desktop uses the correct Node.js version instead of an older nvm version.

3. **Restart Claude Desktop** and start generating cards with natural language:
   - "Create 20 flashcards about Python programming"
   - "Generate cards for learning Spanish vocabulary"
   - "Make a deck about World War II with explanations"

### MCP Tools Available
- `list_decks` - View all your decks
- `create_deck` - Create new decks
- `create_cards_batch` - Generate multiple cards at once
- `list_cards` - Browse cards in a deck
- `delete_card` - Remove cards

## 🏗️ Architecture

```
oblivian/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API routes (including MCP SSE endpoint)
│   ├── (auth)/            # Authentication pages
│   └── (app)/             # Main application
├── components/            # React components
├── lib/                   # Core libraries
│   ├── auth/             # JWT & token authentication
│   ├── db/               # Database layer (Drizzle ORM)
│   ├── fsrs/             # Spaced repetition algorithm
│   └── embeddings/       # Vector similarity features
└── data/                 # SQLite database
```

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: SQLite with vector embeddings
- **Authentication**: JWT + API tokens
- **AI Integration**: MCP protocol for Claude Desktop (SSE with stdio bridge)
- **Algorithm**: FSRS (Free Spaced Repetition Scheduler)

## 📚 Documentation

### Creating Cards Manually
1. Navigate to a deck
2. Click "Add Card Manually"
3. Choose card type and enter content
4. Save and start studying!

### Using AI Generation
1. Configure Claude Desktop with MCP
2. Ask Claude to create cards: "Create flashcards about [topic]"
3. Cards are automatically added to your deck

### Study Workflow
1. Start a study session
2. Review cards and rate your recall (Again/Hard/Good/Easy)
3. Cards are rescheduled based on your performance
4. Build streaks and track progress

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Collaborative decks
- [ ] Import/Export (Anki compatibility)
- [ ] Advanced statistics dashboard
- [ ] Multiple language support
- [ ] Offline mode with sync
- [ ] Public deck marketplace
- [ ] Voice input for cards
- [ ] Image cards support
- [ ] LaTeX formula rendering

## 🤝 Contributing

We love contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs.js) - Advanced spaced repetition scheduling
- [Claude Desktop](https://claude.ai) - AI-powered card generation
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP integration
- [Next.js](https://nextjs.org) - The React framework
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework
- [Drizzle ORM](https://orm.drizzle.team) - TypeScript ORM

## 💖 Support

If you find Oblivian helpful, please consider:
- ⭐ Starring this repository
- 🐛 Reporting bugs and suggesting features
- 📢 Sharing with friends and on social media
- ☕ [Buying me a coffee](https://buymeacoffee.com/yourusername)

---

<div align="center">
Built with ❤️ by the Oblivian team

[Website](https://oblivian.app) • [Twitter](https://twitter.com/oblivianapp) • [Discord](https://discord.gg/oblivian)
</div>