import { NextResponse } from "next/server";
import { analyzeLocal } from "@/lib/engine";

const FASTAPI_URL = process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (!messages.length) {
      return NextResponse.json({ error: "Messages array cannot be empty" }, { status: 400 });
    }

    // Try FastAPI backend first
    try {
      const response = await fetch(`${FASTAPI_URL}/analyze/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ results: data, engine: "fastapi_ml" });
      }
    } catch {
      // Backend offline, fallback to local engine
    }

    const results = messages.map((t) => ({
      ...analyzeLocal(t),
      text: t,
    }));

    return NextResponse.json({ results, engine: "local_heuristic" });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to process batch", details: err.message },
      { status: 500 }
    );
  }
}
