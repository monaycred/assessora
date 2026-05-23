import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  color?: "primary" | "blue" | "purple" | "orange" | "red";
  className?: string;
}

const colorMap = {
  primary: {
    bg: "bg-primary-500/10",
    icon: "text-primary-500",
    border: "border-primary-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    icon: "text-blue-400",
    border: "border-blue-500/20",
  },
  purple: {
    bg: "bg-purple-500/10",
    icon: "text-purple-400",
    border: "border-purple-500/20",
  },
  orange: {
    bg: "bg-orange-500/10",
    icon: "text-orange-400",
    border: "border-orange-500/20",
  },
  red: {
    bg: "bg-red-500/10",
    icon: "text-red-400",
    border: "border-red-500/20",
  },
};

export default function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "primary",
  className,
}: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        "bg-dark-900 border border-dark-700/50 rounded-xl p-5 flex items-start justify-between",
        className
      )}
    >
      <div className="flex-1">
        <p className="text-xs text-dark-400 font-medium mb-1">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        {trend && (
          <p
            className={cn(
              "text-xs mt-1",
              trend.value >= 0 ? "text-green-400" : "text-red-400"
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}% {trend.label}
          </p>
        )}
      </div>
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center border",
          colors.bg,
          colors.border
        )}
      >
        <Icon className={cn("w-5 h-5", colors.icon)} />
      </div>
    </div>
  );
}
