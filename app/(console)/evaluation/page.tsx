import { EvaluationBoard } from "@/components/evaluation-board";

export default function EvaluationPage() {
  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div>
        <h1 className="text-[28px] font-bold" style={{ color: "#e5e2e3" }}>Evaluation</h1>
        <p className="text-[13px] mt-1" style={{ color: "#8f8fa1" }}>
          How the models score known and previously unseen ransomware.
        </p>
      </div>
      <EvaluationBoard />
    </div>
  );
}
