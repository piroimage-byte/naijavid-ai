import { NextRequest, NextResponse } from "next/server";

type GenerateRequestBody = {
  script?: string;
  duration?: number;
};

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Generate API route is working.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequestBody;

    const script = String(body.script || "").trim();
    const duration = Number(body.duration || 5);

    if (!script) {
      return NextResponse.json(
        { error: "Script is required." },
        { status: 400 }
      );
    }

    const backendBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

    const backendResponse = await fetch(`${backendBaseUrl}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        script,
        duration,
      }),
      cache: "no-store",
    });

    const rawText = await backendResponse.text();

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        {
          error: "Backend did not return valid JSON.",
          details: rawText.slice(0, 300),
        },
        { status: 502 }
      );
    }

    if (!backendResponse.ok) {
      const message =
        typeof parsed === "object" &&
        parsed !== null &&
        "error" in parsed &&
        typeof (parsed as { error?: unknown }).error === "string"
          ? (parsed as { error: string }).error
          : "Backend request failed.";

      return NextResponse.json(
        { error: message },
        { status: backendResponse.status }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}