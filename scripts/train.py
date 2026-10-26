"""Train the model and print evaluation metrics."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.model import train  # noqa: E402

if __name__ == "__main__":
    print(json.dumps(train(), indent=2))
