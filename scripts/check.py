"""Command-line checker: python scripts/check.py "your message here"."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.model import analyze  # noqa: E402

if __name__ == "__main__":
    text = " ".join(sys.argv[1:]) or input("Paste the SMS: ")
    print(json.dumps(analyze(text), indent=2))
