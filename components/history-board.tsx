"use client";

import { useState } from "react";
import Link from "next/link";
import {
  History,
  ShieldAlert,
  ShieldCheck,
  Search,
  Download,
  Trash2,
  ExternalLink,
  FileText,
  X,
  FileCode,
  ArrowUpRight,
  TrendingUp,
  Lock,
  LogIn,
} from "lucide-react";
import { useHistory, ScanRecord } from "@/lib/history";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";

export function HistoryBoard() {
  const { user, loaded: authLoaded } = useAuth();
  const { history, deleteScan, clearHistory, exportCSV, exportJSON } = useHistory(user?.email);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "ransomware" | "benign">("all");
  const [selectedRecord, setSelectedRecord] = useState<ScanRecord | null>(null);

  // If user is guest (not logged in)
  const isGuest = authLoaded && !user;

  // Filter records
  const filtered = history.filter((item) => {
    const matchesSearch = item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || item.label === filterType;
    return matchesSearch && matchesFilter;
  });

  // Calculate high-level stats
  const totalScans = history.length;
  const ransomwareDetected = history.filter((h) => h.label === "ransomware").length;
  const benignCount = history.filter((h) => h.label === "benign").length;
  const avgConfidence = totalScans > 0 ? history.reduce((acc, h) => acc + h.confidence, 0) / totalScans : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/70 via-slate-50 to-cyan-50/70 text-slate-900 font-sans flex flex-col justify-between relative overflow-hidden">
      {/* Background Ambient Glow Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 left-[10%] w-[580px] h-[580px] bg-gradient-to-tr from-violet-500/35 via-indigo-400/30 to-fuchsia-400/25 rounded-full blur-[110px] animate-pulse duration-1000" />
        <div className="absolute top-[10%] -right-20 w-[600px] h-[600px] bg-gradient-to-bl from-cyan-400/35 via-sky-400/30 to-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-20 left-1/3 w-[550px] h-[550px] bg-gradient-to-tr from-pink-400/25 via-rose-300/25 to-amber-300/20 rounded-full blur-[110px]" />
      </div>

      {/* Header */}
      <AppHeader />

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 flex-1 space-y-6">
        
        {/* If Guest: Show Authentication Required Gatekeeper */}
        {isGuest ? (
          <div className="max-w-md mx-auto my-12 text-center">
            <div className="rounded-[32px] border border-white/80 bg-white/60 shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.9),0_20px_50px_-15px_rgba(99,102,241,0.15)] backdrop-blur-3xl p-8 sm:p-10 space-y-5">
              <div className="size-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <Lock className="size-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Authentication Required
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  Scan history and threat audit logs are private to authenticated accounts. Please sign in or create an account to view and save your test records.
                </p>
              </div>

              <div className="pt-2 space-y-2.5">
                <Link
                  href="/login"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all"
                >
                  <LogIn className="size-4" />
                  <span>Sign In / Create Account</span>
                </Link>

                <Link
                  href="/"
                  className="inline-block text-xs text-slate-500 hover:text-indigo-600 font-semibold transition-colors pt-2"
                >
                  ← Return to File Analyzer
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Page Title Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 mb-2">
                  <History className="size-3.5" />
                  <span>Personal Audit Vault</span>
                  {user && (
                    <span className="text-slate-400 font-normal ml-1">
                      • {user.name} ({user.email})
                    </span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  Scan <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">History</span>
                </h1>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                  Personal audit records of all files and system call sequences evaluated on your account.
                </p>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={exportCSV}
                  disabled={history.length === 0}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200 shadow-xs transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Download className="size-3.5 text-indigo-600" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={exportJSON}
                  disabled={history.length === 0}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200 shadow-xs transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Download className="size-3.5 text-cyan-600" />
                  <span>Export JSON</span>
                </button>
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to clear your personal scan history?")) {
                        clearHistory();
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 border border-rose-200 transition-all cursor-pointer"
                  >
                    <Trash2 className="size-3.5 text-rose-500" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-white/80 bg-white/60 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.08)] backdrop-blur-2xl p-4 space-y-1">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <span>Total Scans</span>
                  <FileText className="size-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-black text-slate-900 font-mono">{totalScans}</p>
                <p className="text-[11px] text-slate-500">In your account</p>
              </div>

              <div className="rounded-2xl border border-rose-100 bg-rose-50/50 shadow-[0_10px_30px_-10px_rgba(244,63,94,0.08)] backdrop-blur-2xl p-4 space-y-1">
                <div className="flex items-center justify-between text-rose-700 text-xs font-bold uppercase tracking-wider">
                  <span>Threats Caught</span>
                  <ShieldAlert className="size-4 text-rose-600" />
                </div>
                <p className="text-2xl font-black text-rose-600 font-mono">{ransomwareDetected}</p>
                <p className="text-[11px] text-rose-600/80">Ransomware interdicted</p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.08)] backdrop-blur-2xl p-4 space-y-1">
                <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase tracking-wider">
                  <span>Clean Files</span>
                  <ShieldCheck className="size-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-black text-emerald-600 font-mono">{benignCount}</p>
                <p className="text-[11px] text-emerald-600/80">Verified safe activity</p>
              </div>

              <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 shadow-[0_10px_30px_-10px_rgba(6,182,212,0.08)] backdrop-blur-2xl p-4 space-y-1">
                <div className="flex items-center justify-between text-cyan-700 text-xs font-bold uppercase tracking-wider">
                  <span>Avg AI Confidence</span>
                  <TrendingUp className="size-4 text-cyan-600" />
                </div>
                <p className="text-2xl font-black text-cyan-700 font-mono">
                  {totalScans > 0 ? (avgConfidence * 100).toFixed(1) + "%" : "--"}
                </p>
                <p className="text-[11px] text-cyan-700/80">Ensemble consensus</p>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl border border-white/80 bg-white/60 shadow-xs backdrop-blur-2xl">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by file name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white/90 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-start">
                <span className="text-xs text-slate-500 mr-1 hidden md:inline font-semibold">Filter:</span>
                {(
                  [
                    { id: "all", label: `All (${totalScans})` },
                    { id: "ransomware", label: `Ransomware (${ransomwareDetected})` },
                    { id: "benign", label: `Benign (${benignCount})` },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterType(t.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      filterType === t.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/60"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scan History Table Card */}
            <div className="rounded-[28px] border border-white/80 bg-white/60 shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.9),0_20px_50px_-15px_rgba(99,102,241,0.1)] backdrop-blur-3xl overflow-hidden">
              {history.length === 0 ? (
                <div className="py-16 px-4 text-center space-y-3">
                  <div className="size-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                    <History className="size-7" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900">No Scan Records for this Account</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
                    Upload a code sample or test trace on the analyzer. All scans performed while logged in will appear here.
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all mt-2"
                  >
                    <span>Test a File on Analyzer</span>
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 px-4 text-center text-slate-500 text-xs font-medium">
                  No scans match your search query &quot;{searchTerm}&quot;.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/80 bg-slate-50/60 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-5">Timestamp</th>
                        <th className="py-3.5 px-5">File Name</th>
                        <th className="py-3.5 px-5">Syscalls</th>
                        <th className="py-3.5 px-5">Threat Verdict</th>
                        <th className="py-3.5 px-5">AI Score</th>
                        <th className="py-3.5 px-5">Action Taken</th>
                        <th className="py-3.5 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((record) => {
                        const isRansom = record.label === "ransomware";
                        const dateFormatted = new Date(record.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <tr
                            key={record.id}
                            className="hover:bg-indigo-50/40 transition-colors group"
                          >
                            <td className="py-3.5 px-5 text-slate-500 font-mono whitespace-nowrap">
                              {dateFormatted}
                            </td>
                            <td className="py-3.5 px-5 font-bold text-slate-800 max-w-[220px] truncate">
                              <div className="flex items-center gap-2">
                                <FileCode className="size-4 text-indigo-600 shrink-0" />
                                <span className="truncate" title={record.fileName}>
                                  {record.fileName}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-5 text-slate-600 font-mono">
                              {record.callsCount} calls
                            </td>
                            <td className="py-3.5 px-5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                  isRansom
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}
                              >
                                {isRansom ? (
                                  <>
                                    <ShieldAlert className="size-3.5 text-rose-600" />
                                    Ransomware
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="size-3.5 text-emerald-600" />
                                    Benign
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 font-mono font-black whitespace-nowrap">
                              <span className={isRansom ? "text-rose-600" : "text-emerald-600"}>
                                {(record.confidence * 100).toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-slate-700 whitespace-nowrap">
                              {isRansom && record.earlyCall ? (
                                <span className="text-amber-700 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                                  Interdicted @ Call #{record.earlyCall}
                                </span>
                              ) : isRansom ? (
                                <span className="text-rose-600 font-semibold text-[11px]">Process Terminated</span>
                              ) : (
                                <span className="text-slate-500 font-medium text-[11px]">Clean / Monitored</span>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedRecord(record)}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-indigo-200/60 shadow-2xs"
                                >
                                  <span>Inspect</span>
                                  <ExternalLink className="size-3 text-indigo-600" />
                                </button>
                                <button
                                  onClick={() => deleteScan(record.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete scan"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Inspect Report Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="rounded-3xl border border-white/80 bg-white/95 max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    selectedRecord.label === "ransomware"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {selectedRecord.label === "ransomware" ? "THREAT DETECTED" : "VERIFIED SAFE"}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1 flex items-center gap-2">
                  <FileCode className="size-5 text-indigo-600" />
                  {selectedRecord.fileName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  Scanned on {new Date(selectedRecord.timestamp).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Verdict Stats Grid */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Threat Score</p>
                <p className="text-xl font-mono font-black text-slate-900">
                  {(selectedRecord.score * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Confidence</p>
                <p className="text-xl font-mono font-black text-indigo-600">
                  {(selectedRecord.confidence * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Trace Length</p>
                <p className="text-xl font-mono font-black text-slate-800">
                  {selectedRecord.callsCount} calls
                </p>
              </div>
            </div>

            {/* Behavioral Explanation & Reasons */}
            {selectedRecord.reasons && selectedRecord.reasons.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Primary Behavioral Indicators
                </h4>
                <div className="space-y-2">
                  {selectedRecord.reasons.map((r, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{r.name}</span>
                        {r.lift > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-bold border border-indigo-200/60">
                            +{r.lift.toFixed(1)}σ above normal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">{r.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
