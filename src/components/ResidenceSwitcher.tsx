"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, Check, ChevronsUpDown, FolderCog } from "lucide-react";
import { useOrganization } from "@/lib/org-context";

export function ResidenceSwitcher() {
  const { org, orgs, switchOrg } = useOrganization();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function handleOrgSwitch(newOrgId: string) {
    const newOrg = orgs.find((o) => o.id === newOrgId);
    if (newOrg) switchOrg(newOrg);
    setOpen(false);
  }

  if (!org) {
    return (
      <div className="inline-flex h-11 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <span className="h-7 w-7 shrink-0 animate-pulse rounded-md bg-slate-100" />
        <span className="h-4 w-32 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  const propertyCount = orgs.length;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-[280px] cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-left shadow-[0_2px_8px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-sky-100"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {org.logoUrl ? (
          <Image
            src={org.logoUrl}
            alt={org.name}
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-md bg-white object-contain shadow-sm"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-sm">
            <Building2 size={15} strokeWidth={1.75} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight text-slate-900">
            {org.name}
          </span>
          {propertyCount > 1 ? (
            <span className="block text-[11px] leading-tight text-slate-500">
              {propertyCount} résidences
            </span>
          ) : null}
        </span>
        <ChevronsUpDown size={14} className="shrink-0 text-slate-400" />
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
            {orgs.length > 1 ? (
              <>
                <div className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Résidences
                </div>
                <div className="space-y-0.5">
                  {orgs.map((o) => {
                    const selected = o.id === org.id;
                    return (
                      <button
                        type="button"
                        key={o.id}
                        onClick={() => handleOrgSwitch(o.id)}
                        className={[
                          "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150",
                          selected ? "bg-sky-50" : "hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                          <Building2 size={14} strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-slate-900">
                            {o.name}
                          </span>
                          {o.slug ? (
                            <span className="block truncate text-[11px] text-slate-500">
                              {o.slug}
                            </span>
                          ) : null}
                        </span>
                        {selected ? (
                          <Check size={14} className="shrink-0 text-sky-600" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
                Une seule résidence disponible
              </div>
            )}

            <Link
              href="/setup/settings"
              onClick={() => setOpen(false)}
              className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100"
            >
              <FolderCog size={13} />
              Paramètres
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
