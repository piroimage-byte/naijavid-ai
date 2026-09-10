"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";

import { auth } from "@/lib/firebase";

export default function HomePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUser(firebaseUser);
        setCheckingAuth(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function handleSignOut() {
    try {
      await signOut(auth);
      router.refresh();
    } catch (error) {
      console.error(
        "SIGN OUT ERROR:",
        error
      );
    }
  }

  function handleStartCreating() {
    if (user) {
      router.push("/generator");
    } else {
      router.push("/login");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* HEADER */}

      <header className="border-b border-white/10 bg-black/90 px-4 py-5 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={() =>
              router.push("/")
            }
            className="text-2xl font-extrabold tracking-tight"
          >
            NaijaVid AI
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {!checkingAuth &&
              !user && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/login"
                    )
                  }
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
                >
                  Sign In
                </button>
              )}

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/pricing"
                )
              }
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
            >
              Pricing
            </button>

            {!checkingAuth &&
              user && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/generator"
                      )
                    }
                    className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
                  >
                    Generator
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        "/history"
                      )
                    }
                    className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
                  >
                    History
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleSignOut
                    }
                    className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/10"
                  >
                    Sign Out
                  </button>
                </>
              )}

            <button
              type="button"
              onClick={
                handleStartCreating
              }
              className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black hover:bg-gray-200"
            >
              Start Creating
            </button>
          </div>
        </div>
      </header>

      {/* SIGNED-IN STATUS */}

      {!checkingAuth &&
        user && (
          <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
              <p className="text-sm text-white/70">
                Welcome back,{" "}
                <span className="font-semibold text-white">
                  {user.displayName ||
                    user.email ||
                    "NaijaVid AI User"}
                </span>
              </p>
            </div>
          </section>
        )}

      {/* HERO */}

      <section className="mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300">
            Built for Nigerian creators, churches, businesses and storytellers
          </div>

          <h1 className="text-4xl font-black leading-tight sm:text-6xl">
            Create Nigerian-Focused
            AI Videos in Minutes
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/70 sm:text-xl">
            Turn your text and images
            into ready-to-share videos
            with narration, captions,
            camera motion, music,
            watermark controls and
            social-media formats.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={
                handleStartCreating
              }
              className="w-full rounded-xl bg-emerald-500 px-7 py-4 text-lg font-extrabold text-black hover:bg-emerald-400 sm:w-auto"
            >
              {user
                ? "Open Generator"
                : "Create Your First Video"}
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/pricing"
                )
              }
              className="w-full rounded-xl border border-white/20 px-7 py-4 text-lg font-bold hover:bg-white/10 sm:w-auto"
            >
              View Plans
            </button>
          </div>

          <p className="mt-4 text-sm text-white/40">
            Start free. Upgrade only
            when you need more.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}

      <section className="border-y border-white/10 bg-white/[0.02] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold">
              Create a Video in 3
              Simple Steps
            </h2>

            <p className="mt-3 text-white/60">
              No professional editing
              experience required.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 font-black text-black">
                1
              </div>

              <h3 className="text-xl font-bold">
                Add Your Content
              </h3>

              <p className="mt-3 leading-7 text-white/60">
                Enter a text prompt,
                upload one image, or
                combine several images
                into scenes.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 font-black text-black">
                2
              </div>

              <h3 className="text-xl font-bold">
                Choose Your Style
              </h3>

              <p className="mt-3 leading-7 text-white/60">
                Select aspect ratio,
                camera motion, captions,
                watermark, background
                music and duration.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 font-black text-black">
                3
              </div>

              <h3 className="text-xl font-bold">
                Generate & Share
              </h3>

              <p className="mt-3 leading-7 text-white/60">
                Generate the video,
                preview it, download it
                and share it on your
                preferred platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES */}

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold">
            Made for Real Nigerian
            Content
          </h2>

          <p className="mt-3 text-white/60">
            Use NaijaVid AI across
            ministry, business,
            education and social media.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title:
                "Church & Ministry",
              text:
                "Create event promos, sermon highlights, Bible messages and church announcements.",
            },
            {
              title:
                "Business Advertising",
              text:
                "Turn product photos and promotional messages into short marketing videos.",
            },
            {
              title:
                "Social Media",
              text:
                "Create portrait, square and landscape videos for TikTok, Instagram, Facebook and WhatsApp.",
            },
            {
              title:
                "Storytelling",
              text:
                "Build short visual stories from prompts, images and multiple scenes.",
            },
            {
              title:
                "Education",
              text:
                "Turn lessons, explanations and learning materials into simple video content.",
            },
            {
              title:
                "Events",
              text:
                "Create invitation videos, countdown content and promotional clips for programmes.",
            },
          ].map(
            (item) => (
              <div
                key={
                  item.title
                }
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
              >
                <h3 className="text-xl font-bold">
                  {item.title}
                </h3>

                <p className="mt-3 leading-7 text-white/60">
                  {item.text}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      {/* FEATURES */}

      <section className="border-y border-white/10 bg-white/[0.02] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-extrabold">
              Everything You Need to
              Create
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <h3 className="text-xl font-semibold">
                Text to Video
              </h3>

              <p className="mt-3 leading-7 text-white/60">
                Convert prompts and
                written messages into
                narrated short videos.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <h3 className="text-xl font-semibold">
                Image to Video
              </h3>

              <p className="mt-3 leading-7 text-white/60">
                Animate uploaded images
                with cinematic motion,
                captions and narration.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <h3 className="text-xl font-semibold">
                Multiple Scenes
              </h3>

              <p className="mt-3 leading-7 text-white/60">
                Combine several images
                into one video with
                scene timing and
                transitions.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <h3 className="text-xl font-semibold">
                Social Formats
              </h3>

              <p className="mt-3 leading-7 text-white/60">
                Generate landscape,
                portrait and square
                video layouts.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <h3 className="text-xl font-semibold">
                Captions & Watermarks
              </h3>

              <p className="mt-3 leading-7 text-white/60">
                Control caption style,
                caption position,
                branding and watermark
                opacity.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black p-6">
              <h3 className="text-xl font-semibold">
                Nigerian Language
                Focus
              </h3>

              <p className="mt-3 leading-7 text-white/60">
                Built with Nigerian
                audiences in mind, with
                expanded native-language
                voice support continuing
                to roll out.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FREE VS PRO */}

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold">
            Start Free, Upgrade When
            Ready
          </h2>
        </div>

        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
            <div className="text-sm font-bold uppercase tracking-wider text-white/50">
              Free
            </div>

            <h3 className="mt-3 text-3xl font-extrabold">
              Test NaijaVid
            </h3>

            <p className="mt-3 text-white/60">
              Create up to 3 videos per
              day and experience the
              platform before upgrading.
            </p>

            <button
              type="button"
              onClick={
                handleStartCreating
              }
              className="mt-7 w-full rounded-xl border border-white/20 px-5 py-3 font-bold hover:bg-white/10"
            >
              Start Free
            </button>
          </div>

          <div className="rounded-3xl border border-purple-500/40 bg-purple-500/10 p-7">
            <div className="text-sm font-bold uppercase tracking-wider text-purple-300">
              Founding Pro
            </div>

            <h3 className="mt-3 text-3xl font-extrabold">
              Create More
            </h3>

            <p className="mt-3 text-white/70">
              Unlock Pro generation
              features and higher usage
              during the introductory
              launch period, subject to
              fair use.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/pricing"
                )
              }
              className="mt-7 w-full rounded-xl bg-purple-600 px-5 py-3 font-bold hover:bg-purple-500"
            >
              View Founding Pro
            </button>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}

      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-3xl border border-emerald-500/20 bg-emerald-500/10 px-6 py-12 text-center sm:px-10">
          <h2 className="text-3xl font-black sm:text-4xl">
            Your Next Video Can Start
            With One Idea
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-white/70">
            Enter your message, choose
            your video style and let
            NaijaVid turn it into
            something you can share.
          </p>

          <button
            type="button"
            onClick={
              handleStartCreating
            }
            className="mt-7 rounded-xl bg-white px-7 py-4 text-lg font-extrabold text-black hover:bg-gray-200"
          >
            {user
              ? "Create Another Video"
              : "Create Your First Video"}
          </button>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-white/40 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={() =>
                router.push(
                  "/pricing"
                )
              }
              className="hover:text-white"
            >
              Pricing
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/privacy"
                )
              }
              className="hover:text-white"
            >
              Privacy Policy
            </button>

            <button
              type="button"
              onClick={() =>
                router.push(
                  "/terms"
                )
              }
              className="hover:text-white"
            >
              Terms of Service
            </button>
          </div>

          <p>
            ©{" "}
            {new Date().getFullYear()}{" "}
            NaijaVid AI. All rights
            reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}