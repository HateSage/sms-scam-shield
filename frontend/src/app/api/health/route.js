import { NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const response = await fetch(`${FASTAPI_URL}/health`, {
      signal: AbortSignal.timeout(1500),
    });
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({ status: "connected", fastApiStatus: data.status });
    }
  } catch {
    // FastAPI is offline
  }
  return NextResponse.json({ status: "standalone", fastApiStatus: "offline" });
}
