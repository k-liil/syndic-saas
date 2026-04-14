"use client";

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { toDisplayDate, getTodayInputVal } from "@/lib/date-utils";
import { Calendar } from "lucide-react";

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string; // expects yyyy-mm-dd
  onChange: (e: { target: { value: string } }) => void; // provides yyyy-mm-dd
}

/**
 * A date input component that guarantees 'DD/MM/YYYY' display
 * regardless of browser locale.
 */
export function DateInput({ className, value, onChange, ...props }: DateInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const nativeInputRef = useRef<HTMLInputElement>(null);

  // Sync internal display value when external value changes
  useEffect(() => {
    setDisplayValue(toDisplayDate(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value.replace(/\D/g, ""); // Keep only digits
    if (input.length > 8) input = input.slice(0, 8);

    // Apply JJ/MM/AAAA mask
    let formatted = "";
    if (input.length > 0) {
      formatted += input.slice(0, 2);
      if (input.length > 2) {
        formatted += "/" + input.slice(2, 4);
        if (input.length > 4) {
          formatted += "/" + input.slice(4, 8);
        }
      }
    }

    setDisplayValue(formatted);

    // If we have a full date, notify parent
    if (input.length === 8) {
      const d = input.slice(0, 2);
      const m = input.slice(2, 4);
      const y = input.slice(4, 8);
      const iso = `${y}-${m}-${d}`;
      
      // Basic validation check
      const date = new Date(iso);
      if (!isNaN(date.getTime())) {
        onChange({ target: { value: iso } });
      }
    }
  };

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      onChange({ target: { value: val } });
    }
  };

  const triggerPicker = () => {
    if (nativeInputRef.current) {
      try {
        // Modern approach
        if ('showPicker' in HTMLInputElement.prototype) {
          nativeInputRef.current.showPicker();
        } else {
          nativeInputRef.current.click();
        }
      } catch (e) {
        nativeInputRef.current.click();
      }
    }
  };

  return (
    <div className="relative w-full group">
      <input
        type="text"
        placeholder="JJ/MM/AAAA"
        value={displayValue}
        onChange={handleTextChange}
        className={cn(
          "h-12 w-full rounded-md border border-zinc-200 bg-white pl-4 pr-12 text-sm shadow-sm outline-none transition focus:border-zinc-900",
          className
        )}
        {...props}
      />
      
      {/* Hidden native picker */}
      <input
        type="date"
        ref={nativeInputRef}
        onChange={handleNativeChange}
        value={value || getTodayInputVal()}
        className="invisible absolute inset-y-0 right-0 w-0 h-0"
      />

      {/* Calendar Icon Button */}
      <button
        type="button"
        onClick={triggerPicker}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition"
      >
        <Calendar size={18} />
      </button>
    </div>
  );
}
