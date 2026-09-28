import { cn } from "cn";

const STEPS = [
  { id: "start", label: "Start", shape: "pill" },
  { id: "monitor", label: "Monitor running process", shape: "box" },
  { id: "capture", label: "Capture system calls", shape: "box" },
  { id: "sequence", label: "Generate system call sequence", shape: "box" },
  { id: "decision", label: "Suspicious behavior?", shape: "diamond" },
] as const;

export function FlowChart({
  lit = [],
  current,
  live = false,
}: {
  lit?: string[];
  current?: string;
  live?: boolean;
}) {
  return (
    <div className="space-y-2">
      {STEPS.map((step, index) => (
        <div key={step.id}>
          <FlowNode id={step.id} label={step.label} shape={step.shape} lit={lit} current={current} live={live} />
          {index < STEPS.length - 1 && <Rail />}
        </div>
      ))}
      <div className="grid gap-2 sm:grid-cols-2">
        <Branch
          title="No"
          hint="Continue monitoring"
          node="continue"
          lit={lit}
          current={current}
          live={live}
          tone="benign"
        />
        <Branch
          title="Yes"
          hint="Detect ransomware"
          node="detect"
          lit={lit}
          current={current}
          live={live}
          tone="alert"
        />
      </div>
      <Rail />
      <FlowNode id="alert" label="Alert user and stop process" shape="box" lit={lit} current={current} live={live} />
      <Rail />
      <FlowNode id="end" label="End" shape="pill" lit={lit} current={current} live={live} />
      <p className="pt-1 text-xs text-muted-foreground">
        A clear sequence returns to monitoring. A suspicious one ends at the alert.
      </p>
    </div>
  );
}

function Rail() {
  return <div className="mx-auto h-3 w-px bg-border" />;
}

function FlowNode({
  id,
  label,
  shape,
  lit,
  current,
  live,
}: {
  id: string;
  label: string;
  shape: "pill" | "box" | "diamond";
  lit: string[];
  current?: string;
  live: boolean;
}) {
  const active = current === id;
  const on = lit.includes(id);
  const alertTone = id === "alert" || id === "end";
  return (
    <div
      className={cn(
        "mx-auto grid min-h-11 max-w-sm place-items-center border px-3 py-2 text-center text-sm",
        shape === "pill" ? "rounded-full" : "rounded-lg",
        !live && "border-border bg-card/80",
        live && !on && !active && "border-border/60 bg-card/40 text-muted-foreground opacity-50",
        live && on && !active && "border-sand/40 bg-card text-foreground",
        active && !alertTone && "border-sand bg-sand/15 text-sand",
        active && alertTone && "border-alert bg-alert/15 text-alert",
        id === "decision" && "max-w-[220px] rounded-md"
      )}
    >
      {label}
    </div>
  );
}

function Branch({
  title,
  hint,
  node,
  lit,
  current,
  live,
  tone,
}: {
  title: string;
  hint: string;
  node: string;
  lit: string[];
  current?: string;
  live: boolean;
  tone: "benign" | "alert";
}) {
  const active = current === node;
  const on = lit.includes(node);
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-3",
        !live && "border-border bg-card/80",
        live && !on && !active && "border-border/60 opacity-50",
        live && on && tone === "benign" && "border-benign/50 bg-benign/10",
        live && on && tone === "alert" && "border-alert/50 bg-alert/10",
        active && tone === "benign" && "border-benign bg-benign/15",
        active && tone === "alert" && "border-alert bg-alert/15"
      )}
    >
      <p className={cn("text-xs tracking-wide uppercase", tone === "benign" ? "text-benign" : "text-alert")}>
        {title}
      </p>
      <p className="mt-1 text-sm">{hint}</p>
    </div>
  );
}
