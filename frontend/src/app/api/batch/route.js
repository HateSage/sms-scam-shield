import { NextResponse } from "next/server";
import { analyzeLocal } from "@/lib/engine";
import { generateGeminiAssessment } from "@/lib/gemini";

const FASTAPI_URL = process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request) {
  try {
    const body = await request.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const includeLlm = Boolean(body?.include_llm);
    const customApiKey =
      body?.apiKey || request.headers.get("x-gemini-key") || null;

    if (!messages.length) {
      return NextResponse.json(
        { error: "Messages array cannot be empty" },
        { status: 400 }
      );
    }

    // Try FastAPI backend first
    try {
      const response = await fetch(`${FASTAPI_URL}/analyze/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(customApiKey ? { "X-Gemini-Key": customApiKey } : {}),
        },
        body: JSON.stringify({
          messages,
          include_llm: includeLlm,
          api_key: customApiKey,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ results: data, engine: "fastapi_ml" });
      }
    } catch {
      // Backend offline, fallback to local engine
    }

    const results = await Promise.all(
      messages.map(async (t) => {
        const local = analyzeLocal(t);
        if (includeLlm) {
          local.llm_assessment = await generateGeminiAssessment(
            t,
            local,
            customApiKey
          );
        }
        return {
          ...local,
          text: t,
        };
      })
    );

    return NextResponse.json({ results, engine: "local_heuristic" });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to process batch", details: err.message },
      { status: 500 }
    );
  }
}
