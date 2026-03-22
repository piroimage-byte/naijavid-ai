export type UserPlan = "free" | "pro";

const FREE_LIMIT = 3;

export function getUserPlan(): UserPlan {
  if (typeof window === "undefined") return "free";

  return (localStorage.getItem("plan") as UserPlan) || "free";
}

export function canGenerateVideo(): boolean {
  const plan = getUserPlan();

  if (plan === "pro") return true;

  const used = Number(localStorage.getItem("daily_usage") || "0");
  return used < FREE_LIMIT;
}

export function incrementDailyUsage() {
  const used = Number(localStorage.getItem("daily_usage") || "0");
  localStorage.setItem("daily_usage", String(used + 1));
}