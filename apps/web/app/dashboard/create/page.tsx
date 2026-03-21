"use client";

import { useState } from "react";

export default function CreateVideoPage() {
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("yoruba");
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!text.trim()) return alert("Enter script");

    setLoading(true);

    // TEMP FAKE RESPONSE (we will connect backend next)
    setTimeout(() => {
      setLoading(false);
      alert("Video generation started (backend coming next)");
    }, 1500);
  }

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold">Create AI Video</h1>

        <div className="mt-8 space-y-6">
          {/* Script */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Video Script
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your video script..."
              className="w-full rounded-xl bg-white/5 border border-white/10 p-4 text-white outline-none"
              rows={6}
            />
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm text-white/70 mb-2">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 p-3 text-white"
            >
              <option value="yoruba">Yoruba</option>
              <option value="igbo">Igbo</option>
              <option value="hausa">Hausa</option>
              <option value="pidgin">Pidgin</option>
              <option value="english">English</option>
            </select>
          </div>

          {/* Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 py-3 font-semibold text-black"
          >
            {loading ? "Generating..." : "Generate Video"}
          </button>
        </div>
      </div>
    </main>
  );
}