"""Training and inference for the SMS scam classifier."""
from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline

from app.red_flags import find_red_flags

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "models" / "scam_model.joblib"


def load_data() -> pd.DataFrame:
    uci = pd.read_csv(ROOT / "data" / "sms_spam_collection.tsv", sep="\t",
                      names=["label", "text"], quoting=3)
    uci["label"] = uci["label"].map({"spam": 1, "ham": 0})
    local = pd.read_csv(ROOT / "data" / "nigeria_scam_samples.csv")
    local["label"] = local["label"].map({"scam": 1, "ham": 0})
    return pd.concat([uci, local], ignore_index=True).dropna()


def build_pipeline() -> Pipeline:
    features = FeatureUnion([
        ("words", TfidfVectorizer(ngram_range=(1, 2), min_df=2, sublinear_tf=True)),
        ("chars", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), min_df=3, sublinear_tf=True)),
    ])
    clf = LogisticRegression(max_iter=2000, C=8, class_weight="balanced")
    return Pipeline([("features", features), ("clf", clf)])


def train(save: bool = True) -> dict:
    df = load_data()
    X_train, X_test, y_train, y_test = train_test_split(
        df["text"], df["label"], test_size=0.2, stratify=df["label"], random_state=42)
    pipe = build_pipeline().fit(X_train, y_train)
    proba = pipe.predict_proba(X_test)[:, 1]
    preds = (proba >= 0.5).astype(int)
    report = classification_report(y_test, preds, target_names=["safe", "scam"], output_dict=True)
    metrics = {
        "accuracy": round(report["accuracy"], 4),
        "scam_precision": round(report["scam"]["precision"], 4),
        "scam_recall": round(report["scam"]["recall"], 4),
        "scam_f1": round(report["scam"]["f1-score"], 4),
        "roc_auc": round(roc_auc_score(y_test, proba), 4),
        "train_size": int(len(X_train)),
        "test_size": int(len(X_test)),
    }
    if save:
        MODEL_PATH.parent.mkdir(exist_ok=True)
        joblib.dump(build_pipeline().fit(df["text"], df["label"]), MODEL_PATH)
    return metrics


_model = None


def get_model():
    global _model
    if _model is None:
        if not MODEL_PATH.exists():
            train()
        _model = joblib.load(MODEL_PATH)
    return _model


def risk_level(p: float) -> str:
    return "high" if p >= 0.8 else "medium" if p >= 0.5 else "low"


def analyze(text: str) -> dict:
    p = float(get_model().predict_proba([text])[0, 1])
    flags = find_red_flags(text)
    # A message asking for a PIN/OTP *and* containing a link is risky even if the model is unsure.
    if p < 0.5 and {"Contains a link", "Asks for PIN, OTP or password"} <= set(flags):
        p = max(p, 0.6)
    return {
        "scam_probability": round(p, 4),
        "risk": risk_level(p),
        "is_scam": p >= 0.5,
        "red_flags": flags,
        "advice": ("Do not click links, reply, or share any codes. Contact your bank through its official app or number."
                   if p >= 0.5 else "Looks safe, but never share your PIN, OTP or BVN with anyone."),
    }
