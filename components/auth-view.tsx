"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  Shield,
  KeyRound,
} from "lucide-react";
import { useAuth, User } from "@/lib/auth";

export function AuthView() {
  const router = useRouter();
  const { login, loginAsDemo } = useAuth();

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
      setError("Please enter a valid work or academic email address.");
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

  function handleDemoClick(index: number) {
    loginAsDemo(index);
    router.push("/history");
  }

  return (
    <div className="min-h-[88vh] flex flex-col items-center justify-center p-4">
      {/* Glow Background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-500/20 to-purple-500/15 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-gradient-to-bl from-cyan-500/20 to-blue-500/15 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <ShieldCheck className="size-6" />
            </div>
            <span className="font-black text-2xl tracking-tight text-slate-900">
              Ransomware <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">Detector</span>
            </span>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {mode === "signin" ? "Security Portal Sign In" : "Create Analyst Account"}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Access personalized threat scan history and export audit logs.
          </p>
        </div>

        {/* Auth Glass Card */}
        <div className="rounded-[28px] border border-white/80 bg-white/60 shadow-[inset_0_1px_2px_0_rgba(255,255,255,0.9),0_20px_50px_-15px_rgba(99,102,241,0.15)] backdrop-blur-3xl p-7 sm:p-9">
          
          {/* Quick 1-Click Demo Login Box (Ideal for Presentations) */}
          <div className="mb-6 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-cyan-50 border border-indigo-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-indigo-600" />
                Quick Presentation Login (1-Click)
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-200/60 text-indigo-800">
                Viva Demo
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoClick(0)}
                className="py-2 px-3 rounded-xl bg-white hover:bg-indigo-600 hover:text-white text-indigo-900 border border-indigo-200/70 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shield className="size-3.5" />
                <span>Analyst Demo</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoClick(1)}
                className="py-2 px-3 rounded-xl bg-white hover:bg-indigo-600 hover:text-white text-indigo-900 border border-indigo-200/70 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserIcon className="size-3.5" />
                <span>Group 5 Lead</span>
              </button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-xl mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                mode === "signup"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Register New
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Role / Designation</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as User["role"])}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-900 font-medium"
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
                  placeholder="analyst@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-900"
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-900"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{mode === "signin" ? "Sign In to Portal" : "Complete Registration"}</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors"
            >
              ← Back to File Analyzer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
