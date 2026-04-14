"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string; // expects yyyy-mm-dd
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * A date input component that attempts to force a French locale (dd/mm/yyyy)
 * by setting lang="fr" and including a placeholder/label hint.
 */
export function DateInput({ className, ...props }: DateInputProps) {
  return (
    <div className="relative w-full">
      <input
        type="date"
        lang="fr"
        className={cn(
          "h-12 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none transition focus:border-zinc-900",
          "appearance-none", // ensures a cleaner look
          className
        )}
        {...props}
      />
      {/* 
        Note: The display format of <input type="date"> is strictly controlled by the browser locale. 
        Setting lang="fr" helps in many browsers (like Firefox and some versions of Chrome).
        In cases where the browser strictly enforces US locale, 
        a full custom picker (like react-day-picker) would be required.
      */}
    </div>
  );
}
