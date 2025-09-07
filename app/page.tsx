export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-6xl font-serif text-primary mb-4">Oblivian</h1>
        <p className="text-xl text-gray-600 mb-8">Never forget what matters.</p>
        <div className="flex gap-4 justify-center">
          <a href="/login" className="btn-primary">Get Started</a>
          <a href="/about" className="btn-outline">Learn More</a>
        </div>
      </div>
    </div>
  )
}