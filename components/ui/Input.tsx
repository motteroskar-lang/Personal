import { cn } from "@/lib/utils";
import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-[#76746E]">{label}</label>}
      <input
        {...props}
        className={cn(
          "px-3 py-2.5 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl text-[#FAFAFA] placeholder-[#76746E] outline-none transition-colors focus:border-white/22",
          error && "border-[#FF6B6B]/50 focus:border-[#FF6B6B]/70",
          className
        )}
      />
      {error && <span className="text-xs text-[#FF6B6B]">{error}</span>}
    </div>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-[#76746E]">{label}</label>}
      <textarea
        {...props}
        className={cn(
          "px-3 py-2.5 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl text-[#FAFAFA] placeholder-[#76746E] outline-none transition-colors focus:border-white/22 resize-none",
          className
        )}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-[#76746E]">{label}</label>}
      <select
        {...props}
        className={cn(
          "px-3 py-2.5 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl text-[#FAFAFA] outline-none transition-colors focus:border-white/22 cursor-pointer",
          className
        )}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} style={{ background: "#0A0A0B" }}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
