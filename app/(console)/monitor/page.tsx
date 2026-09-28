import { MonitorConsole } from "@/components/monitor-console";

export default function MonitorPage() {
  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 className="text-[28px] font-bold" style={{ color: "#e5e2e3" }}>Monitor</h1>
        <p className="text-[13px] mt-1" style={{ color: "#8f8fa1" }}>
          Monitor system calls from a running program, or score a saved sequence.
        </p>
      </div>
      <MonitorConsole />
    </div>
  );
}
