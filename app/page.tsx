import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Behavioral ransomware detection",
  description: "Detect ransomware from a system call sequence and alert before files are encrypted.",
};

export default function HomePage() {
  return <LandingPage />;
}
