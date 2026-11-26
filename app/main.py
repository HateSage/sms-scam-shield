"""FastAPI service: POST a message, get a scam risk score with reasons."""
from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.model import analyze, get_model
from app.llm import assess_message_with_gemini

app = FastAPI(title="SMS Scam Shield", version="1.0.0",
              description="Detects scam and fraud SMS messages and explains the red flags with Gemini LLM assessment.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000,
                      examples=["Your BVN has been blocked. Click http://bit.ly/x to reactivate"])
    include_llm: bool = Field(default=True, description="Whether to include Gemini LLM assessment")
    api_key: str | None = Field(default=None, description="Optional Google Gemini API key")


class BatchRequest(BaseModel):
    messages: list[str] = Field(..., min_length=1, max_length=100)
    include_llm: bool = Field(default=False, description="Whether to run LLM assessment for batch items")
    api_key: str | None = Field(default=None, description="Optional Google Gemini API key")


@app.on_event("startup")
def load_model() -> None:
    get_model()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/analyze")
def analyze_message(msg: Message, x_gemini_key: str | None = Header(default=None)) -> dict:
    result = analyze(msg.text)
    if msg.include_llm:
        effective_key = msg.api_key or x_gemini_key
        result["llm_assessment"] = assess_message_with_gemini(msg.text, result, effective_key)
    return result


@app.post("/analyze/batch")
def analyze_batch(req: BatchRequest, x_gemini_key: str | None = Header(default=None)) -> list[dict]:
    effective_key = req.api_key or x_gemini_key
    out = []
    for t in req.messages:
        item = analyze(t) | {"text": t}
        if req.include_llm:
            item["llm_assessment"] = assess_message_with_gemini(t, item, effective_key)
        out.append(item)
    return out
