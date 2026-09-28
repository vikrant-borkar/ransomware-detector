"use client";

import { useEffect, useState } from "react";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FlowChart } from "@/components/flow-chart";
import { api, pct } from "@/lib/api";
import type { Scenario, Score, SessionView } from "@/lib/types";

const VOTE_LABELS: Array<[keyof Score["votes"], string]> = [
  ["gradient_boosting", "Gradient boosting"],
  ["random_forest", "Random forest"],
  ["svm", "Linear SVM"],
  ["mlp", "Sequence MLP"],
];

const STAGE_NODE: Record<string, string> = {
  capture: "capture",
  sequence: "sequence",
  continue: "continue",
  decision: "decision",
  alert: "alert",
  stop: "end",
  done: "continue",
  detect: "detect",
};

export function MonitorConsole() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trace, setTrace] = useState("Open File → Read File → Write File → Close → Open File → Read File → Write File → Delete File");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [view, setView] = useState<SessionView | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    api<{ scenarios: Scenario[] }>("/api/scenarios")
      .then((body) => setScenarios(body.scenarios))
      .catch((error: Error) => setLoadError(error.message));
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let stopped = false;
    const tick = async () => {
      try {
        const next = await api<SessionView>(`/api/monitor/${sessionId}`);
        if (!stopped) {
          setView(next);
          if (["benign", "contained", "stopped", "error"].includes(next.status) && next.stage !== "capture") {
            stopped = true;
          }
        }
      } catch (error) {
        if (!stopped) setActionError(error instanceof Error ? error.message : "Monitor failed.");
      }
    };
    void tick();
    const timer = window.setInterval(() => {
      if (!stopped) void tick();
    }, 400);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [sessionId]);

  async function start(scenario: string) {
    setBusy(true);
    setActionError(null);
    try {
      if (sessionId) {
        await api(`/api/monitor/${sessionId}/stop`, { method: "POST" }).catch(() => undefined);
      }
      const next = await api<SessionView>("/api/monitor", {
        method: "POST",
        body: JSON.stringify({ scenario }),
      });
      setSessionId(next.id ?? null);
      setView(next);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not start monitoring.");
    } finally {
      setBusy(false);
    }
  }

  async function analyzePaste() {
    setBusy(true);
    setActionError(null);
    setSessionId(null);
    try {
      const body = await api<{ sequence: string[]; result: Score }>("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ trace, source: "Pasted sequence" }),
      });
      const alert = body.result.alert;
      setView({
        title: "Pasted sequence",
        kind: body.result.label,
        mode: "analyze",
        status: alert ? "alert" : "benign",
        stage: alert ? "alert" : "done",
        lit: alert
          ? ["start", "monitor", "capture", "sequence", "decision", "detect", "alert"]
          : ["start", "monitor", "capture", "sequence", "decision", "continue"],
        sequence: body.sequence.slice(-80),
        shown: Math.min(80, body.sequence.length),
        cursor: body.sequence.length,
        total: body.sequence.length,
        result: body.result,
        contained: false,
        message: body.result.response,
        pid: null,
        error: null,
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not check that sequence.");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (!sessionId) return;
    setBusy(true);
    try {
      const next = await api<SessionView>(`/api/monitor/${sessionId}/stop`, { method: "POST" });
      setView(next);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not stop the process.");
    } finally {
      setBusy(false);
    }
  }

  const live = scenarios.filter((item) => item.mode === "live");
  const replay = scenarios.filter((item) => item.mode === "replay");
  const running = view && ["running", "alert"].includes(view.status) && view.mode !== "analyze";

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        {loadError && (
          <p className="rounded-lg border border-alert/40 bg-alert/10 px-3 py-2 text-sm text-alert">
            Detector API is not responding. Start it with the command in the README, then reload. {loadError}
          </p>
        )}
        <section className="space-y-2">
          <h2 className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Running programs</h2>
          {live.map((item) => (
            <ScenarioButton key={item.id} item={item} disabled={busy} onStart={() => start(item.id)} />
          ))}
        </section>
        <section className="space-y-2">
          <h2 className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Recorded sequences</h2>
          {replay.map((item) => (
            <ScenarioButton key={item.id} item={item} disabled={busy} onStart={() => start(item.id)} />
          ))}
        </section>
        <section className="space-y-2 rounded-xl border border-border bg-card/70 p-3">
          <h2 className="text-sm font-medium">System call sequence</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Example: Open File → Read File → Write File → Close → Open File → Read File → Write File → Delete File
          </p>
          <Textarea
            value={trace}
            onChange={(event) => setTrace(event.target.value)}
            className="min-h-28 font-mono text-xs"
            spellCheck={false}
          />
          <Button type="button" onClick={() => void analyzePaste()} disabled={busy}>
            Check sequence
          </Button>
        </section>
        {actionError && <p className="text-sm text-alert">{actionError}</p>}
      </div>

      <div className="space-y-4">
        {!view && (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-sm text-muted-foreground">
            Start a running program or paste a sequence. Nothing is monitored until you start it.
          </div>
        )}
        {view && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl">{view.title}</h2>
                  <StatusBadge status={view.status} />
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{view.message}</p>
              </div>
              {running && (
                <Button type="button" variant="destructive" onClick={() => void stop()} disabled={busy}>
                  <Square />
                  Stop process
                </Button>
              )}
            </div>
            <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
              <div className="rounded-xl border border-border bg-card/60 p-4">
                <FlowChart lit={view.lit} current={STAGE_NODE[view.stage] ?? view.stage} live />
              </div>
              <div className="space-y-4">
                <Verdict result={view.result} cursor={view.cursor} total={view.total} contained={view.contained} />
                <CallTape sequence={view.sequence} cursor={view.cursor} />
                {view.result && <WindowBars windows={view.result.windows} threshold={view.result.threshold} />}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ScenarioButton({
  item,
  disabled,
  onStart,
}: {
  item: Scenario;
  disabled: boolean;
  onStart: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onStart}
      className="w-full rounded-xl border border-border bg-card/70 px-3 py-3 text-left transition-colors hover:border-sand/50 disabled:opacity-60"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{item.title}</span>
        <Play className="size-3.5 text-sand" />
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.summary}</p>
      <div className="mt-2 flex gap-1.5">
        <Badge variant="outline">{item.mode === "live" ? "live" : "recorded"}</Badge>
        <Badge variant={item.kind === "ransomware" ? "destructive" : "secondary"}>{item.kind}</Badge>
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "contained" || status === "alert"
      ? "border-alert/50 text-alert"
      : status === "benign" || status === "done"
        ? "border-benign/50 text-benign"
        : "border-border text-muted-foreground";
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs tracking-wide uppercase ${tone}`}>{status}</span>
  );
}

function Verdict({
  result,
  cursor,
  total,
  contained,
}: {
  result: Score | null;
  cursor: number;
  total: number;
  contained: boolean;
}) {
  if (!result) {
    return (
      <div className="rounded-xl border border-border bg-card/70 px-4 py-4 text-sm text-muted-foreground">
        Sequence so far: {cursor} call{cursor === 1 ? "" : "s"}. Scoring starts at 8.
      </div>
    );
  }
  const ransomware = result.label === "ransomware";
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase">Verdict</p>
          <p className={`font-display text-3xl ${ransomware ? "text-alert" : "text-benign"}`}>
            {ransomware ? "Ransomware behavior" : "Ordinary file activity"}
          </p>
        </div>
        <p className="font-mono text-2xl">{pct(result.confidence)}</p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Calls scored: {cursor}
        {total > cursor ? ` of ${total}` : ""}. Alert line at {pct(result.threshold)}.
        {contained ? " Containment recorded." : ""}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {VOTE_LABELS.map(([key, label]) => (
          <Meter key={key} label={label} value={result.votes[key]} />
        ))}
      </div>
      {result.reasons.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {result.reasons.map((reason) => (
            <li key={reason.name}>
              <span className="text-sand">{reason.name}.</span>{" "}
              <span className="text-muted-foreground">{reason.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono">{pct(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-sand" style={{ width: `${Math.max(2, value * 100)}%` }} />
      </div>
    </div>
  );
}

function CallTape({ sequence, cursor }: { sequence: string[]; cursor: number }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4">
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>System call sequence</span>
        <span className="font-mono">{cursor} calls</span>
      </div>
      {sequence.length === 0 ? (
        <p className="text-sm text-muted-foreground">Waiting for the first file call.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {sequence.map((call, index) => (
            <span key={`${call}-${index}`} className={`font-mono text-xs ${tone(call)}`}>
              {call}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        <span className="text-sand">write</span> · <span className="text-alert">rename / delete</span> · other calls
        stay quiet.
      </p>
    </div>
  );
}

function tone(call: string) {
  if (["write", "pwrite", "writev", "fsync"].includes(call)) return "text-sand";
  if (["rename", "unlink", "link", "getdents"].includes(call)) return "text-alert";
  return "text-muted-foreground";
}

function WindowBars({
  windows,
  threshold,
}: {
  windows: Score["windows"];
  threshold: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-4">
      <p className="mb-3 text-xs tracking-[0.16em] text-muted-foreground uppercase">Sliding windows</p>
      <div className="flex h-24 items-end gap-1">
        {windows.map((window) => (
          <div key={window.index} className="flex h-full flex-1 flex-col justify-end">
            <div
              className={window.score >= threshold ? "bg-alert" : "bg-benign/70"}
              style={{ height: `${Math.max(6, window.score * 100)}%` }}
              title={`Calls ${window.start}–${window.end}: ${pct(window.score)}`}
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Each bar is a {windows[0] ? `${windows[0].end - windows[0].start}` : "36"}-call window. Terracotta crosses the
        alert line.
      </p>
    </div>
  );
}
