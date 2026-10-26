"""Rule-based red flags that explain *why* a message looks risky.

The ML model gives a probability; these rules give human-readable reasons,
which is what a real user (or a bank's fraud team) actually needs.
"""
import re

RULES: list[tuple[str, re.Pattern]] = [
    ("Contains a link", re.compile(r"(https?://|www\.|bit\.ly|\.xyz|\.link)", re.I)),
    ("Asks for PIN, OTP or password", re.compile(r"\b(pin|otp|password|6 digit code|cvv)\b", re.I)),
    ("Mentions BVN or NIN", re.compile(r"\b(bvn|nin)\b", re.I)),
    ("Creates urgency", re.compile(r"\b(urgent|immediately|within \d+ ?hrs?|today|final warning|now)\b", re.I)),
    ("Threatens account block or legal action", re.compile(r"\b(blocked|suspended|frozen|deactivated|closed|legal action)\b", re.I)),
    ("Promises a prize or free money", re.compile(r"\b(won|winner|prize|congratulations|grant|free|claim)\b", re.I)),
    ("Asks you to pay a fee", re.compile(r"\b(fee|pay|send money|transfer|refund)\b", re.I)),
    ("Guaranteed or unrealistic returns", re.compile(r"\b(double your money|guaranteed|2x|earn .* daily)\b", re.I)),
]


def find_red_flags(text: str) -> list[str]:
    return [name for name, pattern in RULES if pattern.search(text)]
