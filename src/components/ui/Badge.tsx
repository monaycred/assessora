import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "primary";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export default function Badge({
  children,
  className,
  variant = "default",
  dot = false,
  ...props
}: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-dark-700 text-dark-200",
    success: "bg-green-500/10 text-green-400 border border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20",
    info: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    primary:
      "bg-primary-500/10 text-primary-500 border border-primary-500/20",
  };

  const dotColors: Record<BadgeVariant, string> = {
    default: "bg-dark-400",
    success: "bg-green-400",
    warning: "bg-yellow-400",
    danger: "bg-red-400",
    info: "bg-blue-400",
    primary: "bg-primary-500",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            dotColors[variant]
          )}
        />
      )}
      {children}
    </span>
  );
}
