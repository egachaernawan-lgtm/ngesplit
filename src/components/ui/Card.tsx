import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("bg-[#1A1A1A] border border-[#2A2A2A] rounded-[12px] p-4", className)}>
      {children}
    </div>
  );
}
