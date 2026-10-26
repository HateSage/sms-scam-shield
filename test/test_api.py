from fastapi.testclient import TestClient

from app.main import app
from app.red_flags import find_red_flags

client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_obvious_scam_flagged():
    r = client.post("/analyze", json={"text": "URGENT your BVN is blocked. Click http://bit.ly/fix and send your PIN now"})
    body = r.json()
    assert r.status_code == 200
    assert body["is_scam"] is True
    assert "Mentions BVN or NIN" in body["red_flags"]


def test_normal_message_safe():
    body = client.post("/analyze", json={"text": "Are we still meeting for lunch at 2?"}).json()
    assert body["is_scam"] is False
    assert body["risk"] == "low"


def test_batch():
    r = client.post("/analyze/batch", json={"messages": ["hi mum", "You won N1000000! claim your prize now, pay N2000 fee"]})
    out = r.json()
    assert len(out) == 2 and out[1]["is_scam"] is True


def test_empty_rejected():
    assert client.post("/analyze", json={"text": ""}).status_code == 422


def test_red_flags_rules():
    flags = find_red_flags("Send your OTP to claim your prize at www.win.xyz")
    assert {"Contains a link", "Asks for PIN, OTP or password", "Promises a prize or free money"} <= set(flags)
