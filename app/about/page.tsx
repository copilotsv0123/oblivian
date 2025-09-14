export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-serif text-primary mb-4">About Oblivian</h1>
          <p className="text-xl text-gray-600 mb-8">
            A modern spaced repetition system that helps you learn faster and remember longer
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="card">
            <h2 className="text-2xl font-semibold text-primary mb-4">Smart Learning</h2>
            <p className="text-gray-600">
              Our advanced spaced repetition algorithm adapts to your learning pace,
              showing you cards exactly when you need to review them for optimal retention.
            </p>
          </div>

          <div className="card">
            <h2 className="text-2xl font-semibold text-primary mb-4">AI-Powered</h2>
            <p className="text-gray-600">
              Generate flashcards automatically with Claude Desktop integration.
              Just describe what you want to learn, and let AI create comprehensive decks for you.
            </p>
          </div>

          <div className="card">
            <h2 className="text-2xl font-semibold text-primary mb-4">Multiple Card Types</h2>
            <p className="text-gray-600">
              Support for basic Q&A cards, cloze deletions, multiple choice,
              and cards with advanced notes for deeper learning.
            </p>
          </div>

          <div className="card">
            <h2 className="text-2xl font-semibold text-primary mb-4">Track Progress</h2>
            <p className="text-gray-600">
              Monitor your learning with detailed statistics, rankings,
              and insights into your study patterns and progress.
            </p>
          </div>
        </div>

        <div className="text-center">
          <div className="flex gap-4 justify-center">
            <a href="/register" className="btn-primary">Get Started</a>
            <a href="/login" className="btn-outline">Login</a>
          </div>
        </div>
      </div>
    </div>
  )
}