export const PRO_PLAN_AMOUNT_NAIRA = 5000;
export const PRO_PLAN_AMOUNT_KOBO = PRO_PLAN_AMOUNT_NAIRA * 100;

export function generateReference(uid: string) {
  return `naijavid_pro_${uid}_${Date.now()}`;
}