import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <p className="mt-2 text-white/70">
          Create short AI videos for Nigerian audiences.
        </p>

        <div className="mt-8">
          <Link
            href="/dashboard/create"
            className="inline-block rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black"
          >
            Create New Video
          </Link>
        </div>
      </div>
    </main>
  );
}