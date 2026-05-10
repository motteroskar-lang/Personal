import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const variants = {
  default: "bg-white/[0.07] text-[#B8B6B0] border-white/10",
  success: "bg-[#6BE3A4]/10 text-[#6BE3A4] border-[#6BE3A4]/25",
  warning: "bg-[#F2C063]/10 text-[#F2C063] border-[#F2C063]/25",
  danger: "bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]/25",
  info: "bg-[#60A5FA]/10 text-[#60A5FA] border-[#60A5FA]/25",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-mono font-bold uppercase tracking-[0.1em] border",
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const map: Record<string, { variant: "danger" | "warning" | "default" | "info"; label: string }> = {
    critical: { variant: "danger", label: "Critical" },
    high: { variant: "warning", label: "High" },
    medium: { variant: "default", label: "Medium" },
    low: { variant: "info", label: "Low" },
  };
  const { variant, label } = map[urgency] ?? { variant: "default", label: urgency };
  return <Badge variant={variant}>{label}</Badge>;
}
