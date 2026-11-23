import { NextResponse } from "next/server";
import { analyzeLocal } from "@/lib/engine";

const FASTAPI_URL = process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request) {
  try {
    const body = await request.json();
    const text = (body?.text || "").trim();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Try FastAPI backend first
    try {
      const response = await fetch(`${FASTAPI_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(2500),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ ...data, engine: "fastapi_ml" });
      }
    } catch {
      // Backend not running or timeout; fall back gracefully to local engine
    }

    // Fallback to local heuristic engine
    const localResult = analyzeLocal(text);
    return NextResponse.json(localResult);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to process message", details: err.message },
      { status: 500 }
    );
  }
}
