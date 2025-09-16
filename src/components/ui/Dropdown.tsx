"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface DropdownItem {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  description?: string;
}

export interface DropdownProps {
  items: DropdownItem[];
  value?: string;
  placeholder?: string;
  onSelect: (value: string) => void;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  maxHeight?: number;
  position?: "top" | "bottom" | "auto";
}

export function Dropdown({
  items,
  value,
  placeholder = "Select an option...",
  onSelect,
  className,
  disabled = false,
  searchable = false,
  multiple = false,
  maxHeight = 200,
  position = "auto",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedValues, setSelectedValues] = useState<string[]>(
    multiple ? (Array.isArray(value) ? value : value ? [value] : []) : []
  );
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const filteredItems = searchable
    ? items.filter((item) =>
        item.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  const selectedItem = items.find((item) => item.value === value);
  const selectedItems = multiple 
    ? items.filter((item) => selectedValues.includes(item.value))
    : [];

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
        setFocusedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case "Enter":
      case "Space":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          if (searchable) {
            setTimeout(() => searchInputRef.current?.focus(), 100);
          }
        } else if (focusedIndex >= 0 && focusedIndex < filteredItems.length) {
          handleSelect(filteredItems[focusedIndex].value);
        }
        break;
      case "ArrowDown":
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex((prev) => 
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => 
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearchTerm("");
        setFocusedIndex(-1);
        triggerRef.current?.focus();
        break;
      case "Tab":
        setIsOpen(false);
        setSearchTerm("");
        setFocusedIndex(-1);
        break;
    }
  };

  const handleSelect = (itemValue: string) => {
    if (multiple) {
      const newSelectedValues = selectedValues.includes(itemValue)
        ? selectedValues.filter((v) => v !== itemValue)
        : [...selectedValues, itemValue];
      setSelectedValues(newSelectedValues);
      onSelect(itemValue); // Or pass the array if you prefer
    } else {
      onSelect(itemValue);
      setIsOpen(false);
      setSearchTerm("");
      setFocusedIndex(-1);
    }
  };

  const getDisplayText = () => {
    if (multiple && selectedItems.length > 0) {
      if (selectedItems.length === 1) {
        return selectedItems[0].label;
      }
      return `${selectedItems.length} selected`;
    }
    return selectedItem?.label || placeholder;
  };

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "ring-2 ring-ring ring-offset-2"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={getDisplayText()}
      >
        <span className={cn(
          "truncate",
          (!selectedItem && !selectedItems.length) && "text-muted-foreground"
        )}>
          {getDisplayText()}
        </span>
        <ChevronDown 
          className={cn(
            "h-4 w-4 opacity-50 transition-transform",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md",
              position === "top" && "bottom-full mb-1 mt-0"
            )}
            style={{ maxHeight: `${maxHeight}px` }}
          >
            {/* Search Input */}
            {searchable && (
              <div className="p-2 border-b">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            {/* Items */}
            <div className="max-h-60 overflow-auto" role="listbox">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No options found
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const isSelected = multiple 
                    ? selectedValues.includes(item.value)
                    : value === item.value;
                  const isFocused = index === focusedIndex;

                  return (
                    <button
                      key={item.value}
                      onClick={() => !item.disabled && handleSelect(item.value)}
                      disabled={item.disabled}
                      className={cn(
                        "w-full flex items-center px-3 py-2 text-sm text-left transition-colors",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        isFocused && "bg-accent text-accent-foreground",
                        isSelected && "bg-primary/10 text-primary"
                      )}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        {item.icon && (
                          <span className="mr-2 flex-shrink-0">{item.icon}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="truncate">{item.label}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Simple dropdown for common use cases
export interface SimpleDropdownProps {
  options: string[] | { value: string; label: string }[];
  value?: string;
  placeholder?: string;
  onSelect: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SimpleDropdown({
  options,
  value,
  placeholder,
  onSelect,
  className,
  disabled,
}: SimpleDropdownProps) {
  const items: DropdownItem[] = options.map((option) => 
    typeof option === "string" 
      ? { value: option, label: option }
      : option
  );

  return (
    <Dropdown
      items={items}
      value={value}
      placeholder={placeholder}
      onSelect={onSelect}
      className={className}
      disabled={disabled}
    />
  );
}

export default Dropdown;
