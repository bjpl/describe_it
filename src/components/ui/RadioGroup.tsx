import React, { createContext, useContext } from "react";

interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextValue | undefined>(
  undefined,
);

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
  orientation?: "horizontal" | "vertical";
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onValueChange,
  className = "",
  children,
  orientation = "vertical",
}) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div
        role="radiogroup"
        className={`${orientation === "horizontal" ? "flex flex-row gap-4" : "flex flex-col gap-2"} ${className}`}
      >
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
};

interface RadioGroupItemProps {
  value: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export const RadioGroupItem: React.FC<RadioGroupItemProps> = ({
  value,
  id,
  className = "",
  disabled = false,
}) => {
  const context = useContext(RadioGroupContext);
  if (!context)
    throw new Error("RadioGroupItem must be used within RadioGroup");

  const { value: selectedValue, onValueChange } = context;
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      id={id}
      disabled={disabled}
      onClick={() => !disabled && onValueChange(value)}
      className={`aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {isSelected && (
        <span className="flex h-full w-full items-center justify-center">
          <span className="h-2.5 w-2.5 rounded-full bg-current" />
        </span>
      )}
    </button>
  );
};

// Create Root and Item exports for compatibility
export const Root = RadioGroup;
export const Item = RadioGroupItem;

// Default namespace export for * imports
const RadioGroupNamespace = {
  Root: RadioGroup,
  Item: RadioGroupItem,
};

export default RadioGroupNamespace;
