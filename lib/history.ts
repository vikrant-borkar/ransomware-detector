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
  userEmail: string; // Bound to user account
  preview?: string;
  sequence?: string[];
  fullResult?: Score;
};

const HISTORY_KEY = "brd_scan_history_v2";

export function getAllStoredHistory(): ScanRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ScanRecord[];
  } catch {
    return [];
  }
}

export function getUserStoredHistory(userEmail?: string | null): ScanRecord[] {
  if (!userEmail || typeof window === "undefined") return [];
  const all = getAllStoredHistory();
  return all.filter((s) => s.userEmail?.toLowerCase() === userEmail.toLowerCase());
}

export function saveScanRecord(
  record: Omit<ScanRecord, "id" | "timestamp" | "userEmail"> & { userEmail?: string | null }
): ScanRecord | null {
  // If no user is logged in, do not save to guest history
  if (!record.userEmail) {
    return null;
  }

  const newRecord: ScanRecord = {
    ...record,
    userEmail: record.userEmail,
    id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    const existing = getAllStoredHistory();
    const updated = [newRecord, ...existing.filter((s) => s.id !== newRecord.id)].slice(0, 300);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("history_change"));
  }

  return newRecord;
}

export function deleteScanRecord(id: string): void {
  if (typeof window === "undefined") return;
  const existing = getAllStoredHistory();
  const updated = existing.filter((s) => s.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("history_change"));
}

export function clearUserHistory(userEmail?: string | null): void {
  if (!userEmail || typeof window === "undefined") return;
  const existing = getAllStoredHistory();
  // Keep records belonging to other users, remove this user's records
  const updated = existing.filter((s) => s.userEmail?.toLowerCase() !== userEmail.toLowerCase());
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("history_change"));
}

export function exportHistoryJSON(records: ScanRecord[], userEmail?: string): void {
  const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const username = (userEmail || "user").split("@")[0];
  a.download = `threat_scan_history_${username}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportHistoryCSV(records: ScanRecord[], userEmail?: string): void {
  const headers = ["ID", "UserEmail", "Timestamp", "FileName", "Verdict", "ThreatScore", "Confidence", "Syscalls", "InterdictedCall", "AlertTriggered"];
  const rows = records.map((r) => [
    r.id,
    `"${r.userEmail || ""}"`,
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
  const username = (userEmail || "user").split("@")[0];
  a.download = `threat_scan_history_${username}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function useHistory(userEmail?: string | null) {
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setHistory(getUserStoredHistory(userEmail));
    setLoaded(true);

    function handleChange() {
      setHistory(getUserStoredHistory(userEmail));
    }

    window.addEventListener("history_change", handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener("history_change", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, [userEmail]);

  return {
    history,
    loaded,
    saveScan: saveScanRecord,
    deleteScan: deleteScanRecord,
    clearHistory: () => clearUserHistory(userEmail),
    exportJSON: () => exportHistoryJSON(history, userEmail || undefined),
    exportCSV: () => exportHistoryCSV(history, userEmail || undefined),
  };
}
