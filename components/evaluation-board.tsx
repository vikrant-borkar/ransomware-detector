"use client";

import { useEffect, useState } from "react";
import { api, pct } from "@/lib/api";
import type { Metrics } from "@/lib/types";

const FAMILY_LABEL: Record<string, string> = {
  editor: "Text editor",
  compiler: "Compiler",
  service: "Service loop",
  backup: "Backup job",
  "temp-cleanup": "Temp file cleanup",
  installer: "Installer",
  "sync-client": "Sync client",
  "crypto-loop": "Crypto-loop",
  "fsync-locker": "Fsync locker",
  "shadow-link": "Shadow link",
  "slow-start": "Slow-start locker",
  "low-and-slow": "Low-and-slow",
  "writev-swap": "Unseen writev family",
};

export function EvaluationBoard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Metrics>("/api/metrics")
      .then(setMetrics)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  if (error) {
    return (
      <p className="rounded-lg border border-alert/40 bg-alert/10 px-3 py-3 text-sm text-alert">
        Could not load the evaluation. The detector API is not responding. {error}
      </p>
    );
  }
  if (!metrics) {
    return <p className="text-sm text-muted-foreground">Scoring the test sequences…</p>;
  }

  const ensemble = metrics.models.find((model) => model.id === "ensemble") ?? metrics.models[0];
  const maxWeight = Math.max(...metrics.importance.map((row) => row.weight), 0.01);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Accuracy" value={pct(ensemble.accuracy)} note="Known and unseen sequences" />
        <Stat label="Precision" value={pct(ensemble.precision)} note="Alerts that were actually ransomware" />
        <Stat label="Recall" value={pct(ensemble.recall)} note="Ransomware sequences that were caught" />
        <Stat label="False alarms" value={pct(metrics.false_positive_rate)} note="Normal activity marked suspicious" />
      </div>

      <section className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Model</th>
              <th className="px-3 py-2 font-medium">Accuracy</th>
              <th className="px-3 py-2 font-medium">Precision</th>
              <th className="px-3 py-2 font-medium">Recall</th>
              <th className="px-3 py-2 font-medium">F1</th>
            </tr>
          </thead>
          <tbody>
            {metrics.models.map((model) => (
              <tr key={model.id} className="border-t border-border">
                <td className="px-3 py-3">
                  <p className="font-medium">{model.name}</p>
                  <p className="mt-0.5 max-w-md text-xs text-muted-foreground">{model.role}</p>
                </td>
                <td className="px-3 py-3 font-mono">{pct(model.accuracy)}</td>
                <td className="px-3 py-3 font-mono">{pct(model.precision)}</td>
                <td className="px-3 py-3 font-mono">{pct(model.recall)}</td>
                <td className="px-3 py-3 font-mono">{pct(model.f1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card/70 p-4">
          <h2 className="font-display text-xl">Confusion matrix</h2>
          <p className="mt-1 text-sm text-muted-foreground">Held-out split of the synthetic families. Not a field trial.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MatrixCell title="True benign" value={metrics.confusion.tn} tone="benign" />
            <MatrixCell title="False alarm" value={metrics.confusion.fp} tone="alert" />
            <MatrixCell title="Missed" value={metrics.confusion.fn} tone="alert" />
            <MatrixCell title="True ransomware" value={metrics.confusion.tp} tone="benign" />
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card/70 p-4">
          <h2 className="font-display text-xl">What the model uses</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rename, delete, and the write–rename–delete cycle carry the decision.
          </p>
          <ul className="mt-4 space-y-2">
            {metrics.importance.map((row) => (
              <li key={row.id}>
                <div className="mb-1 flex justify-between gap-3 text-xs">
                  <span>{row.name}</span>
                  <span className="font-mono text-muted-foreground">{row.weight.toFixed(3)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-sand" style={{ width: `${(row.weight / maxWeight) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card/70 p-4">
        <h2 className="font-display text-xl">Families</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Normal programs such as an editor or a backup separate cleanly from ransomware. Mistakes sit where a
          program both reads and rewrites files. One ransomware pattern was never used in training and is still
          caught from the same write, rename, and delete behavior. {metrics.unseen.note} Recall on that pattern: {pct(metrics.unseen.recall)}.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="py-2 pr-3 font-medium">Family</th>
                <th className="py-2 pr-3 font-medium">Kind</th>
                <th className="py-2 pr-3 font-medium">Sequences</th>
                <th className="py-2 font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {metrics.families.map((row) => (
                <tr key={row.family} className="border-t border-border">
                  <td className="py-2 pr-3">
                    {FAMILY_LABEL[row.family] ?? row.family}
                    {row.held_out ? " · held out" : ""}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{row.kind}</td>
                  <td className="py-2 pr-3 font-mono">{row.samples}</td>
                  <td className="py-2 font-mono">{pct(row.accuracy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Training set: {metrics.dataset.known} sequences ({metrics.dataset.benign} normal,{" "}
          {metrics.dataset.ransomware} ransomware). Test set: {metrics.dataset.test}. Window of {metrics.window}{" "}
          calls, step {metrics.step}.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4">
      <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
      <p className="font-display mt-2 text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function MatrixCell({ title, value, tone }: { title: string; value: number; tone: "benign" | "alert" }) {
  return (
    <div className={`rounded-lg border px-3 py-3 ${tone === "benign" ? "border-benign/30" : "border-alert/30"}`}>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="font-display text-2xl">{value}</p>
    </div>
  );
}
