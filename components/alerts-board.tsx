"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api, pct } from "@/lib/api";
import type { AlertRow } from "@/lib/types";

export function AlertsBoard() {
  const [alerts, setAlerts] = useState<AlertRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ alerts: AlertRow[] }>("/api/alerts")
      .then((body) => {
        setAlerts(body.alerts);
        setError(null);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 2000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function clear() {
    await api("/api/alerts", { method: "DELETE" });
    load();
  }

  if (error) {
    return (
      <p className="rounded-lg border border-alert/40 bg-alert/10 px-3 py-3 text-sm text-alert">
        Could not load alerts. {error}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          An alert means the sequence looked like ransomware and the rest of the activity was stopped.
        </p>
        <Button type="button" variant="outline" onClick={() => void clear()} disabled={!alerts?.length}>
          Clear
        </Button>
      </div>
      {alerts && alerts.length === 0 && (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-sm text-muted-foreground">
          No alerts yet. Check a sequence on the Monitor page.
        </div>
      )}
      <ul className="space-y-3">
        {alerts?.map((alert) => (
          <li key={alert.id} className="rounded-xl border border-border bg-card/70 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl">{alert.source}</h2>
              <time className="font-mono text-xs text-muted-foreground">{alert.time}</time>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{alert.summary}</p>
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <div>
                Score <span className="font-mono text-foreground">{pct(alert.score)}</span>
              </div>
              <div>
                Calls <span className="font-mono text-foreground">{alert.length}</span>
              </div>
              <div>
                Early call{" "}
                <span className="font-mono text-foreground">{alert.early_call ?? "—"}</span>
              </div>
              <div>{alert.contained ? "Contained" : "Alert only"}</div>
              <div className="uppercase">{alert.mode}</div>
            </dl>
            {alert.reasons.length > 0 && (
              <p className="mt-2 text-sm text-sand">{alert.reasons.map((reason) => reason.name).join(" · ")}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
