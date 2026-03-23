export type GenerateVideoPayload = {
  prompt: string;
  duration?: number;
  language?: string;
  watermark?: string;
};

export type GenerateVideoResponse = {
  success?: boolean;
  filename?: string;
  videoUrl?: string;
  error?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function generateVideo(
  payload: GenerateVideoPayload
): Promise<GenerateVideoResponse> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log("API RESPONSE:", data);
  return data;
}