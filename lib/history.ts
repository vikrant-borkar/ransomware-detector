"use client";

import { useEffect, useState, useCallback } from "react";
import type { Score } from "@/lib/types";
import { api } from "@/lib/api";

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

const HISTORY_CACHE_KEY = "brd_scan_history_cache_v3";
const PENDING_SCANS_KEY = "brd_pending_scans_v1";

export function getCachedHistory(userEmail?: string | null): ScanRecord[] {
  if (!userEmail || typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${HISTORY_CACHE_KEY}_${userEmail.toLowerCase()}`);
    if (!raw) return [];
    return JSON.parse(raw) as ScanRecord[];
  } catch {
    return [];
  }
}

export function setCachedHistory(userEmail: string, records: ScanRecord[]): void {
  if (!userEmail || typeof window === "undefined") return;
  try {
    localStorage.setItem(`${HISTORY_CACHE_KEY}_${userEmail.toLowerCase()}`, JSON.stringify(records));
  } catch {
    /* ignore storage quota errors */
  }
}

export function getPendingScans(): Array<Omit<ScanRecord, "id" | "timestamp" | "userEmail">> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PENDING_SCANS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addPendingScan(record: Omit<ScanRecord, "id" | "timestamp" | "userEmail">): void {
  if (typeof window === "undefined") return;
  try {
    const pending = getPendingScans();
    pending.unshift(record);
    localStorage.setItem(PENDING_SCANS_KEY, JSON.stringify(pending.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export function clearPendingScans(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_SCANS_KEY);
  } catch {
    /* ignore */
  }
}

export async function syncPendingScans(userEmail: string): Promise<void> {
  if (!userEmail || typeof window === "undefined") return;
  const pending = getPendingScans();
  if (pending.length === 0) return;

  clearPendingScans();
  for (const scan of pending) {
    try {
      await saveScanRecord({
        ...scan,
        userEmail,
      });
    } catch (err) {
      console.error("Failed to sync pending scan to account:", err);
    }
  }
}

export async function fetchServerHistory(userEmail: string): Promise<ScanRecord[]> {
  if (!userEmail) return [];
  try {
    const res = await api<{ records: ScanRecord[] }>(
      `/api/history?userEmail=${encodeURIComponent(userEmail.trim())}`
    );
    const records = res.records || [];
    setCachedHistory(userEmail, records);
    return records;
  } catch (err) {
    console.warn("Failed to fetch server history, falling back to cache:", err);
    return getCachedHistory(userEmail);
  }
}

export async function saveScanRecord(
  record: Omit<ScanRecord, "id" | "timestamp" | "userEmail"> & { userEmail?: string | null }
): Promise<ScanRecord | null> {
  // If no user is logged in, store as pending scan so it links upon login
  if (!record.userEmail) {
    addPendingScan(record);
    return null;
  }

  const userEmail = record.userEmail.trim();
  const tempRecord: ScanRecord = {
    ...record,
    userEmail,
    id: `scan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };

  // Update local cache optimistically
  if (typeof window !== "undefined") {
    const cached = getCachedHistory(userEmail);
    const updated = [tempRecord, ...cached.filter((s) => s.id !== tempRecord.id)].slice(0, 300);
    setCachedHistory(userEmail, updated);
    window.dispatchEvent(new Event("history_change"));
  }

  // Persist to backend database
  try {
    const res = await api<{ ok: boolean; record: ScanRecord }>("/api/history", {
      method: "POST",
      body: JSON.stringify({
        ...tempRecord,
        userEmail,
      }),
    });
    if (res.ok && res.record) {
      if (typeof window !== "undefined") {
        const cached = getCachedHistory(userEmail);
        const replaced = cached.map((c) => (c.id === tempRecord.id ? res.record : c));
        setCachedHistory(userEmail, replaced);
        window.dispatchEvent(new Event("history_change"));
      }
      return res.record;
    }
  } catch (err) {
    console.error("Failed to persist scan record to database:", err);
  }

  return tempRecord;
}

export async function deleteScanRecord(id: string, userEmail?: string | null): Promise<void> {
  if (!userEmail) return;
  const email = userEmail.trim();

  // Optimistically remove from cache
  if (typeof window !== "undefined") {
    const cached = getCachedHistory(email);
    const updated = cached.filter((s) => s.id !== id);
    setCachedHistory(email, updated);
    window.dispatchEvent(new Event("history_change"));
  }

  try {
    await api(`/api/history/${encodeURIComponent(id)}?userEmail=${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Failed to delete scan on server:", err);
  }
}

export async function clearUserHistory(userEmail?: string | null): Promise<void> {
  if (!userEmail) return;
  const email = userEmail.trim();

  // Optimistically clear cache
  if (typeof window !== "undefined") {
    setCachedHistory(email, []);
    window.dispatchEvent(new Event("history_change"));
  }

  try {
    await api(`/api/history?userEmail=${encodeURIComponent(email)}`, {
      method: "DELETE",
    });
  } catch (err) {
    console.error("Failed to clear history on server:", err);
  }
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

  const reload = useCallback(async () => {
    if (!userEmail) {
      setHistory([]);
      setLoaded(true);
      return;
    }
    // Set cached first for speed
    const cached = getCachedHistory(userEmail);
    if (cached.length > 0) {
      setHistory(cached);
    }
    // Then fetch latest from server
    const serverRecords = await fetchServerHistory(userEmail);
    setHistory(serverRecords);
    setLoaded(true);
  }, [userEmail]);

  useEffect(() => {
    reload();

    function handleChange() {
      if (userEmail) {
        setHistory(getCachedHistory(userEmail));
      }
    }

    function handleFocus() {
      if (userEmail) {
        reload();
      }
    }

    window.addEventListener("history_change", handleChange);
    window.addEventListener("storage", handleChange);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("history_change", handleChange);
      window.removeEventListener("storage", handleChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [userEmail, reload]);

  return {
    history,
    loaded,
    saveScan: saveScanRecord,
    deleteScan: (id: string) => deleteScanRecord(id, userEmail),
    clearHistory: () => clearUserHistory(userEmail),
    exportJSON: () => exportHistoryJSON(history, userEmail || undefined),
    exportCSV: () => exportHistoryCSV(history, userEmail || undefined),
    reloadHistory: reload,
  };
}
