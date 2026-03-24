"use client";

import { ReactNode } from "react";

export function Modal({
  open,
  onClose,
  title,
  children,
  zIndex = 50,
  containerClassName = "w-[min(720px,92vw)]",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  zIndex?: number;
  containerClassName?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0" style={{ zIndex }}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-zinc-200 bg-white shadow-xl ${containerClassName}`}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div className="text-sm font-semibold">{title}</div>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm hover:bg-zinc-50">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}