"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

const Tabs = ({ value, onValueChange, children, className }: TabsProps) => (
  <div className={className}>{children}</div>
);

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

const TabsList = ({ children, className }: TabsListProps) => (
  <div
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-lg bg-dark-800 p-1 text-dark-400",
      className
    )}
    role="tablist"
  >
    {children}
  </div>
);

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

const TabsTrigger = ({ value, children, onClick, className }: TabsTriggerProps) => (
  <button
    role="tab"
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium",
      "transition-all duration-200",
      "focus:outline-none focus:ring-2 focus:ring-primary-500/50",
      "disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    onClick={onClick}
  >
    {children}
  </button>
);

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

const TabsContent = ({ value, children, className }: TabsContentProps) => (
  <div
    role="tabpanel"
    className={cn("mt-2 ring-offset-dark-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2", className)}
  >
    {children}
  </div>
);

Tabs.displayName = "Tabs";
TabsList.displayName = "TabsList";
TabsTrigger.displayName = "TabsTrigger";
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
export default Tabs;
