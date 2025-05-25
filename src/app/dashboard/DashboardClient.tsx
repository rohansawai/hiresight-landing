"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';
import type { InterviewSession } from "../../generated/prisma/index";
import type { DiarizationWord } from "../../lib/transcription";
import { signOut } from "next-auth/react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type DashboardInterviewSession = InterviewSession & {
  transcript?: string | null;
  diarization?: unknown;
  roles?: Record<string, string> | null;
  report?: string | null;
  verdict?: string | null;
};

export default function DashboardClient() {
  const [sessions, setSessions] = useState<DashboardInterviewSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [transcribingId, setTranscribingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Add state for collapsible sections
  const [openTranscript, setOpenTranscript] = useState<{[id: string]: boolean}>({});
  const [openSpeakers, setOpenSpeakers] = useState<{[id: string]: boolean}>({});

  // Fetch sessions
  useEffect(() => {
    fetch("/api/interviews")
      .then((res) => res.json())
      .then((data) => setSessions(data.sessions || []));
      console.log("SESSIONS:", sessions);
  }, [success, deletingId, transcribingId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    setProgress(0);

      // 👇 ADD THIS BUCKET LIST CHECK
  const { data: bucketList, error: bucketError } = await supabase.storage.listBuckets();
  console.log("Available Buckets:", bucketList);
  console.log("Bucket List Error:", bucketError);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Please select a file.");
      setLoading(false);
      return;
    }
    const filename = `${Date.now()}-${file.name}`;
    // Direct upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filename, file, {
        upsert: true,
      });
    if (uploadError) {
      setError("Upload failed: " + uploadError.message);
      setLoading(false);
      return;
    }
    // Get public URL
    const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
    const publicUrl = publicUrlData.publicUrl;
    // Register the session in the backend
    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl: publicUrl }),
    });
    const result = await res.json();
    setLoading(false);
    setProgress(0);
    if (res.ok && result.success) {
      setSuccess("File uploaded successfully!");
      fileInputRef.current!.value = "";
    } else {
      setError(result.error || "Upload failed.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    setDeletingId(id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/interviews/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("File deleted successfully!");
        setSessions((prev) => prev.filter((s) => s.id !== id));
      } else {
        setError(data.error || "Delete failed.");
      }
    } catch (err) {
      setError("Delete failed.");
    }
    setDeletingId(null);
  };

  const handleTranscribe = async (id: string) => {
    setTranscribingId(id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/interviews/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Transcription complete!");
      } else {
        setError(data.error || "Transcription failed.");
      }
    } catch (err) {
      setError("Transcription failed.");
    }
    setTranscribingId(null);
  };

  const handleAnalyze = async (id: string) => {
    setAnalyzingId(id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/interviews/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("Analysis complete!");
        setSessions((prev) => prev.map((s) => (s.id === id ? data.session : s)));
      } else {
        setError(data.error || "Analysis failed.");
      }
    } catch (err) {
      setError("Analysis failed.");
    }
    setAnalyzingId(null);
  };

  function groupDiarization(words: DiarizationWord[]) {
    if (!Array.isArray(words)) return [];
    const result = [];
    let currentSpeaker = null;
    let currentWords: DiarizationWord[] = [];
    for (const word of words) {
      if (word.speaker !== currentSpeaker) {
        if (currentWords.length > 0) {
          result.push({ speaker: currentSpeaker, words: currentWords });
        }
        currentSpeaker = word.speaker;
        currentWords = [word];
      } else {
        currentWords.push(word);
      }
    }
    if (currentWords.length > 0) {
      result.push({ speaker: currentSpeaker, words: currentWords });
    }
    return result;
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      {/* Dashboard Header with Logout */}
      <div className="w-full flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">Your Dashboard</h1>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-red-600 font-semibold shadow-lg hover:from-pink-600 hover:to-red-700 transition-colors text-white text-base"
        >
          Logout
        </button>
      </div>
      <form onSubmit={handleUpload} className="flex flex-col gap-4 mb-8 bg-gray-900/60 p-6 rounded-xl shadow">
        <label className="font-semibold">Upload Interview Recording</label>
        <input
          type="file"
          accept="audio/*,video/*"
          ref={fileInputRef}
          className="bg-gray-800 text-white rounded p-2"
          required
        />
        {loading && (
          <div className="w-full bg-gray-700 rounded h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 transition-all duration-200"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 rounded bg-gradient-to-r from-blue-500 to-purple-600 font-semibold shadow-lg hover:from-blue-600 hover:to-purple-700 transition-colors text-white"
        >
          {loading ? `Uploading... (${progress}%)` : "Upload"}
        </button>
        {error && <div className="text-red-400">{error}</div>}
        {success && <div className="text-green-400">{success}</div>}
      </form>
      <div>
        <h2 className="text-xl font-bold mb-4">Your Interview Sessions</h2>
        <ul className="space-y-4">
          {sessions.map((s) => (
            <li key={s.id} className="bg-gray-800 rounded p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="flex-1" style={{ overflowWrap: 'anywhere' }}>
                <div className="font-semibold">{s.fileUrl.split("/").pop()}</div>
                <div className="text-gray-400 text-sm">Uploaded: {new Date(s.createdAt).toLocaleString()}</div>
                <div className="text-gray-400 text-sm">Status: {s.status}</div>
                {s.transcript && (
                  <div className="mt-2">
                    {/* Transcript Card */}
                    <div className="bg-gray-900 rounded p-3 text-left mb-2">
                      <button
                        className="w-full flex justify-between items-center font-semibold mb-1 text-left text-white bg-blue-600 px-3 py-2 rounded hover:bg-blue-700 transition-colors shadow"
                        onClick={() => setOpenTranscript((prev) => ({...prev, [s.id]: !prev[s.id]}))}
                        type="button"
                      >
                        <span className="flex items-center gap-2">
                          {/* Document Icon (SVG) */}
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 11h10M7 15h6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          Transcript
                        </span>
                        <span className="ml-2">{openTranscript[s.id] !== false ? '▲' : '▼'}</span>
                      </button>
                      {openTranscript[s.id] !== false && (
                        <div className="whitespace-pre-line text-gray-200 text-sm mt-2">{s.transcript}</div>
                      )}
                    </div>
                    {/* Speakers Card */}
                    {(() => {
                      let diarizationArr: DiarizationWord[] | null = null;
                      if (s.diarization) {
                        if (typeof s.diarization === 'string') {
                          try {
                            diarizationArr = JSON.parse(s.diarization);
                          } catch {
                            diarizationArr = null;
                          }
                        } else if (Array.isArray(s.diarization)) {
                          diarizationArr = s.diarization;
                        }
                      }
                      return diarizationArr && Array.isArray(diarizationArr) ? (
                        <div className="bg-gray-900 rounded p-3 text-left">
                          <button
                            className="w-full flex justify-between items-center font-semibold mb-1 text-left text-white bg-green-600 px-3 py-2 rounded hover:bg-green-700 transition-colors shadow"
                            onClick={() => setOpenSpeakers((prev) => ({...prev, [s.id]: !prev[s.id]}))}
                            type="button"
                          >
                            <span className="flex items-center gap-2">
                              {/* Users/Speaker Icon (SVG) */}
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87M16 3.13a4 4 0 010 7.75M8 3.13a4 4 0 000 7.75" /></svg>
                              Speakers
                            </span>
                            <span className="ml-2">{openSpeakers[s.id] !== false ? '▲' : '▼'}</span>
                          </button>
                          {openSpeakers[s.id] !== false && (
                            <ul className="text-xs text-gray-400 mt-2">
                              {groupDiarization(diarizationArr).map((seg, idx) => (
                                <li key={idx}>
                                  <span className="font-bold">
                                    {s.roles && s.roles[`Speaker ${seg.speaker}`] ? s.roles[`Speaker ${seg.speaker}`] : `Speaker ${seg.speaker}`}:
                                  </span> {seg.words.map(w => w.punctuated_word || w.word).join(' ')}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : null;
                    })()}
                    {s.report && (
                      <div className="mt-2 bg-gray-900 rounded p-3 text-left border border-purple-700">
                        <div className="font-semibold mb-1 text-purple-300">AI-Generated Report:</div>
                        <div className="whitespace-pre-line text-gray-200 text-sm mb-2">{s.report}</div>
                        {s.verdict && (
                          <div className="font-bold text-green-400 text-base mt-2">Verdict: {s.verdict}</div>
                        )}
                        <button
                          onClick={() => {
                            const text = `Report:\n${s.report}\n\nVerdict: ${s.verdict || ''}`;
                            const blob = new Blob([text], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${s.fileUrl.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'report'}.txt`;
                            document.body.appendChild(a);
                            a.click();
                            setTimeout(() => {
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }, 100);
                          }}
                          className="mt-3 px-4 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow"
                        >
                          Download Report
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 min-w-[120px] self-start">
                <a
                  href={s.fileUrl}
                  download={s.fileUrl.split('/').pop() || 'download'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-1 rounded bg-indigo-600 hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-400 text-white text-sm font-semibold flex items-center gap-2 shadow transition-colors"
                  title="Download file"
                >
                  {/* Download Icon (SVG) */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 4v12" /></svg>
                  Download
                </a>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="px-4 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {deletingId === s.id ? "Deleting..." : "Delete"}
                </button>
                {!s.transcript && (
                  <button
                    onClick={() => handleTranscribe(s.id)}
                    disabled={transcribingId === s.id}
                    className="px-4 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {transcribingId === s.id ? "Transcribing..." : "Transcribe"}
                  </button>
                )}
                {!s.report && (
                  <button
                    onClick={() => handleAnalyze(s.id)}
                    disabled={analyzingId === s.id}
                    className="px-4 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {analyzingId === s.id ? "Analyzing..." : "Analyze / Generate Report"}
                  </button>
                )}
              </div>
            </li>
          ))}
          {sessions.length === 0 && <li className="text-gray-400">No sessions yet.</li>}
        </ul>
      </div>
    </div>
  );
} 