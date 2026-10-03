"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  KeyRound,
} from "lucide-react";
import { useAuth, User } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";

export function AuthView() {
  const router = useRouter();
  const { login } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<User["role"]>("Security Analyst");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      login(email, name || undefined, role);
      setLoading(false);
      router.push("/history");
    }, 400);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/70 via-slate-50 to-cyan-50/70 text-slate-900 font-sans flex flex-col justify-between relative overflow-hidden">
      {/* Glow Background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-24 left-[10%] w-[580px] h-[580px] bg-gradient-to-tr from-violet-500/35 via-indigo-400/30 to-fuchsia-400/25 rounded-full blur-[110px] animate-pulse duration-1000" />
        <div className="absolute top-[10%] -right-20 w-[600px] h-[600px] bg-gradient-to-bl from-cyan-400/35 via-sky-400/30 to-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute -bottom-20 left-1/3 w-[550px] h-[550px] bg-gradient-to-tr from-pink-400/25 via-rose-300/25 to-amber-300/20 rounded-full blur-[110px]" />
      </div>

      {/* Shared Header */}
      <AppHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {mode === "signin" ? (
                <>
                  Sign In to <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">Detector</span>
                </>
              ) : (
                <>
                  Create Your <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 bg-clip-text text-transparent">Account</span>
                </>
              )}
            </h1>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              {mode === "signin"
                ? "Enter your credentials to access your personal scan history."
                : "Register a new analyst account to track and audit your scans."}
            </p>
          </div>

          {/* Auth Glass Card */}
          <div className="rounded-[32px] border border-white/80 bg-white/60 shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.9),0_20px_50px_-15px_rgba(99,102,241,0.15)] backdrop-blur-3xl p-7 sm:p-9">
            
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl mb-6 border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === "signin"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === "signup"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <KeyRound className="size-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Full Name</label>
                    <div className="relative">
                      <UserIcon className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. Vikrant Borkar"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Role / Designation</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as User["role"])}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-900 font-medium"
                    >
                      <option value="Security Analyst">Security Analyst</option>
                      <option value="SOC Operator">SOC Operator</option>
                      <option value="Threat Researcher">Threat Researcher</option>
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    placeholder="analyst@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-900 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-900 font-medium"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50 mt-3"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>{mode === "signin" ? "Sign In" : "Register Account"}</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer note */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <Link
                href="/"
                className="text-xs text-slate-500 hover:text-indigo-600 font-semibold transition-colors"
              >
                ← Back to File Analyzer
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
