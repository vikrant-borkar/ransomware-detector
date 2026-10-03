"use client";

import { useEffect, useState } from "react";
import type { Score } from "@/lib/types";

export type ScanRecord = {
  id: string;
  timestamp: string;
  fileName: string;
  source: string;
  callsCount: number;
  label: "ransomware" | "benign";
  alert: boolean;
  score: number;
  confidence: number;
  earlyCall: number | null;
  reasons: Array<{ name: string; detail: string; value: number; lift: number }>;
  userEmail?: string;
  preview?: string;
  sequence?: string[];
  fullResult?: Score;
};

const HISTORY_KEY = "brd_scan_history";

export function getStoredHistory(): ScanRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ScanRecord[];
  } catch {
    return [];
  }
}

export function saveScanRecord(record: Omit<ScanRecord, "id" | "timestamp">): ScanRecord {
  const newRecord: ScanRecord = {
    ...record,
    id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const existing = getStoredHistory();
    // Keep last 100 scans
    const updated = [newRecord, ...existing.filter((s) => s.id !== newRecord.id)].slice(0, 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("history_change"));
  }

  return newRecord;
}

export function deleteScanRecord(id: string): void {
  if (typeof window === "undefined") return;
  const existing = getStoredHistory();
  const updated = existing.filter((s) => s.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("history_change"));
}

export function clearAllHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
  window.dispatchEvent(new Event("history_change"));
}

export function exportHistoryJSON(records: ScanRecord[]): void {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `threat_scan_history_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportHistoryCSV(records: ScanRecord[]): void {
  const headers = ["ID", "Timestamp", "FileName", "Verdict", "ThreatScore", "Confidence", "Syscalls", "InterdictedCall", "AlertTriggered"];
  const rows = records.map((r) => [
    r.id,
    r.timestamp,
    `"${r.fileName.replace(/"/g, '""')}"`,
    r.label,
    (r.score * 100).toFixed(1) + "%",
    (r.confidence * 100).toFixed(1) + "%",
    r.callsCount,
    r.earlyCall ?? "N/A",
    r.alert ? "YES" : "NO",
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `threat_scan_history_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function useHistory() {
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setHistory(getStoredHistory());
    setLoaded(true);

    function handleChange() {
      setHistory(getStoredHistory());
    }

    window.addEventListener("history_change", handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener("history_change", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  return {
    history,
    loaded,
    saveScan: saveScanRecord,
    deleteScan: deleteScanRecord,
    clearHistory: clearAllHistory,
    exportJSON: () => exportHistoryJSON(history),
    exportCSV: () => exportHistoryCSV(history),
  };
}
