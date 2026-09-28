"use client";

import { useState } from "react";
import {
  Upload,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileCode2,
  X,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { api, pct } from "@/lib/api";
import { callLabel } from "@/lib/calls";
import type { Score } from "@/lib/types";

const SAFE_PRESET = `stat("/home/user/documents/notes.txt", {st_mode=S_IFREG|0644}) = 0
openat(AT_FDCWD, "/home/user/documents/notes.txt", O_RDONLY) = 3
read(3, "Project meeting minutes and task updates...", 4096) = 4096
read(3, "", 4096) = 0
close(3) = 0

stat("/home/user/documents/budget.csv", {st_mode=S_IFREG|0644}) = 0
openat(AT_FDCWD, "/home/user/documents/budget.csv", O_RDONLY) = 3
read(3, "Q1,Q2,Q3,Q4\n100,150,120,200", 2048) = 2048
close(3) = 0

openat(AT_FDCWD, "/home/user/documents/notes.txt", O_WRONLY|O_CREAT|O_TRUNC, 0666) = 3
write(3, "Project meeting minutes: reviewed by team.", 42) = 42
close(3) = 0`;

const RANSOMWARE_PRESET = `getdents64(3, /* 12 entries */, 32768) = 480
openat(AT_FDCWD, "/home/user/documents/financials.xlsx", O_RDONLY) = 4
read(4, "CONFIDENTIAL FINANCIAL REPORT DATA...", 65536) = 65536
openat(AT_FDCWD, "/home/user/documents/financials.xlsx.locked", O_WRONLY|O_CREAT|O_TRUNC, 0666) = 5
write(5, "\x99\x42\xfa\x01\xbb\xee...", 65536) = 65536
write(5, "\x11\x22\x33\x44\x55\x66...", 1024) = 1024
close(5) = 0
close(4) = 0
rename("/home/user/documents/financials.xlsx", "/home/user/documents/financials.xlsx.bak") = 0
unlink("/home/user/documents/financials.xlsx.bak") = 0

getdents64(3, /* 12 entries */, 32768) = 480
openat(AT_FDCWD, "/home/user/documents/client_database.db", O_RDONLY) = 4
read(4, "SQLITE DATABASE RECORDS...", 32768) = 32768
openat(AT_FDCWD, "/home/user/documents/client_database.db.locked", O_WRONLY|O_CREAT|O_TRUNC, 0666) = 5
write(5, "\xfe\xdc\xba\x98\x76\x54...", 32768) = 32768
write(5, "\xaa\xbb\xcc\xdd\xee\xff...", 512) = 512
close(5) = 0
close(4) = 0
rename("/home/user/documents/client_database.db", "/home/user/documents/client_database.db.bak") = 0
unlink("/home/user/documents/client_database.db.bak") = 0`;

type AnalysisState = {
  sequence: string[];
  result: Score;
  fileName: string;
} | null;

export function LandingPage() {
  const [inputText, setInputText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);

  async function analyzeTrace(text: string, fileName = "Pasted Trace") {
    if (!text.trim()) {
      setError("Please provide a file or system call trace to analyze.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await api<{ sequence: string[]; result: Score }>("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ trace: text, source: fileName }),
      });
      setAnalysis({
        sequence: data.sequence,
        result: data.result,
        fileName,
      });
    } catch (err) {
      setAnalysis(null);
      setError(err instanceof Error ? err.message : "Failed to analyze file.");
    } finally {
      setBusy(false);
    }
  }

  async function handleFileUpload(file: File) {
    if (file.size > 2_000_000) {
      setError("File exceeds 2 MB limit.");
      return;
    }
    try {
      const text = await file.text();
      if (text.includes("\u0000")) {
        setError("Binary file detected. Please upload a code, log, or text trace file.");
        return;
      }
      setInputText(text);
      await analyzeTrace(text, file.name);
    } catch {
      setError("Failed to read the file.");
    }
  }

  const isRansomware = analysis?.result.alert === true;
  const threatScore = analysis ? Math.round(analysis.result.score * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/70 via-slate-50 to-cyan-50/70 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white flex flex-col justify-between relative overflow-hidden">
      {/* Background Ambient Glow Orbs for Glassmorphism */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 left-[10%] w-[580px] h-[580px] bg-gradient-to-tr from-violet-500/35 via-indigo-400/30 to-fuchsia-400/25 rounded-full blur-[110px] animate-pulse duration-1000" />
        <div className="absolute top-[10%] -right-20 w-[600px] h-[600px] bg-gradient-to-bl from-cyan-400/35 via-sky-400/30 to-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-20 left-1/3 w-[550px] h-[550px] bg-gradient-to-tr from-pink-400/25 via-rose-300/25 to-amber-300/20 rounded-full blur-[110px]" />
      </div>

      {/* Stylish Left-Aligned Header */}
      <header className="w-full border-b border-white/50 bg-white/40 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] sticky top-0 z-50">
        <div className="w-full px-6 sm:px-10 h-16 flex items-center justify-start">
          <span className="font-black text-xl sm:text-2xl tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-600 bg-clip-text text-transparent hover:opacity-90 transition-opacity drop-shadow-2xs">
            Ransomware <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">Detector</span>
          </span>
        </div>
      </header>

      {/* Main Glassmorphic Container */}
      <main className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 flex-1 flex flex-col justify-center">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.12]">
            Upload File for{" "}
            <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm">
              Behavior Analysis
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed font-medium">
            Drop any code, log, or system call trace. The AI ensemble detects locker attack loops and provides an instant threat verdict.
          </p>
        </div>

        {/* Central Glassmorphism Card */}
        <div className="relative">
          <div className="relative rounded-[32px] border border-white/80 bg-white/50 shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.9),0_24px_60px_-15px_rgba(99,102,241,0.15)] backdrop-blur-3xl p-6 sm:p-9 transition-all duration-300">
            
            {/* Glass Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files[0];
                if (file) void handleFileUpload(file);
              }}
              className={`group/dropzone relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden p-8 sm:p-11 text-center ${
                dragActive
                  ? "border-indigo-500 bg-white/80 scale-[1.01] shadow-xl shadow-indigo-500/20 backdrop-blur-xl"
                  : "border-indigo-300/60 bg-white/40 hover:border-indigo-400 hover:bg-white/60 hover:shadow-lg hover:shadow-indigo-500/10 backdrop-blur-xl"
              }`}
            >
              <input
                type="file"
                className="sr-only"
                id="file-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                  e.target.value = "";
                }}
              />
              <label htmlFor="file-upload" className="cursor-pointer block relative z-10">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30 group-hover/dropzone:scale-110 group-hover/dropzone:shadow-indigo-500/50 transition-all duration-300">
                  {busy ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 group-hover/dropzone:-translate-y-0.5 transition-transform" />
                  )}
                </div>
                <p className="text-base sm:text-lg font-bold text-slate-900">
                  {busy ? "Evaluating AI Ensemble Models..." : "Click to upload or drag & drop"}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Drop your <span className="font-semibold text-slate-700">.txt</span>, <span className="font-semibold text-slate-700">.log</span>, <span className="font-semibold text-slate-700">.py</span>, source code, or strace log
                </p>

                {/* Glassmorphic Format Badges */}
                <div className="mt-4 flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="px-3 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-300/40 text-[10px] font-bold text-indigo-700 backdrop-blur-sm">
                    STRACE
                  </span>
                  <span className="px-3 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-300/40 text-[10px] font-bold text-cyan-700 backdrop-blur-sm">
                    PYTHON
                  </span>
                  <span className="px-3 py-0.5 rounded-full bg-violet-500/10 border border-violet-300/40 text-[10px] font-bold text-violet-700 backdrop-blur-sm">
                    C / C++
                  </span>
                  <span className="px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-300/40 text-[10px] font-bold text-amber-700 backdrop-blur-sm">
                    LOG
                  </span>
                  <span className="px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-300/40 text-[10px] font-bold text-emerald-700 backdrop-blur-sm">
                    TEXT
                  </span>
                </div>
              </label>
            </div>

            {/* Glassmorphic Quick Sample Pills */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
              <span className="text-xs text-slate-500 font-semibold mr-0.5">Quick Samples:</span>
              
              <button
                type="button"
                onClick={() => {
                  setInputText(SAFE_PRESET);
                  void analyzeTrace(SAFE_PRESET, "Safe_Editor_Trace.txt");
                }}
                className="px-4 py-2 rounded-2xl text-xs font-bold bg-white/70 backdrop-blur-md text-emerald-700 border border-emerald-300/80 shadow-[0_2px_10px_rgba(16,185,129,0.12)] hover:bg-emerald-500 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Test Safe File</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInputText(RANSOMWARE_PRESET);
                  void analyzeTrace(RANSOMWARE_PRESET, "Crypto_Locker_Attack.txt");
                }}
                className="px-4 py-2 rounded-2xl text-xs font-bold bg-white/70 backdrop-blur-md text-rose-700 border border-rose-300/80 shadow-[0_2px_10px_rgba(244,63,94,0.12)] hover:bg-rose-500 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Test Ransomware File</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPasteBox(!showPasteBox)}
                className="px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-700 bg-white/60 backdrop-blur-md border border-slate-300/80 shadow-xs hover:bg-white/90 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FileCode2 className="w-4 h-4 text-slate-500" />
                <span>{showPasteBox ? "Hide Paste Box" : "Paste Code/Trace"}</span>
              </button>

              {(inputText || analysis) && (
                <button
                  type="button"
                  onClick={() => {
                    setInputText("");
                    setAnalysis(null);
                    setError(null);
                  }}
                  className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 bg-white/50 backdrop-blur-md border border-slate-200 hover:bg-white/90 transition-all cursor-pointer shadow-xs"
                  title="Reset Sandbox"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Glassmorphic Paste Textarea */}
            {showPasteBox && (
              <div className="mt-5 pt-4 border-t border-white/60 animate-in fade-in duration-200">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Paste System Calls or Source Code:
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste system call sequence (e.g. open -> read -> write -> rename -> unlink) or raw strace output..."
                  rows={5}
                  className="w-full p-3.5 rounded-2xl border border-white/80 bg-white/60 backdrop-blur-md font-mono text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 shadow-inner resize-none transition-all"
                />
                <div className="flex justify-end mt-2.5">
                  <button
                    type="button"
                    disabled={busy || !inputText.trim()}
                    onClick={() => void analyzeTrace(inputText, "Pasted Trace")}
                    className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 shadow-md shadow-indigo-600/30 hover:shadow-lg hover:shadow-indigo-600/40 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Analyze Sequence</span>
                  </button>
                </div>
              </div>
            )}

            {/* Glassmorphic Error Message */}
            {error && (
              <div className="mt-5 p-4 rounded-2xl bg-rose-50/80 backdrop-blur-md border border-rose-300 text-rose-700 text-xs font-medium flex items-center gap-2.5 shadow-sm animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Glassmorphic AI Verdict & Analysis Card */}
            {analysis && (
              <div
                className={`mt-6 rounded-3xl border p-6 sm:p-7 backdrop-blur-2xl transition-all duration-500 animate-in fade-in slide-in-from-bottom-2 ${
                  isRansomware
                    ? "bg-gradient-to-br from-rose-50/80 via-white/80 to-pink-50/70 border-rose-300/90 shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.9),0_20px_50px_-10px_rgba(244,63,94,0.2)]"
                    : "bg-gradient-to-br from-emerald-50/80 via-white/80 to-teal-50/70 border-emerald-300/90 shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.9),0_20px_50px_-10px_rgba(16,185,129,0.2)]"
                }`}
              >
                {/* Verdict Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/60">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-13 h-13 rounded-2xl flex items-center justify-center text-white shadow-xl ${
                        isRansomware
                          ? "bg-gradient-to-tr from-rose-600 via-red-500 to-pink-500 shadow-rose-600/40 animate-pulse"
                          : "bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 shadow-emerald-600/40"
                      }`}
                    >
                      {isRansomware ? (
                        <ShieldAlert className="w-7 h-7" />
                      ) : (
                        <ShieldCheck className="w-7 h-7" />
                      )}
                    </div>
                    <div>
                      <span
                        className={`text-xl sm:text-2xl font-black tracking-tight ${
                          isRansomware ? "text-rose-700" : "text-emerald-700"
                        }`}
                      >
                        {isRansomware ? "Ransomware Detected" : "File Is Safe (Benign)"}
                      </span>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Target: <span className="font-semibold text-slate-700">{analysis.fileName}</span> • {analysis.sequence.length} operations evaluated
                      </p>
                    </div>
                  </div>

                  {/* Threat Score Badge */}
                  <div className="sm:text-right flex sm:flex-col items-baseline sm:items-end justify-between">
                    <span
                      className={`text-3xl sm:text-4xl font-black tracking-tight ${
                        isRansomware ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {threatScore}%
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Threat Probability
                    </span>
                  </div>
                </div>

                {/* Threat Probability Bar */}
                <div className="mt-5">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                    <span className="text-emerald-600">Safe Range</span>
                    <span className="text-amber-600">Threshold (55%)</span>
                    <span className="text-rose-600">Critical Threat</span>
                  </div>
                  <div className="w-full bg-white/80 rounded-full h-3.5 overflow-hidden p-0.5 relative shadow-inner border border-white/60">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        isRansomware
                          ? "bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 shadow-md shadow-rose-500/50"
                          : "bg-gradient-to-r from-teal-400 to-emerald-500 shadow-md shadow-emerald-500/50"
                      }`}
                      style={{ width: `${Math.max(threatScore, 6)}%` }}
                    />
                  </div>
                </div>

                {/* Dynamic Summary in Frosted Glass Box */}
                <div className="mt-4 p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-white/90 shadow-xs">
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                    {analysis.result.response}
                  </p>
                </div>

                {/* Mitigation Action Alert */}
                <div
                  className={`mt-3.5 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 backdrop-blur-md shadow-xs ${
                    isRansomware
                      ? "bg-rose-500/15 text-rose-800 border border-rose-300/80"
                      : "bg-emerald-500/15 text-emerald-800 border border-emerald-300/80"
                  }`}
                >
                  {isRansomware ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Mitigation Action: Malicious Process Terminated (SIGTERM triggered at early window)</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Mitigation Action: No Suspicious Behavior. Process Permitted to Run.</span>
                    </>
                  )}
                </div>

                {/* 4-Model AI Ensemble Votes in Glass Tiles */}
                <div className="mt-5 pt-4 border-t border-white/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2.5">
                    4-Model AI Ensemble Consensus:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/90 text-center shadow-xs">
                      <span className="text-[10px] font-bold text-indigo-600 block">Gradient Boosting</span>
                      <span className="text-xs font-extrabold text-slate-800 mt-0.5 block">
                        {pct(analysis.result.votes.gradient_boosting)}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/90 text-center shadow-xs">
                      <span className="text-[10px] font-bold text-emerald-600 block">Random Forest</span>
                      <span className="text-xs font-extrabold text-slate-800 mt-0.5 block">
                        {pct(analysis.result.votes.random_forest)}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/90 text-center shadow-xs">
                      <span className="text-[10px] font-bold text-amber-600 block">Calibrated SVM</span>
                      <span className="text-xs font-extrabold text-slate-800 mt-0.5 block">
                        {pct(analysis.result.votes.svm)}
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-white/60 backdrop-blur-md border border-white/90 text-center shadow-xs">
                      <span className="text-[10px] font-bold text-cyan-600 block">MLP Neural Net</span>
                      <span className="text-xs font-extrabold text-slate-800 mt-0.5 block">
                        {pct(analysis.result.votes.mlp)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Glassmorphic Syscall Stream */}
                <div className="mt-4 pt-3.5 border-t border-white/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Extracted System Call Stream ({analysis.sequence.length} operations):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2.5 rounded-2xl bg-white/50 backdrop-blur-md border border-white/80 shadow-inner">
                    {analysis.sequence.map((call, idx) => {
                      const isModifying = ["write", "pwrite", "writev", "rename", "unlink"].includes(call);
                      const isDestructive = ["rename", "unlink"].includes(call);
                      return (
                        <span
                          key={`${call}-${idx}`}
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-semibold border backdrop-blur-sm ${
                            isDestructive
                              ? "bg-rose-100/90 text-rose-700 border-rose-300"
                              : isModifying
                              ? "bg-amber-100/90 text-amber-800 border-amber-300"
                              : "bg-sky-50/90 text-sky-700 border-sky-200"
                          }`}
                        >
                          {callLabel(call)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}