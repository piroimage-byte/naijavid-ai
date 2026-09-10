"use client";

import {
  useEffect,
  useMemo,
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

// =========================================================
// TYPES
// =========================================================

type DashboardStats = {
  totalUsers: number;
  freeUsers: number;
  proUsers: number;
  totalVideos: number;
  totalPayments: number;

  newUsersToday: number;
  freeUsersAtDailyLimit: number;
  proConversionRate: number;

  videosToday: number;

  completedVideos: number;
  failedVideos: number;

  completedVideosToday: number;
  failedVideosToday: number;

  freeGenerations: number;
  proGenerations: number;

  freeGenerationsToday: number;
  proGenerationsToday: number;

  generationSuccessRate: number;

  paymentsToday: number;

  successfulPayments: number;
  failedPayments: number;

  successfulPaymentsToday: number;
  failedPaymentsToday: number;

  paymentSuccessRate: number;

  estimatedRevenue: number;
  estimatedRevenueToday: number;

  revenueCurrency: string;
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

type SevenDayActivity = {
  date: string;
  label: string;
  videos: number;
  free: number;
  pro: number;
  completed: number;
  failed: number;
};

type DashboardResponse = {
  success: boolean;

  error?: string;

  admin?: {
    email: string;
  };

  stats?: DashboardStats;

  sevenDayActivity?: SevenDayActivity[];

  recentVideos?: RecentVideo[];

  recentPayments?: RecentPayment[];
};

// =========================================================
// HELPERS
// =========================================================

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Unknown";
  }

  return new Date(
    value
  ).toLocaleString(
    "en-NG",
    {
      timeZone:
        "Africa/Lagos",
    }
  );
}

function formatMoney(
  value: number,
  currency = "NGN"
) {
  try {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }
    ).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function normalizeStatus(
  value: string
) {
  return (
    value ||
    "unknown"
  )
    .trim()
    .toLowerCase();
}

function statusClass(
  value: string
) {
  const status =
    normalizeStatus(value);

  if (
    status === "completed" ||
    status === "successful" ||
    status === "success" ||
    status === "paid"
  ) {
    return "border-emerald-700 bg-emerald-950 text-emerald-300";
  }

  if (
    status === "failed" ||
    status === "failure" ||
    status === "error" ||
    status === "declined"
  ) {
    return "border-red-800 bg-red-950 text-red-300";
  }

  return "border-neutral-700 bg-neutral-900 text-neutral-300";
}

// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-[#111] p-5">
      <div className="text-sm font-medium text-neutral-400">
        {title}
      </div>

      <div className="mt-2 text-3xl font-extrabold text-white">
        {value}
      </div>

      {subtitle && (
        <div className="mt-2 text-xs text-neutral-500">
          {subtitle}
        </div>
      )}
    </div>
  );
}

// =========================================================
// PROGRESS BAR
// =========================================================

function ProgressBar({
  value,
}: {
  value: number;
}) {
  const safeValue =
    Math.max(
      0,
      Math.min(
        100,
        Number(value) || 0
      )
    );

  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-800">
      <div
        className="h-full rounded-full bg-emerald-500"
        style={{
          width:
            `${safeValue}%`,
        }}
      />
    </div>
  );
}

// =========================================================
// 7-DAY CHART
// =========================================================

function SevenDayChart({
  activity,
}: {
  activity: SevenDayActivity[];
}) {
  const maxVideos =
    Math.max(
      1,
      ...activity.map(
        (item) =>
          item.videos
      )
    );

  return (
    <div className="rounded-2xl border border-neutral-800 bg-[#111] p-5">
      <div className="mb-6">
        <h2 className="text-xl font-extrabold">
          7-Day Generation Activity
        </h2>

        <p className="mt-1 text-sm text-neutral-400">
          Videos generated per day.
        </p>
      </div>

      <div className="flex h-56 items-end gap-3">
        {activity.map(
          (item) => {
            const height =
              Math.max(
                4,
                Math.round(
                  (item.videos /
                    maxVideos) *
                    100
                )
              );

            return (
              <div
                key={
                  item.date
                }
                className="flex min-w-0 flex-1 flex-col items-center"
              >
                <div className="mb-2 text-xs font-bold text-neutral-300">
                  {item.videos}
                </div>

                <div className="flex h-40 w-full items-end justify-center">
                  <div
                    className="w-full max-w-12 rounded-t-xl bg-emerald-500 transition-all"
                    style={{
                      height:
                        `${height}%`,
                    }}
                    title={`${item.date}: ${item.videos} videos`}
                  />
                </div>

                <div className="mt-3 text-xs font-semibold text-neutral-400">
                  {item.label}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

// =========================================================
// PAGE
// =========================================================

export default function AdminPage() {
  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    stats,
    setStats,
  ] =
    useState<DashboardStats | null>(
      null
    );

  const [
    recentVideos,
    setRecentVideos,
  ] =
    useState<RecentVideo[]>(
      []
    );

  const [
    recentPayments,
    setRecentPayments,
  ] =
    useState<
      RecentPayment[]
    >([]);

  const [
    sevenDayActivity,
    setSevenDayActivity,
  ] =
    useState<
      SevenDayActivity[]
    >([]);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  // =======================================================
  // LOAD DASHBOARD
  // =======================================================

  async function loadDashboard(
    firebaseUser: User,
    silent = false
  ) {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const idToken =
        await firebaseUser
          .getIdToken(true);

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

      setSevenDayActivity(
        data.sevenDayActivity ||
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
      setRefreshing(false);
    }
  }

  // =======================================================
  // AUTH
  // =======================================================

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

            setStats(null);

            setError(
              "Sign in with the NaijaVid administrator account."
            );

            return;
          }

          await loadDashboard(
            firebaseUser
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);

  // =======================================================
  // DERIVED VALUES
  // =======================================================

  const totalSevenDayVideos =
    useMemo(
      () =>
        sevenDayActivity.reduce(
          (
            total,
            item
          ) =>
            total +
            item.videos,
          0
        ),
      [
        sevenDayActivity,
      ]
    );

  const averageVideosPerDay =
    sevenDayActivity.length >
    0
      ? (
          totalSevenDayVideos /
          sevenDayActivity.length
        ).toFixed(1)
      : "0";

  // =======================================================
  // UI
  // =======================================================

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
              NaijaVid AI
            </div>

            <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">
              Admin Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-neutral-400">
              Monitor users,
              generations,
              subscriptions,
              payments,
              revenue and launch
              performance.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {user && (
              <button
                type="button"
                disabled={
                  refreshing
                }
                onClick={() =>
                  loadDashboard(
                    user,
                    true
                  )
                }
                className="rounded-xl bg-emerald-500 px-4 py-3 font-bold text-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>
            )}

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

        {/* LOADING */}

        {loading && (
          <div className="rounded-2xl border border-neutral-800 bg-[#111] p-6">
            Loading admin
            dashboard...
          </div>
        )}

        {/* ERROR */}

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
              {/* MAIN TOTALS */}

              <section>
                <h2 className="mb-4 text-xl font-extrabold">
                  Platform Overview
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                    title="Payment Records"
                    value={
                      stats.totalPayments
                    }
                  />
                </div>
              </section>

              {/* TODAY */}

              <section className="mt-8">
                <h2 className="mb-4 text-xl font-extrabold">
                  Today
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="New Users Today"
                    value={
                      stats.newUsersToday
                    }
                    subtitle="New registrations"
                  />

                  <StatCard
                    title="Videos Today"
                    value={
                      stats.videosToday
                    }
                    subtitle={`${stats.completedVideosToday} completed`}
                  />

                  <StatCard
                    title="Payments Today"
                    value={
                      stats.paymentsToday
                    }
                    subtitle={`${stats.successfulPaymentsToday} successful`}
                  />

                  <StatCard
                    title="Revenue Today"
                    value={formatMoney(
                      stats.estimatedRevenueToday,
                      stats.revenueCurrency
                    )}
                    subtitle="Successful payments only"
                  />
                </div>
              </section>

              {/* BUSINESS */}

              <section className="mt-8">
                <h2 className="mb-4 text-xl font-extrabold">
                  Business Performance
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-neutral-800 bg-[#111] p-5">
                    <div className="text-sm font-medium text-neutral-400">
                      Pro Conversion
                    </div>

                    <div className="mt-2 text-3xl font-extrabold">
                      {stats.proConversionRate}%
                    </div>

                    <ProgressBar
                      value={
                        stats.proConversionRate
                      }
                    />

                    <div className="mt-2 text-xs text-neutral-500">
                      {stats.proUsers} of{" "}
                      {stats.totalUsers} users
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-[#111] p-5">
                    <div className="text-sm font-medium text-neutral-400">
                      Generation Success
                    </div>

                    <div className="mt-2 text-3xl font-extrabold">
                      {stats.generationSuccessRate}%
                    </div>

                    <ProgressBar
                      value={
                        stats.generationSuccessRate
                      }
                    />

                    <div className="mt-2 text-xs text-neutral-500">
                      {stats.completedVideos} completed,
                      {" "}
                      {stats.failedVideos} failed
                    </div>
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-[#111] p-5">
                    <div className="text-sm font-medium text-neutral-400">
                      Payment Success
                    </div>

                    <div className="mt-2 text-3xl font-extrabold">
                      {stats.paymentSuccessRate}%
                    </div>

                    <ProgressBar
                      value={
                        stats.paymentSuccessRate
                      }
                    />

                    <div className="mt-2 text-xs text-neutral-500">
                      {stats.successfulPayments} successful,
                      {" "}
                      {stats.failedPayments} failed
                    </div>
                  </div>

                  <StatCard
                    title="Estimated Revenue"
                    value={formatMoney(
                      stats.estimatedRevenue,
                      stats.revenueCurrency
                    )}
                    subtitle="Recorded successful NGN payments"
                  />
                </div>
              </section>

              {/* USER / GENERATION SIGNALS */}

              <section className="mt-8">
                <h2 className="mb-4 text-xl font-extrabold">
                  Usage Signals
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Free Users at Limit"
                    value={
                      stats.freeUsersAtDailyLimit
                    }
                    subtitle="Potential upgrade opportunities"
                  />

                  <StatCard
                    title="Free Generations"
                    value={
                      stats.freeGenerations
                    }
                    subtitle={`${stats.freeGenerationsToday} today`}
                  />

                  <StatCard
                    title="Pro Generations"
                    value={
                      stats.proGenerations
                    }
                    subtitle={`${stats.proGenerationsToday} today`}
                  />

                  <StatCard
                    title="7-Day Daily Average"
                    value={
                      averageVideosPerDay
                    }
                    subtitle={`${totalSevenDayVideos} videos in 7 days`}
                  />
                </div>
              </section>

              {/* 7 DAY CHART */}

              <section className="mt-8">
                <SevenDayChart
                  activity={
                    sevenDayActivity
                  }
                />
              </section>

              {/* RECENT GENERATIONS */}

              <section className="mt-8">
                <div className="mb-4 flex flex-col gap-1">
                  <h2 className="text-2xl font-extrabold">
                    Recent Generations
                  </h2>

                  <p className="text-sm text-neutral-400">
                    Latest video activity across NaijaVid.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-neutral-800">
                  <table className="w-full min-w-[950px] border-collapse">
                    <thead className="bg-[#151515]">
                      <tr>
                        <th className="p-4 text-left">
                          Prompt
                        </th>

                        <th className="p-4 text-left">
                          Mode
                        </th>

                        <th className="p-4 text-left">
                          Language
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
                        (
                          video
                        ) => (
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
                              {video.mode}
                            </td>

                            <td className="p-4">
                              {video.language}
                            </td>

                            <td className="p-4 capitalize">
                              {video.plan}
                            </td>

                            <td className="p-4">
                              {video.duration}s
                            </td>

                            <td className="p-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                                  video.status
                                )}`}
                              >
                                {video.status}
                              </span>
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
                              8
                            }
                            className="p-6 text-center text-neutral-400"
                          >
                            No video history
                            available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* RECENT PAYMENTS */}

              <section className="mt-8 pb-8">
                <div className="mb-4 flex flex-col gap-1">
                  <h2 className="text-2xl font-extrabold">
                    Recent Payments
                  </h2>

                  <p className="text-sm text-neutral-400">
                    Latest payment activity recorded by NaijaVid.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-neutral-800">
                  <table className="w-full min-w-[750px] border-collapse">
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
                        (
                          payment
                        ) => (
                          <tr
                            key={
                              payment.id
                            }
                            className="border-t border-neutral-800"
                          >
                            <td className="p-4 font-semibold">
                              {formatMoney(
                                payment.amount,
                                payment.currency
                              )}
                            </td>

                            <td className="p-4">
                              {payment.currency}
                            </td>

                            <td className="p-4">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass(
                                  payment.status
                                )}`}
                              >
                                {payment.status}
                              </span>
                            </td>

                            <td className="max-w-[260px] p-4 text-sm text-neutral-400">
                              <div className="truncate">
                                {payment.transactionId ||
                                  payment.id}
                              </div>
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
                            No payment records
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