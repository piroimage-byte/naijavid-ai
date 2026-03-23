import type { UserPlan } from "@/lib/user-service";

export const FREE_MAX_DURATION = 5;
export const PRO_MAX_DURATION = 10;

export function getMaxDurationByPlan(plan: UserPlan): number {
  return plan === "pro" ? PRO_MAX_DURATION : FREE_MAX_DURATION;
}

export function canUseDuration(plan: UserPlan, duration: number): boolean {
  return duration <= getMaxDurationByPlan(plan);
}

export function getPlanLabel(plan: UserPlan): string {
  return plan === "pro" ? "Pro" : "Free";
}