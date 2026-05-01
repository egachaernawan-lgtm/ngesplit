"use client";
import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", fullWidth, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150 select-none rounded-[12px] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]",
          {
            "bg-[#E8FF5A] text-[#0A0A0A] hover:bg-[#D4EB4A]": variant === "primary",
            "bg-[#1A1A1A] text-[#F5F5F5] border border-[#2A2A2A] hover:bg-[#222222]": variant === "secondary",
            "text-[#F5F5F5] hover:bg-[#1A1A1A]": variant === "ghost",
            "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20": variant === "danger",
          },
          {
            "text-xs px-3 py-2": size === "sm",
            "text-sm px-4 py-3": size === "md",
            "text-base px-6 py-4": size === "lg",
          },
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
