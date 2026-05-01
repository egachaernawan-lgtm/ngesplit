"use client";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepHeaderProps {
  title: string;
  subtitle?: string;
  step?: number;
  totalSteps?: number;
  back?: string;
  className?: string;
}

export default function StepHeader({ title, subtitle, step, totalSteps, back, className }: StepHeaderProps) {
  const router = useRouter();

  return (
    <div className={cn("flex flex-col gap-3 pt-6 pb-4 px-4", className)}>
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => router.push(back)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-[#888] hover:text-[#F5F5F5] transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="flex-1">
          {step && totalSteps && (
            <p className="text-xs text-[#888] mb-1">
              Step {step} of {totalSteps}
            </p>
          )}
          <h1 className="text-xl font-semibold text-[#F5F5F5] tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-[#888] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {step && totalSteps && (
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i < step ? "bg-[#E8FF5A]" : "bg-[#2A2A2A]"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
