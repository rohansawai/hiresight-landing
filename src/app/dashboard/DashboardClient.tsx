"use client";
import { useState, useRef, useEffect } from "react";

export default function DashboardClient() {
  const [sessions, setSessions] = useState<any[]>([]);
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
  }, [success, deletingId, transcribingId]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    setProgress(0);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Please select a file.");
      setLoading(false);
      return;
    }
    const formData = new FormData();
    formData.append("file", file);

    // Use XMLHttpRequest for progress
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/interviews/upload", true);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      setLoading(false);
      setProgress(0);
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        if (data.success) {
          setSuccess("File uploaded successfully!");
          fileInputRef.current!.value = "";
        } else {
          setError(data.error || "Upload failed.");
        }
      } else {
        setError("Upload failed.");
      }
    };
    xhr.onerror = () => {
      setLoading(false);
      setProgress(0);
      setError("Upload failed.");
    };
    xhr.send(formData);
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

  function groupDiarization(words: any[]) {
    if (!Array.isArray(words)) return [];
    const result = [];
    let currentSpeaker = null;
    let currentWords = [];
    for (const w of words) {
      if (w.speaker !== currentSpeaker) {
        if (currentWords.length) {
          result.push({ speaker: currentSpeaker, text: currentWords.join(' ') });
        }
        currentSpeaker = w.speaker;
        currentWords = [w.punctuated_word || w.word];
      } else {
        currentWords.push(w.punctuated_word || w.word);
      }
    }
    if (currentWords.length) {
      result.push({ speaker: currentSpeaker, text: currentWords.join(' ') });
    }
    return result;
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
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
              <div className="flex-1">
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
                    {s.diarization && Array.isArray(s.diarization) && (
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
                            {groupDiarization(s.diarization).map((seg, idx) => (
                              <li key={idx}>
                                <span className="font-bold">
                                  {s.roles && s.roles[`Speaker ${seg.speaker}`] ? s.roles[`Speaker ${seg.speaker}`] : `Speaker ${seg.speaker}`}:
                                </span> {seg.text}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
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