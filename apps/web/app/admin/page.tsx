"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  onAuthStateChanged,
  User,
} from "firebase/auth";

import {
  auth,
} from "@/lib/firebase";

type DashboardStats = {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  totalVideos: number;
  totalPayments: number;
};

type RecentVideo = {
  id: string;
  userId: string;
  prompt: string;
  mode: string;
  language: string;
  duration: number;
  status: string;
  plan: string;
  createdAt: string | null;
  expiresAt: string | null;
};

type RecentPayment = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  transactionId: string;
  createdAt: string | null;
};

type DashboardResponse = {
  success: boolean;

  error?: string;

  admin?: {
    email: string;
  };

  stats?: DashboardStats;

  recentVideos?: RecentVideo[];

  recentPayments?: RecentPayment[];
};

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Unknown";
  }

  return new Date(
    value
  ).toLocaleString();
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-[#111] p-5">
      <div className="text-sm font-medium text-neutral-400">
        {title}
      </div>

      <div className="mt-2 text-3xl font-extrabold text-white">
        {value}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [user, setUser] =
    useState<User | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [stats, setStats] =
    useState<DashboardStats | null>(
      null
    );

  const [
    recentVideos,
    setRecentVideos,
  ] = useState<RecentVideo[]>([]);

  const [
    recentPayments,
    setRecentPayments,
  ] = useState<
    RecentPayment[]
  >([]);

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (
          firebaseUser
        ) => {
          setUser(
            firebaseUser
          );

          if (!firebaseUser) {
            setLoading(false);

            setError(
              "Sign in with the NaijaVid administrator account."
            );

            return;
          }

          try {
            setLoading(true);
            setError("");

            const idToken =
              await firebaseUser
                .getIdToken();

            const response =
              await fetch(
                "/api/admin/dashboard",
                {
                  method: "GET",

                  headers: {
                    Authorization:
                      `Bearer ${idToken}`,
                  },

                  cache:
                    "no-store",
                }
              );

            const data =
              (await response.json()) as
                DashboardResponse;

            if (
              !response.ok ||
              !data.success
            ) {
              throw new Error(
                data.error ||
                  "Unable to load dashboard."
              );
            }

            setStats(
              data.stats ||
                null
            );

            setRecentVideos(
              data.recentVideos ||
                []
            );

            setRecentPayments(
              data.recentPayments ||
                []
            );
          } catch (
            err: any
          ) {
            console.error(
              "ADMIN DASHBOARD LOAD ERROR:",
              err
            );

            setError(
              err?.message ||
                "Unable to load admin dashboard."
            );
          } finally {
            setLoading(false);
          }
        }
      );

    return () =>
      unsubscribe();
  }, []);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
              NaijaVid AI
            </div>

            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 text-neutral-400">
              Monitor users,
              generations,
              subscriptions and
              payments.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/generator"
              className="rounded-xl border border-neutral-700 px-4 py-3 font-bold text-white no-underline"
            >
              Generator
            </Link>

            <Link
              href="/history"
              className="rounded-xl border border-neutral-700 px-4 py-3 font-bold text-white no-underline"
            >
              History
            </Link>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-neutral-800 bg-[#111] p-6">
            Loading admin
            dashboard...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-800 bg-red-950 p-5 text-red-200">
            {error}

            {!user && (
              <div className="mt-4">
                <Link
                  href="/login"
                  className="font-bold text-white underline"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        )}

        {!loading &&
          !error &&
          stats && (
            <>
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <StatCard
                  title="Total Users"
                  value={
                    stats.totalUsers
                  }
                />

                <StatCard
                  title="Free Users"
                  value={
                    stats.freeUsers
                  }
                />

                <StatCard
                  title="Founding Pro"
                  value={
                    stats.proUsers
                  }
                />

                <StatCard
                  title="Generated Videos"
                  value={
                    stats.totalVideos
                  }
                />

                <StatCard
                  title="Payments"
                  value={
                    stats.totalPayments
                  }
                />
              </section>

              <section className="mt-8">
                <h2 className="mb-4 text-2xl font-extrabold">
                  Recent Generations
                </h2>

                <div className="overflow-x-auto rounded-2xl border border-neutral-800">
                  <table className="w-full min-w-[850px] border-collapse">
                    <thead className="bg-[#151515]">
                      <tr>
                        <th className="p-4 text-left">
                          Prompt
                        </th>

                        <th className="p-4 text-left">
                          Mode
                        </th>

                        <th className="p-4 text-left">
                          Plan
                        </th>

                        <th className="p-4 text-left">
                          Duration
                        </th>

                        <th className="p-4 text-left">
                          Status
                        </th>

                        <th className="p-4 text-left">
                          Created
                        </th>

                        <th className="p-4 text-left">
                          Expires
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentVideos.map(
                        (video) => (
                          <tr
                            key={
                              video.id
                            }
                            className="border-t border-neutral-800"
                          >
                            <td className="max-w-[280px] p-4">
                              <div className="truncate">
                                {video.prompt ||
                                  "No prompt"}
                              </div>
                            </td>

                            <td className="p-4">
                              {
                                video.mode
                              }
                            </td>

                            <td className="p-4">
                              {
                                video.plan
                              }
                            </td>

                            <td className="p-4">
                              {
                                video.duration
                              }
                              s
                            </td>

                            <td className="p-4">
                              {
                                video.status
                              }
                            </td>

                            <td className="p-4 text-sm text-neutral-400">
                              {formatDate(
                                video.createdAt
                              )}
                            </td>

                            <td className="p-4 text-sm text-neutral-400">
                              {formatDate(
                                video.expiresAt
                              )}
                            </td>
                          </tr>
                        )
                      )}

                      {recentVideos.length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={
                              7
                            }
                            className="p-6 text-center text-neutral-400"
                          >
                            No video
                            history
                            available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mt-8">
                <h2 className="mb-4 text-2xl font-extrabold">
                  Recent Payments
                </h2>

                <div className="overflow-x-auto rounded-2xl border border-neutral-800">
                  <table className="w-full min-w-[700px] border-collapse">
                    <thead className="bg-[#151515]">
                      <tr>
                        <th className="p-4 text-left">
                          Amount
                        </th>

                        <th className="p-4 text-left">
                          Currency
                        </th>

                        <th className="p-4 text-left">
                          Status
                        </th>

                        <th className="p-4 text-left">
                          Transaction
                        </th>

                        <th className="p-4 text-left">
                          Date
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentPayments.map(
                        (payment) => (
                          <tr
                            key={
                              payment.id
                            }
                            className="border-t border-neutral-800"
                          >
                            <td className="p-4">
                              {payment.amount.toLocaleString()}
                            </td>

                            <td className="p-4">
                              {
                                payment.currency
                              }
                            </td>

                            <td className="p-4">
                              {
                                payment.status
                              }
                            </td>

                            <td className="p-4 text-sm text-neutral-400">
                              {payment.transactionId ||
                                payment.id}
                            </td>

                            <td className="p-4 text-sm text-neutral-400">
                              {formatDate(
                                payment.createdAt
                              )}
                            </td>
                          </tr>
                        )
                      )}

                      {recentPayments.length ===
                        0 && (
                        <tr>
                          <td
                            colSpan={
                              5
                            }
                            className="p-6 text-center text-neutral-400"
                          >
                            No payment
                            records
                            available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
      </div>
    </main>
  );
}