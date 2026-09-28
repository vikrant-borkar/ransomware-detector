import { AlertsBoard } from "@/components/alerts-board";

export default function AlertsPage() {
  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 className="text-[28px] font-bold" style={{ color: "#e5e2e3" }}>Alerts</h1>
        <p className="text-[13px] mt-1" style={{ color: "#8f8fa1" }}>
          Raised when a sequence looks like ransomware, so the program can be stopped.
        </p>
      </div>
      <AlertsBoard />
    </div>
  );
}
