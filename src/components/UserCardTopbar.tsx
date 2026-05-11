"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ChevronDown, LogOut, User } from "lucide-react";
import { useOrganization } from "@/lib/org-context";

export function UserCardTopbar({
  email,
  roleLabel,
  roleCode,
}: {
  email: string;
  roleLabel: string;
  roleCode?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { orgs } = useOrganization();

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
  const initials =
    username
      .split(/[._\-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || username.slice(0, 2).toUpperCase();

  const propertyCount = orgs.length;
  const subline =
    propertyCount > 0
      ? `${propertyCount} immeuble${propertyCount > 1 ? "s" : ""}`
      : roleLabel;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-left shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-sky-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 to-orange-500 text-[12px] font-bold text-white shadow-sm">
          {initials}
        </span>
        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block truncate text-[13px] font-semibold leading-tight text-slate-900">
            {username}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[10px] leading-tight">
            {roleCode ? (
              <span className="rounded bg-sky-50 px-1.5 py-px font-bold uppercase tracking-wide text-sky-700">
                {roleCode}
              </span>
            ) : null}
            <span className="truncate text-slate-500">{subline}</span>
          </span>
        </span>
        <ChevronDown
          size={14}
          className={[
            "shrink-0 text-slate-400 transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
        >
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
            className="mt-1 flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-[13px] text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900"
          >
            <User size={14} />
            Mon compte
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-rose-700 transition-colors duration-150 hover:bg-rose-50"
          >
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>
      ) : null}
    </div>
  );
}
