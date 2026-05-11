"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "⚡" },
  { href: "/coach", label: "Coach", icon: "🤖" },
  { href: "/goals", label: "Goals", icon: "🎯" },
  { href: "/health", label: "Health", icon: "❤️" },
  { href: "/training", label: "Training", icon: "🏋️" },
  { href: "/habits", label: "Habits", icon: "✅" },
  { href: "/nutrition", label: "Nutrition", icon: "🥗" },
  { href: "/journal", label: "Journal", icon: "📔" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/finance", label: "Finance", icon: "💰" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* Sidebar - desktop */}
      <nav className="hidden lg:flex fixed left-0 top-0 h-full w-[220px] flex-col z-50 border-r border-white/5"
        style={{ background: "rgba(5,5,6,0.95)", backdropFilter: "blur(24px)" }}>
        <div className="px-6 py-6 border-b border-white/5">
          <div className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-[#76746E] mb-1">Personal OS</div>
          <div className="text-lg font-bold gradient-text">Your Life, Optimized</div>
        </div>
        <div className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-150 relative group",
                pathname === item.href
                  ? "text-[#FAFAFA]"
                  : "text-[#76746E] hover:text-[#B8B6B0]"
              )}
            >
              {pathname === item.href && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-success rounded-r-full" />
              )}
              <span className="text-base w-5 flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-white/5">
          <div className="text-[10px] font-mono text-[#76746E]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" style={{ boxShadow: "0 0 6px rgba(107,227,164,0.7)", animation: "ledPulse 1.6s ease-in-out infinite" }} />
              AI Active
            </div>
          </div>
        </div>
      </nav>

      {/* Bottom nav - mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 flex items-center justify-around"
        style={{ background: "rgba(5,5,6,0.95)", backdropFilter: "blur(24px)", paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
        {NAV_ITEMS.slice(0, 5).map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 px-3 text-xs transition-colors",
              pathname === item.href ? "text-[#FAFAFA]" : "text-[#76746E]"
            )}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[9px] font-mono">{item.label}</span>
          </Link>
        ))}
        <div className="relative">
          <button
            className="flex flex-col items-center gap-0.5 py-2 px-3 text-xs text-[#76746E]"
            onClick={() => {
              const menu = document.getElementById("mobile-more-menu");
              if (menu) menu.classList.toggle("hidden");
            }}
          >
            <span className="text-lg leading-none">⋯</span>
            <span className="text-[9px] font-mono">More</span>
          </button>
          <div id="mobile-more-menu" className="hidden absolute bottom-full right-0 mb-2 card p-2 min-w-[140px]">
            {NAV_ITEMS.slice(5).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#B8B6B0] hover:bg-white/5 transition-colors"
                onClick={() => {
                  const menu = document.getElementById("mobile-more-menu");
                  if (menu) menu.classList.add("hidden");
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
