type FlutterwavePaymentInit = {
  tx_ref: string;
  redirect_url: string;
  amount: number;
  currency: string;
  customer: {
    email: string;
    name?: string;
    phonenumber?: string;
  };
  customizations?: {
    title?: string;
    description?: string;
  };
};

export async function createFlutterwavePaymentLink(
  payload: FlutterwavePaymentInit
) {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing FLUTTERWAVE_SECRET_KEY");
  }

  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (data.status !== "success") {
    throw new Error(
      data?.message || "Flutterwave payment initialization failed"
    );
  }

  return data.data; // contains payment link
}