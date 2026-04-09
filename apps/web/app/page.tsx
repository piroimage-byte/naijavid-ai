"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      {/* Header */}
      <header className="flex items-center justify-between max-w-6xl mx-auto mb-12">
        <h1 className="text-2xl font-bold">NaijaVid AI</h1>

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/pricing")}
            className="px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10"
          >
            Pricing
          </button>

          <button
            onClick={() => router.push("/generator")}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200"
          >
            Start Creating
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center mb-16">
        <h2 className="text-5xl font-bold mb-6 leading-tight">
          Create AI Videos in Seconds
        </h2>

        <p className="text-white/70 text-lg mb-8">
          Turn text or images into short videos instantly. Built for creators,
          marketers, and businesses.
        </p>

        <button
          onClick={() => router.push("/generator")}
          className="px-6 py-3 bg-white text-black rounded-xl font-semibold text-lg hover:bg-gray-200"
        >
          Generate Video
        </button>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 mb-20">
        <div className="p-6 bg-white/5 rounded-xl">
          <h3 className="text-xl font-semibold mb-2">Text to Video</h3>
          <p className="text-white/60">
            Convert simple prompts into engaging videos instantly.
          </p>
        </div>

        <div className="p-6 bg-white/5 rounded-xl">
          <h3 className="text-xl font-semibold mb-2">Image to Video</h3>
          <p className="text-white/60">
            Upload images and transform them into animated clips.
          </p>
        </div>

        <div className="p-6 bg-white/5 rounded-xl">
          <h3 className="text-xl font-semibold mb-2">Local Languages</h3>
          <p className="text-white/60">
            Generate videos in Nigerian languages for wider reach.
          </p>
        </div>
      </section>

      {/* Pricing CTA */}
      <section className="max-w-4xl mx-auto text-center mb-20">
        <h3 className="text-3xl font-bold mb-4">
          Unlock Pro Features
        </h3>

        <p className="text-white/70 mb-6">
          Get longer videos, faster generation, and premium features.
        </p>

        <button
          onClick={() => router.push("/pricing")}
          className="px-6 py-3 bg-purple-600 rounded-xl font-semibold hover:bg-purple-500"
        >
          Upgrade to Pro
        </button>
      </section>

      {/* Footer */}
      <footer className="text-center text-white/40 text-sm">
        © {new Date().getFullYear()} NaijaVid AI. All rights reserved.
      </footer>
    </main>
  );
}