"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, ShieldAlert, ChartBar, Home, ShieldCheck } from "lucide-react";
import { cn } from "cn";

const NAV = [
  { href: "/monitor", label: "Monitor Console", icon: Radio },
  { href: "/alerts", label: "Security Alerts", icon: ShieldAlert },
  { href: "/evaluation", label: "AI Evaluation", icon: ChartBar },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col w-[230px] shrink-0 border-r"
        style={{ background: "#0e0e0f", borderColor: "#454655" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: "#454655" }}>
          <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#e5e2e3]">Ransomware Sentinel</p>
            <p className="text-[10px] text-[#8f8fa1]">Syscall Sequence AI</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all",
                  active
                    ? "text-[#bec2ff] bg-[#201f21] border border-[#454655]"
                    : "text-[#8f8fa1] hover:text-[#e5e2e3] hover:bg-[#1c1b1d]"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Home CTA */}
        <div className="p-3 border-t" style={{ borderColor: "#454655" }}>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-[12px] text-[#8f8fa1] hover:text-[#e5e2e3] hover:bg-[#1c1b1d] transition-colors"
          >
            <Home className="size-3.5" />
            Back to Home Page
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 border-b" style={{ background: "#0e0e0f", borderColor: "#454655" }}>
        <Link href="/" className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-indigo-400" />
          <span className="text-[13px] font-semibold text-[#e5e2e3]">Ransomware Sentinel</span>
        </Link>
        <div className="flex gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={cn("p-2 rounded transition-colors", active ? "text-[#bec2ff] bg-[#201f21]" : "text-[#8f8fa1]")}>
                <Icon className="size-4" />
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 overflow-auto mt-14 md:mt-0" style={{ background: "#131314" }}>
        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
