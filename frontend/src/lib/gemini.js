const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const SYSTEM_INSTRUCTION = `You are a senior cybersecurity fraud investigator and smishing detection specialist.
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
Only output the raw JSON object, without markdown code fences or conversational text.`;

export function generateLocalAssessment(text, mlResult = {}) {
  const is_scam = mlResult?.is_scam ?? false;
  const flags = mlResult?.red_flags ?? [];
  const prob = mlResult?.scam_probability ?? 0.0;
  const lower = (text || "").toLowerCase();

  let impersonated = "None / Unknown";
  let category = is_scam ? "Banking Phishing" : "Legitimate Notification";

  if (/\b(bvn|nin|gtb|zenith|access|uba|first bank|polaris|stanbic|kuda|opay|palmpay)\b/i.test(lower)) {
    category = "Banking Phishing";
    impersonated = "Financial Institution / Bank";
  } else if (/\b(won|prize|lottery|promo|congratulations|sweepstakes)\b/i.test(lower)) {
    category = "Advance-Fee (419) Fraud";
    impersonated = "Lottery / Promo Sweepstakes";
  } else if (/\b(crypto|bitcoin|invest|double|returns|forex|wallet)\b/i.test(lower)) {
    category = "Crypto / Investment Scam";
    impersonated = "Fake Crypto / Investment Platform";
  } else if (/\b(delivery|package|parcel|shipment|fedx|dhl|ups|customs)\b/i.test(lower)) {
    category = "Delivery Scam";
    impersonated = "Courier / Delivery Service";
  } else if (!is_scam) {
    category = /\b(code|otp|verify)\b/i.test(lower) ? "Legitimate Notification" : "Personal Message";
  }

  const tactics = [];
  if (flags.includes("Creates urgency") || /\b(urgent|immediately|today|now)\b/i.test(lower)) {
    tactics.push("Manufactured Urgency (Forces quick decision without verification)");
  }
  if (flags.includes("Threatens account block or legal action") || /\b(blocked|suspended|frozen|legal)\b/i.test(lower)) {
    tactics.push("Fear & Intimidation (Threat of immediate financial disruption)");
  }
  if (flags.includes("Promises a prize or free money") || flags.includes("Guaranteed or unrealistic returns")) {
    tactics.push("Greed & Artificial Reward (Promises unrealistic financial gains)");
  }
  if (flags.includes("Mentions BVN or NIN") || flags.includes("Asks for PIN, OTP or password")) {
    tactics.push("Authority Pretexting (Impersonating compliance security procedures)");
  }
  if (tactics.length === 0) {
    tactics.push(is_scam ? "Generic unsolicited outreach." : "No deceptive social engineering tactics detected.");
  }

  const tech_indicators = [];
  if (flags.includes("Contains a link") || /https?:\/\/|bit\.ly|\.xyz|\.link/i.test(lower)) {
    tech_indicators.push("Contains suspicious link or unverified shortener.");
  }
  if (flags.includes("Asks for PIN, OTP or password")) {
    tech_indicators.push("Solicits confidential authentication secret (PIN/OTP).");
  }
  if (tech_indicators.length === 0) {
    tech_indicators.push("Standard plain-text message without suspicious links or payloads.");
  }

  let summary = "";
  let actions = [];
  let reply = "";

  if (is_scam) {
    summary = `High-confidence fraudulent communication (${Math.round(prob * 100)}% risk). The message utilizes deceptive pretexting to solicit sensitive information or illicit payments.`;
    actions = [
      "Do not click on any hyperlinks contained in the message.",
      "Never disclose your OTP, PIN, BVN, or card security code to anyone.",
      "Report and block the sender's phone number on your device.",
      "Verify your account status exclusively via your bank's official mobile application or certified phone line."
    ];
    reply = "Do not reply. Delete the message and block the sender.";
  } else {
    summary = "Message appears consistent with standard communication. No malicious indicators or social engineering patterns identified.";
    actions = [
      "Safe to proceed, but observe standard security practices.",
      "Remember that legitimate institutions never request your PIN or passwords via SMS."
    ];
    reply = "Normal conversational response permitted if sender is known.";
  }

  return {
    summary,
    impersonated_entity: impersonated,
    threat_category: category,
    manipulation_tactics: tactics,
    technical_indicators: tech_indicators,
    recommended_actions: actions,
    safe_reply_draft: reply,
    engine: "local_heuristic_engine",
  };
}

export async function generateGeminiAssessment(text, mlResult = {}, customApiKey = null) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return generateLocalAssessment(text, mlResult);
  }

  const prompt = `Analyze this SMS text:
"""${text}"""

Pre-computed classification signals:
- Scam Probability: ${mlResult.scam_probability ?? "N/A"}
- Risk Tier: ${mlResult.risk ?? "N/A"}
- Red Flags: ${(mlResult.red_flags || []).join(", ") || "None"}

Provide your structured JSON fraud evaluation according to the required schema.`;

  const payload = {
    contents: [
      {
        parts: [
          { text: SYSTEM_INSTRUCTION },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  try {
    const url = `${GEMINI_API_URL}?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000),
    });

    if (response.ok) {
      const data = await response.json();
      const rawText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = rawText
        .trim()
        .replace(/^```json/i, "")
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      parsed.engine = "gemini-1.5-flash";
      return parsed;
    }
  } catch (err) {
    console.warn("Gemini API call failed, using heuristic fallback", err);
  }

  const fallback = generateLocalAssessment(text, mlResult);
  fallback.engine = "local_heuristic_fallback";
  return fallback;
}
