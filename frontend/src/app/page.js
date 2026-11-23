"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Layers,
  MessageSquare,
  Search,
  Sparkles,
  RefreshCw,
  Copy,
  Trash2,
  ExternalLink,
  Info,
  ChevronRight,
  ArrowRight,
  Check,
  Activity,
  Zap,
  History,
  Download,
  FileSpreadsheet,
  FileCode,
  HardDrive,
  Filter,
} from "lucide-react";

const STORAGE_KEY = "sms_scam_shield_history";
const DRAFT_KEY = "sms_scam_shield_draft";

const PRESET_SAMPLES = [
  {
    category: "Scam",
    title: "Bank BVN Alert",
    text: "URGENT: Your BVN has been blocked due to suspicious activity. Click http://bit.ly/bank-bvn-reactivate immediately or enter your OTP to restore access today.",
  },
  {
    category: "Scam",
    title: "Lottery Prize",
    text: "Congratulations! You have won $750,000 in the International Promo draw. Pay processing fee of $25 to claim your prize now at https://winner-claim.xyz",
  },
  {
    category: "Scam",
    title: "Crypto Doubler",
    text: "Guaranteed 2x returns! Double your money within 24 hrs. Transfer $50 to our verified wallet and earn 200% daily. Final warning for today's slot.",
  },
  {
    category: "Scam",
    title: "Suspended Package",
    text: "Your delivery package has been suspended. Pay $3.50 clearance fee today at https://track-parcel-post.link or it will be returned.",
  },
  {
    category: "Legitimate",
    title: "Bank Official OTP",
    text: "Your Access Bank verification code is 591024. Valid for 5 minutes. NEVER share this code or your PIN with anyone, including bank representatives.",
  },
  {
    category: "Legitimate",
    title: "Casual Message",
    text: "Hey Sarah, are we still meeting for lunch at 1:30 PM today? Let me know so I can reserve a table.",
  },
];

const THREAT_RULES_INFO = [
  {
    title: "Malicious Links & Shorteners",
    pattern: "bit.ly, .xyz, .link, raw IPs, http://",
    desc: "Directs victims to credential-harvesting phishing portals disguised as official bank websites.",
    severity: "High",
  },
  {
    title: "Credential & OTP Phishing",
    pattern: "PIN, OTP, CVV, password, 6-digit code",
    desc: "Attempts to trick users into handing over one-time passwords or card PINs to authorize fraudulent transfers.",
    severity: "Critical",
  },
  {
    title: "Identity Data Harvesting",
    pattern: "BVN, NIN, SSN, Tax ID",
    desc: "Targets National Identity Numbers and Bank Verification Numbers for SIM-swap fraud or unauthorized loans.",
    severity: "Critical",
  },
  {
    title: "Manufactured Urgency",
    pattern: "immediately, within 24 hrs, today, final warning, now",
    desc: "Fabricates panic to bypass critical thinking and compel the victim into taking rash action.",
    severity: "High",
  },
  {
    title: "Account Suspension Coercion",
    pattern: "blocked, suspended, frozen, deactivated, legal action",
    desc: "Uses intimidation and fear of losing access to banking accounts or assets to force compliance.",
    severity: "High",
  },
  {
    title: "Advance-Fee & Lottery Bait",
    pattern: "won, winner, prize, congratulations, grant, claim",
    desc: "Classic 419 advance-fee fraud claiming unearned winnings to solicit upfront 'processing' fees.",
    severity: "High",
  },
  {
    title: "Upfront Fee Demands",
    pattern: "fee, pay, send money, transfer, refund",
    desc: "Demands direct funds under the pretext of delivery clearance, activation, or processing charges.",
    severity: "Medium",
  },
  {
    title: "Unrealistic Financial Promises",
    pattern: "double your money, guaranteed, 2x, earn daily",
    desc: "Ponzi schemes and fake crypto investment scams promising impossible, risk-free returns.",
    severity: "High",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("single");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [historySearch, setHistorySearch] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");

  // Batch analysis states
  const [batchInput, setBatchInput] = useState(
    PRESET_SAMPLES.map((s) => s.text).join("\n\n---\n\n")
  );
  const [batchResults, setBatchResults] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchFilter, setBatchFilter] = useState("all");

  // Backend connection status
  const [backendStatus, setBackendStatus] = useState("checking");

  // 1. Initial LocalStorage Hydration
  useEffect(() => {
    checkHealth();

    // Hydrate saved messages from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }

      // Restore unsent message draft if available
      const savedDraft = localStorage.getItem(DRAFT_KEY);
      if (savedDraft) {
        setInputText(savedDraft);
      }
    } catch (e) {
      console.warn("Failed to read from localStorage", e);
    }
  }, []);

  // 2. Auto-save input draft to localStorage
  const handleInputChange = (text) => {
    setInputText(text);
    try {
      if (text) {
        localStorage.setItem(DRAFT_KEY, text);
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch (e) {
      console.warn("Failed to save draft to localStorage", e);
    }
  };

  // Helper to update history in state and localStorage
  const updateStorage = (updatedHistory) => {
    setHistory(updatedHistory);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("Failed to write to localStorage", e);
    }
  };

  const deleteHistoryItem = (id, e) => {
    if (e) e.stopPropagation();
    const updated = history.filter((item) => item.id !== id);
    updateStorage(updated);
  };

  const clearAllHistory = () => {
    if (window.confirm("Are you sure you want to delete all saved messages from localStorage?")) {
      updateStorage([]);
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sms-scam-shield-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ["Timestamp", "Risk", "Scam Probability", "Is Scam", "Red Flags", "Text"];
    const rows = history.map((h) => [
      `"${h.timestamp || ""}"`,
      `"${h.result?.risk || ""}"`,
      `"${((h.result?.scam_probability || 0) * 100).toFixed(1)}%"`,
      `"${h.result?.is_scam ? "YES" : "NO"}"`,
      `"${(h.result?.red_flags || []).join("; ")}"`,
      `"${(h.text || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sms-scam-shield-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const checkHealth = async () => {
    setBackendStatus("checking");
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setBackendStatus(data.status === "connected" ? "connected" : "standalone");
    } catch {
      setBackendStatus("standalone");
    }
  };

  const handleAnalyze = async (textToScan = inputText) => {
    const text = textToScan.trim();
    if (!text) return;

    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      setResult(data);

      const newItem = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text,
        result: data,
        timestamp: new Date().toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      // Persist in state & localStorage (keep last 50 entries)
      const updated = [newItem, ...history.filter((h) => h.text !== text)].slice(0, 50);
      updateStorage(updated);

      // Clear draft once successfully analyzed
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (err) {
        console.warn(err);
      }
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchAnalyze = async () => {
    const messages = batchInput
      .split(/\n\s*---\s*\n|\n\n+/)
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    if (messages.length === 0) return;

    setBatchLoading(true);
    try {
      const response = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await response.json();
      const results = data.results || [];
      setBatchResults(results);

      // Save batch results to localStorage history
      const nowStr = new Date().toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const batchItems = results.map((item, index) => ({
        id: `batch-${Date.now()}-${index}`,
        text: item.text,
        result: item,
        timestamp: nowStr,
      }));

      // Combine with existing history, avoiding exact duplicates
      const existingTexts = new Set(history.map((h) => h.text));
      const freshItems = batchItems.filter((b) => !existingTexts.has(b.text));
      const combined = [...freshItems, ...history].slice(0, 50);
      updateStorage(combined);
    } catch (err) {
      console.error("Batch scan failed", err);
    } finally {
      setBatchLoading(false);
    }
  };

  const copyToClipboard = (text, id = "input") => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredBatchResults = batchResults
    ? batchResults.filter((item) => {
        if (batchFilter === "all") return true;
        if (batchFilter === "scam") return item.is_scam;
        if (batchFilter === "safe") return !item.is_scam;
        if (batchFilter === "high") return item.risk === "high";
        return true;
      })
    : [];

  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      !historySearch ||
      item.text.toLowerCase().includes(historySearch.toLowerCase()) ||
      (item.result?.red_flags || []).some((f) =>
        f.toLowerCase().includes(historySearch.toLowerCase())
      );

    if (!matchesSearch) return false;
    if (historyFilter === "all") return true;
    if (historyFilter === "scam") return item.result?.is_scam;
    if (historyFilter === "safe") return !item.result?.is_scam;
    if (historyFilter === "high") return item.result?.risk === "high";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">SMS Scam Shield</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">AI & Heuristic Smishing Detection</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className="flex items-center gap-2 bg-slate-800/70 border border-slate-700/60 rounded-full px-3 py-1 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  backendStatus === "connected"
                    ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400"
                    : backendStatus === "standalone"
                    ? "bg-amber-400"
                    : "bg-slate-400 animate-ping"
                }`}
              />
              <span className="text-slate-300 font-medium hidden md:inline">
                {backendStatus === "connected"
                  ? "FastAPI ML Backend Live"
                  : backendStatus === "standalone"
                  ? "Local Shield Mode"
                  : "Checking Backend..."}
              </span>
              <button
                onClick={checkHealth}
                title="Refresh API status"
                className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>

            <a
              href="https://github.com/HateSage/sms-scam-shield"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors px-2.5 py-1 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900"
            >
              GitHub <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab("single")}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-t-lg transition-all shrink-0 ${
              activeTab === "single"
                ? "border-b-2 border-blue-500 text-blue-400 bg-blue-500/5 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            SMS Inspector
          </button>
          <button
            onClick={() => setActiveTab("batch")}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-t-lg transition-all shrink-0 ${
              activeTab === "batch"
                ? "border-b-2 border-blue-500 text-blue-400 bg-blue-500/5 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <Layers className="h-4 w-4" />
            Batch Scanner
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-t-lg transition-all shrink-0 ${
              activeTab === "history"
                ? "border-b-2 border-blue-500 text-blue-400 bg-blue-500/5 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <History className="h-4 w-4" />
            Saved Messages
            {history.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                {history.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-t-lg transition-all shrink-0 ${
              activeTab === "matrix"
                ? "border-b-2 border-blue-500 text-blue-400 bg-blue-500/5 font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Threat Matrix & Red Flags
          </button>
        </div>

        {/* TAB 1: SINGLE SMS INSPECTOR */}
        {activeTab === "single" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Input and Presets (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Main Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="sms-input" className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Search className="h-4 w-4 text-blue-400" />
                    Enter or Paste Suspicious SMS Text
                  </label>
                  <span className="text-xs text-slate-500">
                    {inputText.length} / 1000 chars
                  </span>
                </div>

                <div className="relative">
                  <textarea
                    id="sms-input"
                    rows={4}
                    value={inputText}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="e.g. URGENT: Your BVN has been blocked. Click http://bit.ly/bank-fix to reactivate now or your account will be frozen."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono text-sm leading-relaxed"
                  />
                  {inputText && (
                    <button
                      onClick={() => {
                        handleInputChange("");
                        setResult(null);
                      }}
                      className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md bg-slate-900/60"
                      title="Clear text"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <HardDrive className="h-3.5 w-3.5 text-blue-400" />
                    <span>Auto-saved to Browser LocalStorage</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {inputText && (
                      <button
                        onClick={() => copyToClipboard(inputText, "input")}
                        className="px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition flex items-center gap-1.5"
                      >
                        {copiedId === "input" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedId === "input" ? "Copied" : "Copy"}
                      </button>
                    )}
                    <button
                      onClick={() => handleAnalyze()}
                      disabled={loading || !inputText.trim()}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4" />
                          Scan Message
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sample Presets */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Quick-Test Samples
                  </span>
                  <span className="text-xs text-slate-500">Click to load and analyze</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESET_SAMPLES.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        handleInputChange(sample.text);
                        handleAnalyze(sample.text);
                      }}
                      className="text-left p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-800/40 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-xs text-slate-200 group-hover:text-blue-400 transition-colors">
                          {sample.title}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            sample.category === "Scam"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {sample.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {sample.text}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Analysis Results Card (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {result ? (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                  {/* Result Header Badge */}
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      result.risk === "high"
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        : result.risk === "medium"
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {result.risk === "high" ? (
                        <AlertOctagon className="h-8 w-8 text-rose-400 shrink-0" />
                      ) : result.risk === "medium" ? (
                        <AlertTriangle className="h-8 w-8 text-amber-400 shrink-0" />
                      ) : (
                        <ShieldCheck className="h-8 w-8 text-emerald-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs uppercase font-bold tracking-wider opacity-80">
                          Threat Evaluation
                        </div>
                        <div className="text-xl font-bold tracking-tight">
                          {result.risk === "high"
                            ? "High Risk Scam"
                            : result.risk === "medium"
                            ? "Suspicious / Medium Risk"
                            : "Likely Safe"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-black">
                        {(result.scam_probability * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] uppercase font-semibold opacity-70">
                        Scam Risk
                      </div>
                    </div>
                  </div>

                  {/* Probability Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-slate-400">
                      <span>Risk Probability Meter</span>
                      <span>{(result.scam_probability * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          result.scam_probability >= 0.8
                            ? "bg-gradient-to-r from-amber-500 to-rose-500"
                            : result.scam_probability >= 0.5
                            ? "bg-gradient-to-r from-emerald-500 to-amber-500"
                            : "bg-gradient-to-r from-emerald-600 to-emerald-400"
                        }`}
                        style={{ width: `${Math.max(5, result.scam_probability * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0% (Safe)</span>
                      <span>50% (Threshold)</span>
                      <span>100% (Confirmed Fraud)</span>
                    </div>
                  </div>

                  {/* Red Flags List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Detected Red Flags ({result.red_flags?.length || 0})
                      </span>
                    </div>

                    {result.red_flags && result.red_flags.length > 0 ? (
                      <div className="space-y-2">
                        {result.red_flags.map((flag, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20 text-xs text-rose-200"
                          >
                            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-rose-300">{flag}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        No signature red flags identified in this message.
                      </div>
                    )}
                  </div>

                  {/* Safety Advice */}
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                      <Info className="h-4 w-4 text-blue-400" /> Recommended Action
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{result.advice}</p>
                  </div>

                  {/* Engine Details Footer */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Engine: {result.engine === "fastapi_ml" ? "FastAPI ML Pipeline" : "Shield Heuristic"}
                    </span>
                    <span>is_scam: {result.is_scam ? "true" : "false"}</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-4">
                  <div className="h-12 w-12 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400">
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-300 text-sm">No Message Analyzed Yet</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                      Paste an SMS message on the left or select a quick-test sample to view scam probability and red flag analysis.
                    </p>
                  </div>
                </div>
              )}

              {/* Recent Scan History Sidebar widget */}
              {history.length > 0 && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <History className="h-3.5 w-3.5 text-blue-400" />
                      <span>Recent Saved Messages</span>
                    </div>
                    <button
                      onClick={() => setActiveTab("history")}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                    >
                      View All ({history.length})
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {history.slice(0, 6).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          handleInputChange(item.text);
                          setResult(item.result);
                        }}
                        className="cursor-pointer w-full text-left p-2.5 rounded-lg bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/60 transition flex items-center justify-between text-xs group"
                      >
                        <div className="truncate max-w-[210px] pr-2">
                          <p className="text-slate-300 font-mono text-[11px] truncate">{item.text}</p>
                          <span className="text-[10px] text-slate-500">{item.timestamp}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.result?.risk === "high"
                                ? "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                                : item.result?.risk === "medium"
                                ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                                : "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                            }`}
                          >
                            {((item.result?.scam_probability || 0) * 100).toFixed(0)}%
                          </span>
                          <button
                            onClick={(e) => deleteHistoryItem(item.id, e)}
                            title="Delete this message from local storage"
                            className="text-slate-500 hover:text-rose-400 p-1 rounded transition opacity-60 group-hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: BATCH SCANNER */}
        {activeTab === "batch" && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div>
                <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-400" />
                  Batch SMS Analysis
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Inspect multiple SMS messages at once. Separate messages with triple dashes (`---`) or blank lines.
                  Results are automatically saved to your local storage.
                </p>
              </div>

              <textarea
                rows={6}
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder="Message 1&#10;&#10;---&#10;&#10;Message 2&#10;&#10;---&#10;&#10;Message 3"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono text-xs leading-relaxed"
              />

              <div className="flex items-center justify-between flex-wrap gap-3">
                <button
                  onClick={() => setBatchInput(PRESET_SAMPLES.map((s) => s.text).join("\n\n---\n\n"))}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Load Sample Batch (6 messages)
                </button>

                <button
                  onClick={handleBatchAnalyze}
                  disabled={batchLoading || !batchInput.trim()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2"
                >
                  {batchLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Scanning Batch...
                    </>
                  ) : (
                    <>
                      <Layers className="h-4 w-4" />
                      Scan All Messages
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Batch Results Table & Stats */}
            {batchResults && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                    <div className="text-xs text-slate-400">Total Scanned</div>
                    <div className="text-2xl font-bold text-white mt-1">{batchResults.length}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-rose-500/20 p-4 rounded-xl">
                    <div className="text-xs text-rose-400">Flagged as Scams</div>
                    <div className="text-2xl font-bold text-rose-400 mt-1">
                      {batchResults.filter((r) => r.is_scam).length}
                    </div>
                  </div>
                  <div className="bg-slate-950/80 border border-emerald-500/20 p-4 rounded-xl">
                    <div className="text-xs text-emerald-400">Verified Safe</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">
                      {batchResults.filter((r) => !r.is_scam).length}
                    </div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                    <div className="text-xs text-slate-400">Scam Detection Rate</div>
                    <div className="text-2xl font-bold text-blue-400 mt-1">
                      {((batchResults.filter((r) => r.is_scam).length / (batchResults.length || 1)) * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Filter:</span>
                  {["all", "scam", "safe", "high"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setBatchFilter(f)}
                      className={`px-3 py-1 rounded-lg uppercase tracking-wider font-semibold transition ${
                        batchFilter === f
                          ? "bg-blue-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Results list */}
                <div className="space-y-3">
                  {filteredBatchResults.map((item, index) => (
                    <div
                      key={index}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                              item.risk === "high"
                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                : item.risk === "medium"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            }`}
                          >
                            {item.risk} Risk ({(item.scam_probability * 100).toFixed(0)}%)
                          </span>
                          {item.red_flags?.length > 0 && (
                            <span className="text-[11px] text-slate-500">
                              {item.red_flags.length} red flag{item.red_flags.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-200 font-mono">{item.text}</p>
                        {item.red_flags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.red_flags.map((flag, fi) => (
                              <span
                                key={fi}
                                className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded"
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          handleInputChange(item.text);
                          setResult(item);
                          setActiveTab("single");
                        }}
                        className="self-start md:self-center px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center gap-1 transition"
                      >
                        Inspect <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SAVED MESSAGES (LOCAL STORAGE) */}
        {activeTab === "history" && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-blue-400" />
                  <h2 className="text-lg font-bold text-white tracking-tight">Saved Messages & History</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                    {history.length} stored locally
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  All messages analyzed on this device are automatically preserved in your browser&apos;s localStorage.
                </p>
              </div>

              {history.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={exportJSON}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700/60 flex items-center gap-1.5 transition"
                  >
                    <FileCode className="h-3.5 w-3.5 text-blue-400" />
                    Export JSON
                  </button>
                  <button
                    onClick={exportCSV}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700/60 flex items-center gap-1.5 transition"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                    Export CSV
                  </button>
                  <button
                    onClick={clearAllHistory}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium rounded-xl border border-rose-500/30 flex items-center gap-1.5 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Filter and Search Bar */}
            {history.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search saved messages or red flags..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {historySearch && (
                    <button
                      onClick={() => setHistorySearch("")}
                      className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs shrink-0">
                  <Filter className="h-3.5 w-3.5 text-slate-400" />
                  {["all", "scam", "safe", "high"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setHistoryFilter(f)}
                      className={`px-2.5 py-1 rounded-lg uppercase tracking-wider text-[11px] font-semibold transition ${
                        historyFilter === f
                          ? "bg-blue-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stored Messages List */}
            {history.length === 0 ? (
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-400">
                  <History className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-300 text-sm">No Saved Messages in LocalStorage</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Any single or batch message you scan will be automatically saved here on this device.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("single")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Start Scanning
                </button>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No saved messages match your search or filter.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700/80 transition"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                            item.result?.risk === "high"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : item.result?.risk === "medium"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {item.result?.risk || "Unknown"} Risk ({((item.result?.scam_probability || 0) * 100).toFixed(0)}%)
                        </span>
                        <span className="text-xs text-slate-500">{item.timestamp}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copyToClipboard(item.text, item.id)}
                          title="Copy text"
                          className="px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded-md transition flex items-center gap-1"
                        >
                          {copiedId === item.id ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          {copiedId === item.id ? "Copied" : "Copy"}
                        </button>
                        <button
                          onClick={() => {
                            handleInputChange(item.text);
                            setResult(item.result);
                            setActiveTab("single");
                          }}
                          className="px-2.5 py-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-md transition flex items-center gap-1 font-medium"
                        >
                          Inspect <ArrowRight className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => deleteHistoryItem(item.id, e)}
                          title="Delete from local storage"
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-md transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-xs font-mono text-slate-200 leading-relaxed break-words">
                      {item.text}
                    </div>

                    {item.result?.red_flags && item.result.red_flags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {item.result.red_flags.map((flag, fi) => (
                          <span
                            key={fi}
                            className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded flex items-center gap-1"
                          >
                            <AlertTriangle className="h-2.5 w-2.5 text-rose-400" />
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: THREAT MATRIX & RED FLAGS */}
        {activeTab === "matrix" && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                SMS Threat Indicators & Red Flags Matrix
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                The classification engine pairs machine learning (Logistic Regression over TF-IDF n-grams) with deterministic heuristic red flag signatures.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {THREAT_RULES_INFO.map((rule, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl p-5 space-y-3 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200">{rule.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        rule.severity === "Critical"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : rule.severity === "High"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      }`}
                    >
                      {rule.severity} Severity
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{rule.desc}</p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs">
                    <span className="text-slate-500 font-mono text-[11px]">Match signature:</span>
                    <code className="text-blue-400 font-mono text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {rule.pattern}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} SMS Scam Shield. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>FastAPI ML Service: <code className="text-slate-300">port 8000</code></span>
            <span>Next.js UI: <code className="text-slate-300">port 3000</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
