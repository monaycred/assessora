"use client";

import { cn } from "@/lib/utils";
import { LabelHTMLAttributes } from "react";

const Label = ({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn(
      "text-sm font-medium text-dark-200 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className
    )}
    {...props}
  />
);

Label.displayName = "Label";

export default Label;
