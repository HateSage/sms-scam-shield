import { NextResponse } from "next/server";
import { analyzeLocal } from "@/lib/engine";
import { generateGeminiAssessment } from "@/lib/gemini";

const FASTAPI_URL = process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request) {
  try {
    const body = await request.json();
    const text = (body?.text || "").trim();
    const customApiKey =
      body?.apiKey || request.headers.get("x-gemini-key") || null;

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Try FastAPI backend first
    try {
      const response = await fetch(`${FASTAPI_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(customApiKey ? { "X-Gemini-Key": customApiKey } : {}),
        },
        body: JSON.stringify({
          text,
          include_llm: true,
          api_key: customApiKey,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const data = await response.json();
        // If FastAPI didn't run LLM, run it here
        if (!data.llm_assessment) {
          data.llm_assessment = await generateGeminiAssessment(
            text,
            data,
            customApiKey
          );
        }
        return NextResponse.json({ ...data, engine: "fastapi_ml" });
      }
    } catch {
      // Backend not running or timeout; fall back gracefully to local engine
    }

    // Fallback to local heuristic engine
    const localResult = analyzeLocal(text);
    const llmAssessment = await generateGeminiAssessment(
      text,
      localResult,
      customApiKey
    );
    localResult.llm_assessment = llmAssessment;

    return NextResponse.json(localResult);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to process message", details: err.message },
      { status: 500 }
    );
  }
}
