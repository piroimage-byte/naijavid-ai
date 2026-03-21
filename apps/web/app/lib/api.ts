export const API_BASE_URL = "http://127.0.0.1:8000";

export type JobItem = {
  id: string;
  prompt: string;
  language: string;
  duration: number;
  videoUrl?: string;
  status: "completed" | "failed" | "processing";
  error?: string;
  createdAt?: string;
};

export async function fetchLanguages() {
  const res = await fetch(`${API_BASE_URL}/languages`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load languages");
  return res.json();
}

export async function generateVideo(formData: FormData) {
  const res = await fetch(`${API_BASE_URL}/generate`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Video generation failed");
  }

  return res.json();
}

export async function fetchJobs(): Promise<{ jobs: JobItem[] }> {
  const res = await fetch(`${API_BASE_URL}/jobs`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}