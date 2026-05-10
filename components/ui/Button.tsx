import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({ variant = "secondary", size = "md", loading, children, className, disabled, ...props }: ButtonProps) {
  const variants = {
    primary: "bg-gradient-to-b from-white to-[#E8E5DD] text-[#0A0A0B] font-bold shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_4px_12px_rgba(0,0,0,0.35)] hover:-translate-y-px hover:shadow-[0_1px_0_rgba(255,255,255,0.9)_inset,0_6px_16px_rgba(0,0,0,0.4)]",
    secondary: "bg-white/[0.06] border border-white/10 text-[#FAFAFA] font-semibold hover:bg-white/[0.09]",
    ghost: "text-[#76746E] hover:text-[#B8B6B0] hover:bg-white/5",
    danger: "bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 text-[#FF6B6B] font-semibold hover:bg-[#FF6B6B]/20",
    success: "bg-[#6BE3A4]/10 border border-[#6BE3A4]/30 text-[#6BE3A4] font-semibold hover:bg-[#6BE3A4]/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-white/20",
        variants[variant],
        sizes[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
