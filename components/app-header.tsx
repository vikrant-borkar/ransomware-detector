"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Upload, History, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function AppHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="w-full border-b border-white/50 bg-white/40 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="size-5" />
          </div>
          <span className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-600 bg-clip-text text-transparent drop-shadow-2xs">
            Ransomware <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">Detector</span>
          </span>
        </Link>

        {/* Navigation & User Profile */}
        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                pathname === "/"
                  ? "text-indigo-950 bg-white shadow-xs border border-indigo-100/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <Upload className={`size-3.5 ${pathname === "/" ? "text-indigo-600" : "text-slate-400"}`} />
              <span>Analyzer</span>
            </Link>

            <Link
              href="/history"
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                pathname === "/history"
                  ? "text-indigo-950 bg-white shadow-xs border border-indigo-100/80"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
              }`}
            >
              <History className={`size-3.5 ${pathname === "/history" ? "text-indigo-600" : "text-slate-400"}`} />
              <span>Scan History</span>
            </Link>
          </nav>

          {/* User Auth Status / Sign In CTA */}
          <div className="pl-2 sm:pl-3 border-l border-slate-200/80 flex items-center">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/history"
                  className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full bg-indigo-50/80 border border-indigo-200/60 hover:bg-indigo-100/80 transition-colors"
                >
                  <div className="size-6 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white font-bold text-[10px] flex items-center justify-center shadow-xs">
                    {user.avatar || "U"}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-[11px] font-bold text-indigo-950 leading-tight truncate max-w-[100px]">
                      {user.name.split(" ")[0]}
                    </p>
                  </div>
                </Link>

                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all ${
                  pathname === "/login"
                    ? "bg-slate-900 text-white"
                    : "bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white"
                }`}
              >
                <LogIn className="size-3.5" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
