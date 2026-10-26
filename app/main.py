"""FastAPI service: POST a message, get a scam risk score with reasons."""
from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.model import analyze, get_model

app = FastAPI(title="SMS Scam Shield", version="1.0.0",
              description="Detects scam and fraud SMS messages and explains the red flags.")


class Message(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000,
                      examples=["Your BVN has been blocked. Click http://bit.ly/x to reactivate"])


class BatchRequest(BaseModel):
    messages: list[str] = Field(..., min_length=1, max_length=100)


@app.on_event("startup")
def load_model() -> None:
    get_model()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/analyze")
def analyze_message(msg: Message) -> dict:
    return analyze(msg.text)


@app.post("/analyze/batch")
def analyze_batch(req: BatchRequest) -> list[dict]:
    return [analyze(t) | {"text": t} for t in req.messages]
