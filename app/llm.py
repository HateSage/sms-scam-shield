"""LLM-powered threat assessment and safety response generator using Google Gemini."""
from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

SYSTEM_INSTRUCTION = """You are a senior cybersecurity fraud investigator and smishing detection specialist.
Your task is to analyze SMS messages for financial fraud, identity theft, credential phishing, or legitimacy.
You must return your evaluation strictly as a valid JSON object with this exact schema:
{
  "summary": "1-2 sentence executive assessment of the message's legitimacy and threat level.",
  "impersonated_entity": "Name of the bank, delivery service, government agency, or company being impersonated, or 'None / Unknown' if not applicable.",
  "threat_category": "One of: Banking Phishing, Credential Theft, Advance-Fee (419) Fraud, Delivery Scam, Crypto / Investment Scam, General Spam, Legitimate Notification, or Personal Message.",
  "manipulation_tactics": ["List of 2-4 social engineering psychological manipulation tactics used, e.g., 'Fabricated Urgency', 'Authority Impersonation', 'Fear of Account Loss', 'Greed / Fake Reward'"],
  "technical_indicators": ["List of 1-3 technical red flags or observations, e.g., 'Shortened redirect URL (bit.ly)', 'Demands sensitive 6-digit OTP'"],
  "recommended_actions": ["List of 2-4 concrete, actionable safety steps the recipient should take, e.g., 'Do not click the provided link', 'Contact your bank via its verified official number'"],
  "safe_reply_draft": "Actionable guidance or response: 'Ignore and block sender' if a scam, or a polite safe reply if legitimate."
}
Only output the raw JSON object, without markdown code fences or conversational text."""


def generate_heuristic_assessment(text: str, ml_result: dict[str, Any] | None = None) -> dict[str, Any]:
    """Generates an intelligent structured assessment using local heuristics when Gemini API is unavailable."""
    is_scam = ml_result.get("is_scam", False) if ml_result else False
    flags = ml_result.get("red_flags", []) if ml_result else []
    prob = ml_result.get("scam_probability", 0.0) if ml_result else 0.0

    lower = text.lower()
    impersonated = "None / Unknown"
    category = "Legitimate Notification" if not is_scam else "Banking Phishing"

    if re.search(r"\b(bvn|nin|gtb|zenith|access|uba|first bank|polaris|stanbic|kuda|opay|palmpay)\b", lower):
        category = "Banking Phishing"
        impersonated = "Financial Institution / Bank"
    elif re.search(r"\b(won|prize|lottery|promo|congratulations)\b", lower):
        category = "Advance-Fee (419) Fraud"
        impersonated = "Lottery / Promo Sweepstakes"
    elif re.search(r"\b(crypto|bitcoin|invest|double|returns|forex|wallet)\b", lower):
        category = "Crypto / Investment Scam"
        impersonated = "Fake Crypto / Investment Platform"
    elif re.search(r"\b(delivery|package|parcel|shipment|fedx|dhl|ups|customs)\b", lower):
        category = "Delivery Scam"
        impersonated = "Courier / Delivery Service"
    elif not is_scam:
        category = "Personal Message" if not re.search(r"\b(code|otp|verify)\b", lower) else "Legitimate Notification"

    tactics = []
    if "Creates urgency" in flags or re.search(r"\b(urgent|immediately|today|now)\b", lower):
        tactics.append("Manufactured Urgency (Forces quick decision without verification)")
    if "Threatens account block or legal action" in flags or re.search(r"\b(blocked|suspended|frozen|legal)\b", lower):
        tactics.append("Fear & Intimidation (Threat of immediate financial disruption)")
    if "Promises a prize or free money" in flags or "Guaranteed or unrealistic returns" in flags:
        tactics.append("Greed & Artificial Reward (Promises unrealistic financial gains)")
    if "Mentions BVN or NIN" in flags or "Asks for PIN, OTP or password" in flags:
        tactics.append("Authority Pretexting (Impersonating compliance security procedures)")

    if not tactics:
        tactics = ["No deceptive social engineering tactics detected." if not is_scam else "Generic unsolicited outreach."]

    tech_indicators = []
    if "Contains a link" in flags or re.search(r"https?://|bit\.ly|\.xyz", lower):
        tech_indicators.append("Contains suspicious link or unverified shortener.")
    if "Asks for PIN, OTP or password" in flags:
        tech_indicators.append("Solicits confidential authentication secret (PIN/OTP).")
    if not tech_indicators:
        tech_indicators = ["Standard plain-text message without suspicious links or payloads."]

    if is_scam:
        summary = (
            f"High-confidence fraudulent communication ({int(prob * 100)}% risk). "
            f"The message utilizes deceptive pretexting to solicit sensitive information or illicit payments."
        )
        actions = [
            "Do not click on any hyperlinks contained in the message.",
            "Never disclose your OTP, PIN, BVN, or card security code to anyone.",
            "Report and block the sender's phone number on your device.",
            "Verify your account status exclusively via your bank's official mobile application or certified phone line."
        ]
        reply = "Do not reply. Delete the message and block the sender."
    else:
        summary = "Message appears consistent with standard communication. No malicious indicators or social engineering patterns identified."
        actions = [
            "Safe to proceed, but observe standard security practices.",
            "Remember that legitimate institutions never request your PIN or passwords via SMS."
        ]
        reply = "Normal conversational response permitted if sender is known."

    return {
        "summary": summary,
        "impersonated_entity": impersonated,
        "threat_category": category,
        "manipulation_tactics": tactics,
        "technical_indicators": tech_indicators,
        "recommended_actions": actions,
        "safe_reply_draft": reply,
        "engine": "local_heuristic_engine",
    }


def assess_message_with_gemini(
    text: str,
    ml_result: dict[str, Any] | None = None,
    api_key: str | None = None,
) -> dict[str, Any]:
    """Evaluates an SMS using Google Gemini 1.5 Flash. Falls back to heuristic assessment if key is missing or call fails."""
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        return generate_heuristic_assessment(text, ml_result)

    prompt = f"""Analyze this SMS text:
\"\"\"{text}\"\"\"

Pre-computed classification signals:
- Scam Probability: {ml_result.get('scam_probability', 'N/A') if ml_result else 'N/A'}
- Risk Tier: {ml_result.get('risk', 'N/A') if ml_result else 'N/A'}
- Red Flags: {', '.join(ml_result.get('red_flags', [])) if ml_result else 'None'}

Provide your structured JSON fraud evaluation according to the required schema."""

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": SYSTEM_INSTRUCTION},
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        }
    }

    try:
        url = f"{GEMINI_API_URL}?key={key}"
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                raw_text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                cleaned = raw_text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                parsed = json.loads(cleaned)
                parsed["engine"] = "gemini-1.5-flash"
                return parsed
    except Exception:
        pass

    fallback = generate_heuristic_assessment(text, ml_result)
    fallback["engine"] = "local_heuristic_fallback"
    return fallback
