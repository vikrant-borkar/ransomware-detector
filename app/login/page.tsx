import { AuthView } from "@/components/auth-view";

export const metadata = {
  title: "Security Portal Sign In | Ransomware Detector",
  description: "Sign in to access personalized threat scan history, save audit logs, and export reports.",
};

export default function LoginPage() {
  return <AuthView />;
}
