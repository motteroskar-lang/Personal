import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  accent?: "success" | "warning" | "danger" | "none";
  onClick?: () => void;
}

export function Card({ children, className, accent, onClick }: CardProps) {
  const accentStyles = {
    success: "shadow-[0_0_0_1px_rgba(107,227,164,0.25),0_12px_40px_rgba(0,0,0,0.45)]",
    warning: "shadow-[0_0_0_1px_rgba(242,192,99,0.25),0_12px_40px_rgba(0,0,0,0.45)]",
    danger: "shadow-[0_0_0_1px_rgba(255,107,107,0.25),0_12px_40px_rgba(0,0,0,0.45)]",
    none: "shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "card p-5",
        accent ? accentStyles[accent] : accentStyles.none,
        onClick && "cursor-pointer transition-all hover:bg-white/[0.06]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, eyebrow, className }: { children: React.ReactNode; eyebrow?: string; className?: string }) {
  return (
    <div className={className}>
      {eyebrow && (
        <div className="text-[10.5px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E] mb-1.5">
          {eyebrow}
        </div>
      )}
      <div className="font-bold text-[#FAFAFA]">{children}</div>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4 text-[10.5px] font-mono font-bold tracking-[0.18em] uppercase text-[#76746E]">
      <span className="w-[18px] h-px bg-[#76746E]/60 flex-shrink-0" />
      {children}
      <span className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.08), transparent)" }} />
    </div>
  );
}
