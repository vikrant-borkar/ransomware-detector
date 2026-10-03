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
} from "lucide-react";
import { useHistory, ScanRecord } from "@/lib/history";
import { useAuth } from "@/lib/auth";

export function HistoryBoard() {
  const { history, deleteScan, clearHistory, exportCSV, exportJSON } = useHistory();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "ransomware" | "benign">("all");
  const [selectedRecord, setSelectedRecord] = useState<ScanRecord | null>(null);

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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#302f31] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Audit & Threat Vault
            </span>
            {user && (
              <span className="text-xs text-slate-400">
                Logged in as <strong className="text-slate-200">{user.name}</strong> ({user.role})
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1.5 tracking-tight flex items-center gap-2.5">
            <History className="size-7 text-indigo-400" />
            Personal Scan History & Threat Audit
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Complete historical audit trail of all executable traces, uploaded logs, and system call sequences analyzed by the AI ensemble.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportCSV}
            disabled={history.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Download className="size-3.5 text-indigo-400" />
            Export CSV
          </button>
          <button
            onClick={exportJSON}
            disabled={history.length === 0}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Download className="size-3.5 text-cyan-400" />
            Export JSON
          </button>
          {history.length > 0 && (
            <button
              onClick={() => {
                if (confirm("Are you sure you want to clear your local scan history?")) {
                  clearHistory();
                }
              }}
              className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 border border-rose-500/30 transition-colors cursor-pointer"
            >
              <Trash2 className="size-3.5 text-rose-400" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-[#161618] p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Scans</span>
            <FileText className="size-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">{totalScans}</p>
          <p className="text-[11px] text-slate-500">Archived in local storage</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#161618] p-4 space-y-1">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>Threats Caught</span>
            <ShieldAlert className="size-4 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 font-mono">{ransomwareDetected}</p>
          <p className="text-[11px] text-slate-500">Ransomware attacks interdicted</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#161618] p-4 space-y-1">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Clean Files</span>
            <ShieldCheck className="size-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">{benignCount}</p>
          <p className="text-[11px] text-slate-500">Verified safe activity</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#161618] p-4 space-y-1">
          <div className="flex items-center justify-between text-cyan-400 text-xs font-semibold">
            <span>Avg AI Confidence</span>
            <TrendingUp className="size-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-black text-cyan-400 font-mono">
            {totalScans > 0 ? (avgConfidence * 100).toFixed(1) + "%" : "--"}
          </p>
          <p className="text-[11px] text-slate-500">Multi-model ensemble consensus</p>
        </div>
      </div>

      {/* Search & Filter Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-800 bg-[#161618]">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by file name or trace source..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-700 bg-slate-900 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-start">
          <span className="text-xs text-slate-500 mr-1 hidden md:inline">Filter:</span>
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
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                filterType === t.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scan History Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#161618] shadow-xl overflow-hidden">
        {history.length === 0 ? (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <History className="size-6" />
            </div>
            <h3 className="text-base font-bold text-white">No Scan Records Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Upload a trace or test sample on the main page. All behavioral scans are automatically logged here in your audit ledger.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md mt-2"
            >
              <span>Go to File Analyzer</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-400 text-xs">
            No scans match your search query &quot;{searchTerm}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">File Name / Source</th>
                  <th className="py-3 px-4">Syscalls</th>
                  <th className="py-3 px-4">Threat Verdict</th>
                  <th className="py-3 px-4">AI Score</th>
                  <th className="py-3 px-4">Action Taken</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
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
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap">
                        {dateFormatted}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-200 max-w-[220px] truncate">
                        <div className="flex items-center gap-2">
                          <FileCode className="size-3.5 text-indigo-400 shrink-0" />
                          <span className="truncate" title={record.fileName}>
                            {record.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        {record.callsCount} calls
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isRansom
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {isRansom ? (
                            <>
                              <ShieldAlert className="size-3 text-rose-400" />
                              Ransomware
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="size-3 text-emerald-400" />
                              Benign
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">
                        <span className={isRansom ? "text-rose-400" : "text-emerald-400"}>
                          {(record.confidence * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                        {isRansom && record.earlyCall ? (
                          <span className="text-amber-400 font-mono text-[11px] font-semibold">
                            Interdicted @ Call #{record.earlyCall}
                          </span>
                        ) : isRansom ? (
                          <span className="text-rose-400 text-[11px]">Process Terminated</span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Clean / Monitored</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ExternalLink className="size-3" />
                          </button>
                          <button
                            onClick={() => deleteScan(record.id)}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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

      {/* Inspect Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="rounded-3xl border border-slate-700 bg-[#161618] max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    selectedRecord.label === "ransomware"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {selectedRecord.label === "ransomware" ? "THREAT DETECTED" : "VERIFIED SAFE"}
                </span>
                <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
                  <FileCode className="size-5 text-indigo-400" />
                  {selectedRecord.fileName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  Scanned on {new Date(selectedRecord.timestamp).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Verdict Stats Grid */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Threat Score</p>
                <p className="text-lg font-mono font-black text-white">
                  {(selectedRecord.score * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Confidence</p>
                <p className="text-lg font-mono font-black text-indigo-400">
                  {(selectedRecord.confidence * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Trace Length</p>
                <p className="text-lg font-mono font-black text-slate-200">
                  {selectedRecord.callsCount} calls
                </p>
              </div>
            </div>

            {/* Behavioral Explanation & Reasons */}
            {selectedRecord.reasons && selectedRecord.reasons.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Primary Behavioral Indicators
                </h4>
                <div className="space-y-2">
                  {selectedRecord.reasons.map((r, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{r.name}</span>
                        {r.lift > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                            +{r.lift.toFixed(1)}σ above baseline
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{r.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
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
