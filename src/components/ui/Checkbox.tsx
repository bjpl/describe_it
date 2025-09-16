"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check, Minus } from "lucide-react";

export interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  onClick?: (event: React.MouseEvent) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked = false,
      indeterminate = false,
      onChange,
      onClick,
      disabled = false,
      className,
      size = "md",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
    };

    const iconSizeClasses = {
      sm: "h-3 w-3",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(event.target.checked);
    };

    const handleClick = (event: React.MouseEvent) => {
      onClick?.(event);
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          onClick={handleClick}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            "relative flex items-center justify-center border-2 rounded transition-all duration-200",
            sizeClasses[size],
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            checked || indeterminate
              ? "bg-primary border-primary text-primary-foreground"
              : "border-input bg-background hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed",
            !disabled && "cursor-pointer",
            className
          )}
          role="checkbox"
          aria-checked={indeterminate ? "mixed" : checked}
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if ((e.key === "Space" || e.key === "Enter") && !disabled) {
              e.preventDefault();
              onChange?.(!checked);
            }
          }}
        >
          {(checked || indeterminate) && (
            <div className="flex items-center justify-center">
              {indeterminate ? (
                <Minus className={cn(iconSizeClasses[size], "stroke-[3]")} />
              ) : (
                <Check className={cn(iconSizeClasses[size], "stroke-[3]")} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
