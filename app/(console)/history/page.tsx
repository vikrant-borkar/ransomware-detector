import { HistoryBoard } from "@/components/history-board";

export const metadata = {
  title: "Scan History & Threat Audit | Ransomware Sentinel",
  description: "Personal scan history, threat detection logs, and audit reports for behavioral analysis.",
};

export default function HistoryPage() {
  return <HistoryBoard />;
}
