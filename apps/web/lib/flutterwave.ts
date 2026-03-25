export type FlutterwavePaymentInit = {
  amount: number;
  email: string;
  name: string;
  phone?: string;
  tx_ref: string;
  redirect_url: string;
  currency?: string;
};

export async function createFlutterwavePaymentLink(
  payload: FlutterwavePaymentInit
) {
  const secretKey = process.env.FLW_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing FLW_SECRET_KEY");
  }

  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: payload.tx_ref,
      amount: payload.amount,
      currency: payload.currency || "NGN",
      redirect_url: payload.redirect_url,
      customer: {
        email: payload.email,
        name: payload.name,
        phonenumber: payload.phone || "",
      },
      customizations: {
        title: "Naijavid AI Subscription",
        description: "Upgrade to Pro",
        logo: `${process.env.NEXT_PUBLIC_APP_URL}/logo.png`,
      },
    }),
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok || data?.status !== "success") {
    throw new Error(data?.message || "Failed to initialize Flutterwave payment");
  }

  return data;
}

export async function verifyFlutterwaveTransaction(transactionId: string) {
  const secretKey = process.env.FLW_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing FLW_SECRET_KEY");
  }

  const response = await fetch(
    `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "Failed to verify transaction");
  }

  return data;
}