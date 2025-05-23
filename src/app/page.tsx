import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-gray-950 text-white flex flex-col items-center justify-between p-0">
      {/* Header with logo placeholder */}
      <header className="w-full flex justify-center py-8">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold">HS</span>
          </div>
          <span className="text-2xl font-semibold tracking-wide">HireSight</span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-8">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI-Powered Interview Assistant
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
            Let HireSight join your Zoom interviews, ask smart questions, and deliver instant hiring reports with insights, red flags, and recommendations—before the call ends.
          </p>
        </div>
        <form className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-md mx-auto mt-6">
          <input
            type="email"
            placeholder="Enter your email for early access"
            className="px-4 py-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 font-semibold shadow-lg hover:from-blue-600 hover:to-purple-700 transition-colors w-full sm:w-auto"
          >
            Get Early Access
          </button>
        </form>
      </main>

      {/* Features Section */}
      <section className="w-full max-w-4xl mx-auto py-12 px-4 grid grid-cols-1 sm:grid-cols-3 gap-8">
        <div className="bg-gray-900/60 rounded-xl p-6 flex flex-col items-center shadow-md">
          <span className="text-3xl mb-2">🤖</span>
          <h3 className="font-bold text-lg mb-1">AI Interviewer</h3>
          <p className="text-gray-400 text-sm">Joins Zoom calls, asks relevant questions, and adapts in real time.</p>
        </div>
        <div className="bg-gray-900/60 rounded-xl p-6 flex flex-col items-center shadow-md">
          <span className="text-3xl mb-2">⚡</span>
          <h3 className="font-bold text-lg mb-1">Instant Reports</h3>
          <p className="text-gray-400 text-sm">Generates actionable hiring reports before the interview ends.</p>
        </div>
        <div className="bg-gray-900/60 rounded-xl p-6 flex flex-col items-center shadow-md">
          <span className="text-3xl mb-2">🔗</span>
          <h3 className="font-bold text-lg mb-1">Seamless Zoom Integration</h3>
          <p className="text-gray-400 text-sm">Easy setup with your existing Zoom workflow.</p>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="w-full max-w-3xl mx-auto py-8 px-4">
        <h2 className="text-2xl font-bold mb-6 text-center">How it Works</h2>
        <ol className="list-decimal list-inside space-y-4 text-gray-300">
          <li><span className="font-semibold text-white">Connect:</span> Link your Zoom account and schedule interviews as usual.</li>
          <li><span className="font-semibold text-white">AI Joins:</span> HireSight joins the call, asks questions, and listens in real time.</li>
          <li><span className="font-semibold text-white">Get Report:</span> Receive a detailed hiring report before the call ends.</li>
        </ol>
      </section>

      {/* Footer */}
      <footer className="w-full text-center py-6 text-gray-500 text-sm border-t border-gray-800">
        &copy; {new Date().getFullYear()} HireSight. All rights reserved.
      </footer>
    </div>
  );
}
