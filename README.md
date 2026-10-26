# 🛡️ SMS Scam Shield

**An AI-powered API that detects scam and fraud SMS messages and explains exactly why they're risky.**

![Python](https://img.shields.io/badge/Python-3.11-blue) ![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-orange) ![FastAPI](https://img.shields.io/badge/FastAPI-API-009688) ![Docker](https://img.shields.io/badge/Docker-ready-2496ED) ![Tests](https://img.shields.io/badge/tests-passing-brightgreen)

## The problem
Fake "your BVN is blocked" texts, bogus promo wins, and OTP-phishing messages cost people real money every day, especially in Nigeria, where mobile banking is everywhere. Most people can't tell a real bank alert from a fake one in the moment.

## The solution
SMS Scam Shield scores any text message for scam risk and returns:
- a **scam probability** from a machine-learning model
- a **risk level** (low, medium or high)
- **plain-English red flags** (asks for an OTP, contains a link, threatens to block your account and more)
- **advice** on what to do next

## Results
Trained on the UCI SMS Spam Collection (5,574 messages) plus Nigerian-style scam and safe samples. Evaluated on a held-out 20% test set:

| Metric | Score |
|---|---|
| Accuracy | **99.2%** |
| Scam precision | 98.6% |
| Scam recall | 95.4% |
| F1 (scam) | 0.970 |
| ROC-AUC | 0.996 |

## How it works
```
SMS text ──► TF-IDF (word 1–2 grams) ─┐
         └─► TF-IDF (char 3–5 grams) ─┴─► Logistic Regression ──► probability
SMS text ──► Regex red-flag rules ───────────────────────────────► explanations
```
- **Character n-grams** catch obfuscated scam spellings ("fr33", "acc0unt").
- **Class balancing** handles the fact that scams are rarer than normal texts.
- **Rule layer** turns the model's score into reasons a person can act on, and escalates messages that ask for a PIN or OTP *and* include a link.

## Quick start
```bash
git clone https://github.com/HateSage/sms-scam-shield.git
cd sms-scam-shield
pip install -r requirements.txt
python scripts/train.py            # trains and prints metrics
uvicorn app.main:app --reload      # API at http://localhost:8000/docs
```

Check a message from the terminal:
```bash
python scripts/check.py "Your account will be suspended today. Verify at http://gtb-secure.xyz and enter your OTP"
```

### Docker
```bash
docker build -t sms-scam-shield .
docker run -p 8000:8000 sms-scam-shield
```

## API
`POST /analyze`
```json
{ "text": "Dear customer your account will be suspended today. Verify at http://gtb-secure.xyz and enter your OTP" }
```
Response:
```json
{
  "scam_probability": 0.9257,
  "risk": "high",
  "is_scam": true,
  "red_flags": ["Contains a link", "Asks for PIN, OTP or password", "Creates urgency", "Threatens account block or legal action"],
  "advice": "Do not click links, reply, or share any codes. Contact your bank through its official app or number."
}
```
Also available: `POST /analyze/batch` (up to 100 messages) and `GET /health`.

## Project structure
```
sms-scam-shield/
├── app/
│   ├── main.py        # FastAPI routes
│   ├── model.py       # training, evaluation, inference
│   └── red_flags.py   # explainable rule layer
├── data/              # UCI dataset + Nigerian scam samples
├── scripts/           # train.py, check.py
├── tests/             # pytest API + rules tests
├── Dockerfile
└── requirements.txt
```

## Tests
```bash
pytest -q
```

## Limitations and next steps
- The Nigerian samples are a small hand-written set. Collecting real, anonymised scam texts would improve local accuracy.
- Add multilingual support (Yoruba, Hausa, Igbo, Pidgin).
- Ship as a WhatsApp or Telegram bot that people can forward suspicious messages to.

## Dataset credit
[SMS Spam Collection](https://archive.ics.uci.edu/dataset/228/sms+spam+collection), Almeida and Hidalgo, UCI Machine Learning Repository (CC BY 4.0).

---
Built by **Abdullahi Muhammed** ([@HateSage](https://github.com/HateSage)) as part of my AI engineering journey.
