export const RULES = [
  { name: "Contains a link", pattern: /(https?:\/\/|www\.|\.xyz|\.link|bit\.ly)/i, weight: 0.25 },
  { name: "Asks for PIN, OTP or password", pattern: /\b(pin|otp|password|6 digit code|cvv)\b/i, weight: 0.35 },
  { name: "Mentions BVN or NIN", pattern: /\b(bvn|nin)\b/i, weight: 0.3 },
  { name: "Creates urgency", pattern: /\b(urgent|immediately|within \d+ ?hrs?|today|final warning|now)\b/i, weight: 0.2 },
  { name: "Threatens account block or legal action", pattern: /\b(blocked|suspended|frozen|deactivated|closed|legal action)\b/i, weight: 0.3 },
  { name: "Promises a prize or free money", pattern: /\b(won|winner|prize|congratulations|grant|free|claim)\b/i, weight: 0.3 },
  { name: "Asks you to pay a fee", pattern: /\b(fee|pay|send money|transfer|refund)\b/i, weight: 0.25 },
  { name: "Guaranteed or unrealistic returns", pattern: /\b(double your money|guaranteed|2x|earn .* daily)\b/i, weight: 0.35 },
];

export function findRedFlags(text) {
  if (!text) return [];
  return RULES.filter((rule) => rule.pattern.test(text)).map((rule) => rule.name);
}

export function riskLevel(probability) {
  if (probability >= 0.8) return "high";
  if (probability >= 0.5) return "medium";
  return "low";
}

export function analyzeLocal(text) {
  const flags = findRedFlags(text);
  
  // Heuristic probability calculation matching training patterns
  let score = 0.05;
  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      score += rule.weight;
    }
  }

  // Suspicious combination boost (same rule as Python model)
  const flagSet = new Set(flags);
  if (flagSet.has("Contains a link") && flagSet.has("Asks for PIN, OTP or password")) {
    score = Math.max(score, 0.85);
  }
  if (flagSet.has("Mentions BVN or NIN") && (flagSet.has("Contains a link") || flagSet.has("Creates urgency"))) {
    score = Math.max(score, 0.88);
  }
  if (flagSet.has("Promises a prize or free money") && flagSet.has("Contains a link")) {
    score = Math.max(score, 0.92);
  }

  const p = Math.min(0.99, Math.max(0.01, Math.round(score * 1000) / 1000));
  const is_scam = p >= 0.5;

  return {
    scam_probability: p,
    risk: riskLevel(p),
    is_scam,
    red_flags: flags,
    advice: is_scam
      ? "Do not click links, reply, or share any codes. Contact your bank through its official app or number."
      : "Looks safe, but never share your PIN, OTP or BVN with anyone.",
    engine: "local_heuristic",
  };
}
