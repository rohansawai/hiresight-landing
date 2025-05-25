"use client";
import Image from "next/image";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleEarlyAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitted(false);
    const res = await fetch("/api/early-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (data.success) {
      setSubmitted(true);
      setEmail("");
    } else {
      setError(data.error || "Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-950 to-gray-900 text-white">
      {/* Darker Header */}
      <header className="w-full bg-gray-950/95 border-b border-gray-800 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center py-6 px-8">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold">HS</span>
            </div>
            <span className="text-2xl font-semibold tracking-wide">HireSight</span>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn && (
              <Link
                href="/dashboard"
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 font-semibold shadow-lg hover:from-blue-600 hover:to-purple-700 transition-colors text-white text-base"
              >
                Dashboard
              </Link>
            )}
            {status === "unauthenticated" ? (
              <a
                href="/api/auth/signin"
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 font-semibold shadow-lg hover:from-blue-600 hover:to-purple-700 transition-colors text-white text-base"
              >
                Login / Register
              </a>
            ) : null}
            {status === "authenticated" ? (
              <button
                onClick={() => signOut()}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-red-600 font-semibold shadow-lg hover:from-pink-600 hover:to-red-700 transition-colors text-white text-base"
              >
                Logout
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Full-width marketing content */}
      <main className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-5xl bg-gray-900/80 rounded-2xl shadow-xl p-8 flex flex-col gap-8 border border-gray-800 mx-auto my-8 flex-1 justify-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-center mb-2 flex items-center justify-center gap-2">
            AI Powered Hiring Assistant for Early Stage Founders
          </h1>

          {/* Early Access Form */}
          {status === "unauthenticated" && (
            <form onSubmit={handleEarlyAccess} className="flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-md mx-auto mt-2 mb-4">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email for early access"
                className="px-4 py-3 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 font-semibold shadow-lg hover:from-blue-600 hover:to-purple-700 transition-colors w-full sm:w-auto"
              >
                Get Early Access
              </button>
              {submitted && !error && <div className="text-green-400 mt-2">Thank you! We'll be in touch soon.</div>}
              {error && error === 'Already registered' && (
                <div className="text-yellow-400 mt-2">This email is already registered for early access.</div>
              )}
              {error && error !== 'Already registered' && (
                <div className="text-red-400 mt-2">{error}</div>
              )}
            </form>
          )}

          {/* Marketing copy */}
          <p className="text-lg text-center text-gray-300 max-w-3xl mx-auto">
            Let <span className="font-bold text-blue-400">HireSight</span> handle the interviews so you can focus on building. We built an AI co-pilot that manages the interviewing workload:
            <span className="font-bold text-blue-400"> analyzing conversations, suggesting follow-up questions during the call, and delivering a clear, actionable hiring report by the time you hang up.</span>
          </p>

          <div className="border-t border-gray-700 my-2" />

          {/* Features */}
          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
              <span role="img" aria-label="robot">🤖</span> AI Interviewer <span className="text-xs bg-yellow-700 text-yellow-200 px-2 py-0.5 rounded ml-2">Currently in Beta</span>
            </h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1 pl-2 text-left">
              <li> Upload recordings of your interviews.</li>
              <li> Our AI listens carefully, transcribing and assigning speaker roles automatically.</li>
              <li> Identifies key skills, strengths, and potential red flags.</li>
            </ul>
          </section>

          <div className="border-t border-gray-700 my-2" />

          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
              <span role="img" aria-label="zap">⚡</span> Instant Reports
            </h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1 pl-2 text-left">
              <li> Actionable hiring reports generated before you're back at your desk.</li>
              <li> Summaries of what candidates said and how they performed.</li>
              <li> Structured decision feedback to streamline your hiring process.</li>
            </ul>
          </section>

          <div className="border-t border-gray-700 my-2" />

          <section>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
              <span role="img" aria-label="chart">📈</span> Future: Real-Time Co-Interviewing
            </h2>
            <ul className="list-disc list-inside text-gray-300 space-y-1 pl-2 text-left">
              <li>🔗 Coming soon: direct Zoom integration.</li>
              <li>🟢 HireSight will join live calls as a co-pilot, suggest questions in real-time, and send you a report before the call ends!</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}