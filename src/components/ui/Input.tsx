"use client";
import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
  prefix?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, suffix, prefix, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-[#888]">{label}</label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-sm text-[#888]">{prefix}</span>
          )}
          <input
            ref={ref}
            className={cn(
              "w-full bg-[#111] border border-[#2A2A2A] rounded-[10px] px-3 py-3 text-sm text-[#F5F5F5] placeholder:text-[#444] focus:outline-none focus:border-[#E8FF5A]/50 transition-colors",
              prefix && "pl-8",
              suffix && "pr-12",
              error && "border-red-500/50",
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 text-sm text-[#888]">{suffix}</span>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
