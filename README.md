# 🛡️ SMS Scam Shield

**An AI-powered smishing and fraud detection platform that identifies scam SMS messages, evaluates risk levels, and explains the exact red flags in plain English.**

![Python](https://img.shields.io/badge/Python-3.11-blue) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![React](https://img.shields.io/badge/React-18-blue) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8) ![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688) ![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-orange) ![Vercel](https://img.shields.io/badge/Vercel-Deployed-black) ![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)

---

## 📌 The Problem
Fake "your BVN is blocked" texts, bogus promo prize notifications, crypto doubler schemes, and OTP phishing messages cost individuals and businesses millions every year—particularly across high-mobile-banking regions. Most victims cannot identify sophisticated social engineering tactics in the heat of the moment.

## 💡 The Solution
**SMS Scam Shield** combines a machine learning classification pipeline with deterministic heuristic rules to deliver an interpretable threat assessment:
- 📊 **Scam Probability:** Statistical risk score (0% – 100%) from a balanced Logistic Regression model.
- 🚦 **Risk Classification:** Categorized as **High Risk**, **Suspicious / Medium Risk**, or **Likely Safe**.
- 🤖 **Gemini AI Assessment:** Deep neural evaluation of social engineering tactics, targeted entities, and manipulation techniques.
- 🚩 **Plain-English Red Flags:** Identifies specific indicators (credential theft, shortened links, BVN/NIN harvesting, artificial urgency, etc.).
- 🛡️ **Actionable Advice:** Immediate, contextual safety instructions and safe response drafts on what to do next.

---

## ✨ Features

- **Google Gemini LLM Integration:** Automated cognitive assessment explaining the *why* behind scams, flagging psychological manipulation techniques (fear, urgency, greed), identifying impersonated entities, and providing concrete defense steps.
- **Interactive Next.js Dashboard:** Built with Next.js 14 (App Router), React 18, Tailwind CSS, and Lucide Icons.
- **In-App Gemini Key Configuration:** Easily configure and save your Google Gemini API key directly in the dashboard UI (saved in secure local storage).
- **Real-Time SMS Inspector:** Single-message tester with live character counter, preloaded real-world scam/safe presets, and a dynamic threat meter.
- **Batch Scanner:** Inspect dozens of messages simultaneously with summary metrics (scam detection rate, flagged counts, safe counts) and risk filters.
- **Browser LocalStorage History:** All analyzed messages, AI assessments, and drafts are automatically saved to your browser so your history persists across reloads.
  - Search and filter saved messages by keyword or risk tier.
  - Export logs directly as **JSON** or **CSV**.
  - One-click re-inspection in the main analyzer.
- **Dual-Engine Resilience:** Seamlessly proxies requests to the live Python FastAPI backend. If the Python server is offline, the frontend automatically falls back to an integrated local heuristic engine without breaking the user experience.
- **Cloud & Container Ready:** Easily deployable to **Vercel** for the frontend and **Docker** for the backend API.

---

## 🧠 How It Works

```
SMS Text ──► TF-IDF (word 1–2 n-grams) ──┐
          └─► TF-IDF (char 3–5 n-grams) ──┴─► Logistic Regression ──► Scam Probability
SMS Text ──► Regex Heuristic Rules ───────────────────────────────► Red Flag Explanations
```

- **Character n-grams:** Detects obfuscated evasion spellings (e.g., `fr33`, `acc0unt`, `b.v.n`).
- **Class Balancing:** Balances class weights during training to account for the real-world rarity of scam SMS relative to legitimate messages.
- **Rule Layer:** Detects critical high-risk combinations (e.g., messages containing both an external link *and* an OTP/PIN request are escalated to high priority).

### Model Performance

Trained on the UCI SMS Spam Collection (5,574 messages) augmented with Nigerian and international financial scam datasets. Evaluated on a held-out 20% test split:

| Metric | Score |
|---|---|
| **Accuracy** | **99.2%** |
| **Scam Precision** | **98.6%** |
| **Scam Recall** | **95.4%** |
| **F1-Score (Scam)** | **0.970** |
| **ROC-AUC** | **0.996** |

---

## 🚩 Threat Indicators Detected

1. **Malicious Links & Shorteners:** Flags `bit.ly`, `.xyz`, `.link`, raw IPs, and unregistered domains.
2. **Credential & OTP Phishing:** Detects requests for PINs, OTPs, CVVs, passwords, or 6-digit codes.
3. **Identity Data Harvesting:** Flags requests for Bank Verification Numbers (BVN) or National Identity Numbers (NIN).
4. **Manufactured Urgency:** Identifies artificial panic words (`immediately`, `within 24 hrs`, `final warning`, `today`).
5. **Account Coercion & Threats:** Detects threats of account deactivation, freezing, or legal action.
6. **Advance-Fee & Lottery Bait:** Recognizes 419 lottery, sweepstakes, and unearned cash award claims.
7. **Upfront Fee Demands:** Identifies demands for processing, delivery clearance, or reactivation fees.
8. **Unrealistic Financial Promises:** Flags Ponzi promises (`double your money`, `guaranteed 2x daily`).

---

## 🚀 Quick Start

### 1. Frontend (Next.js & React)

```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

> **Note:** The frontend works out-of-the-box in standalone mode with its built-in heuristic engine.

### 2. Backend (FastAPI ML Service)

```bash
# In the root directory:
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Train the ML model
python scripts/train.py

# Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
- API interactive docs: **`http://localhost:8000/docs`**
- Health endpoint: **`http://localhost:8000/health`**

### 3. Check via CLI

```bash
python scripts/check.py "Your account will be suspended today. Verify at http://gtb-secure.xyz and enter your OTP"
```

### 4. Docker

```bash
docker build -t sms-scam-shield .
docker run -p 8000:8000 sms-scam-shield
```

---

## 🌐 Deploying to Vercel

The frontend is optimized for deployment on [Vercel](https://vercel.com):

1. Import this repository into Vercel.
2. In the **Project Settings**:
   - **Root Directory:** set to `frontend`
   - **Framework Preset:** `Next.js`
   - **Build Command:** `npm run build`
3. Click **Deploy**.

*(Optional)* If hosting the FastAPI backend remotely, set the environment variable in Vercel:
```env
FASTAPI_BACKEND_URL=https://your-backend-api.com
```

---

## 🔌 API Reference

### `POST /analyze`
Analyzes a single SMS message.

**Request:**
```json
{
  "text": "URGENT: Your BVN has been blocked. Click http://bit.ly/bank-fix to reactivate now."
}
```

**Response:**
```json
{
  "scam_probability": 0.942,
  "risk": "high",
  "is_scam": true,
  "red_flags": [
    "Contains a link",
    "Mentions BVN or NIN",
    "Creates urgency",
    "Threatens account block or legal action"
  ],
  "advice": "Do not click links, reply, or share any codes. Contact your bank through its official app or number."
}
```

### `POST /analyze/batch`
Analyzes up to 100 messages in a single request.

**Request:**
```json
{
  "messages": [
    "Your account is suspended. Verify at http://bit.ly/x",
    "Hey, are we still meeting for lunch today at 1pm?"
  ]
}
```

### `GET /health`
Returns service status: `{"status": "ok"}`.

---

## 📂 Project Structure

```
sms-scam-shield/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application with CORS middleware
│   ├── model.py             # ML pipeline, training & inference logic
│   └── red_flags.py         # Heuristic rule-matching engine
├── data/
│   ├── nigeria_scam_samples.csv  # Localized financial scam samples
│   └── sms_spam_collection.tsv   # UCI labeled SMS spam dataset
├── frontend/                # Next.js 14 web application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/         # Proxy & health endpoints (/analyze, /batch, /health)
│   │   │   ├── globals.css  # Tailwind styling & dark theme
│   │   │   ├── layout.js    # Root layout & metadata
│   │   │   └── page.js      # Main dashboard (Inspector, Batch, Storage, Matrix)
│   │   └── lib/
│   │       └── engine.js    # Client-side heuristic fallback engine
│   ├── package.json
│   ├── tailwind.config.js
│   └── vercel.json
├── scripts/
│   ├── check.py             # CLI testing utility
│   └── train.py             # Model training script
├── test/
│   └── test_api.py          # Pytest suite for FastAPI and red flags
├── Dockerfile               # Backend container configuration
├── requirements.txt         # Python dependencies
└── README.md
```

---

## 🧪 Running Tests

```bash
# Run backend pytest suite
pytest -q

# Run frontend build verification
cd frontend && npm run build
```

---

## 📄 Dataset Attribution
- [SMS Spam Collection](https://archive.ics.uci.edu/dataset/228/sms+spam+collection), Almeida and Hidalgo, UCI Machine Learning Repository (CC BY 4.0).

---

Built with ❤️ by **Abdullahi Muhammed** ([@HateSage](https://github.com/HateSage)).
