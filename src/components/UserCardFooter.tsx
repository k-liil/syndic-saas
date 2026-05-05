"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronUp, LogOut, User } from "lucide-react";

export function UserCardFooter({
  email,
  roleLabel,
}: {
  email: string;
  roleLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const username = email.split("@")[0];
  // Stable initials from username, lowercased then uppercased single char.
  const initials = username
    .split(/[._\-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || username.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left transition hover:border-slate-300 hover:bg-slate-50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-[12px] font-bold text-white shadow-sm">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-slate-900">
            {username}
          </span>
          <span className="block truncate text-[11px] text-slate-500">
            {roleLabel}
          </span>
        </span>
        <ChevronUp
          size={14}
          className={[
            "shrink-0 text-slate-400 transition-transform",
            open ? "rotate-0" : "rotate-180",
          ].join(" ")}
        />
      </button>

      {open ? (
        <div className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_-12px_40px_rgba(15,23,42,0.12)]">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Compte
            </div>
            <div className="mt-1 truncate text-[13px] font-semibold text-slate-900">
              {email}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-500">{roleLabel}</div>
          </div>
          <Link
            href="/setup/settings"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <User size={14} />
            Mon compte
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-rose-700 hover:bg-rose-50"
          >
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>
      ) : null}
    </div>
  );
}
