"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, Check, ChevronsUpDown, FolderCog } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOrganization } from "@/lib/org-context";

type FiscalYear = { id: string; year: number };

function setQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  params: URLSearchParams
) {
  const qs = params.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname);
}

export function ResidenceSwitcher() {
  const { org, orgs, switchOrg } = useOrganization();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [years, setYears] = useState<FiscalYear[]>([]);

  const year =
    sp.get("year") ||
    (typeof window !== "undefined" ? localStorage.getItem("syndic-year") : null);

  const activeYear = useMemo(() => {
    const y = Number(year);
    if (!Number.isFinite(y)) return undefined;
    return years.find((fy) => fy.year === y);
  }, [years, year]);

  useEffect(() => {
    const orgId =
      org?.id ||
      (typeof window !== "undefined" ? localStorage.getItem("syndic-org-id") : null);
    const url = orgId ? `/api/fiscal-years?orgId=${orgId}` : "/api/fiscal-years";
    fetch(url)
      .then((r) => r.json())
      .then((data) =>
        setYears(
          Array.isArray(data) ? [...data].sort((a, b) => a.year - b.year) : []
        )
      )
      .catch(() => setYears([]));
  }, [org?.id]);

  useEffect(() => {
    const params = new URLSearchParams(sp.toString());
    if (!params.get("year") && years.length > 0) {
      const stored =
        typeof window !== "undefined" ? localStorage.getItem("syndic-year") : null;
      const fallback = stored ?? String(years[0].year);
      params.set("year", fallback);
    }
    if (params.toString() !== sp.toString()) {
      setQuery(router, pathname, params);
    }
  }, [years, pathname, router, sp]);

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

  function handleYearSwitch(fy: FiscalYear) {
    const params = new URLSearchParams(sp.toString());
    params.set("year", String(fy.year));
    localStorage.setItem("syndic-year", String(fy.year));
    setQuery(router, pathname, params);
    setOpen(false);
  }

  if (!org) {
    return (
      <div className="flex h-14 items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <span className="h-9 w-9 shrink-0 animate-pulse rounded-md bg-slate-100" />
        <span className="h-4 w-32 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-2 py-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
      >
        {org.logoUrl ? (
          <Image
            src={org.logoUrl}
            alt={org.name}
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-md object-contain bg-white shadow-sm"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-sm">
            <Building2 size={16} strokeWidth={1.75} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-slate-900">
            {org.name}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            {activeYear ? (
              <span className="rounded bg-sky-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                EX. {activeYear.year}
              </span>
            ) : null}
          </span>
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
          <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
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
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition",
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
            ) : null}

            <div
              className={
                orgs.length > 1 ? "mt-2 border-t border-slate-100 pt-2" : ""
              }
            >
              <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Exercice
              </div>
              {years.length === 0 ? (
                <div className="rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
                  Aucun exercice disponible
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1 px-1">
                  {[...years].reverse().map((fy) => (
                    <button
                      type="button"
                      key={fy.id}
                      onClick={() => handleYearSwitch(fy)}
                      className={[
                        "rounded-md py-1.5 text-[12px] font-semibold transition",
                        fy.year === activeYear?.year
                          ? "bg-sky-600 text-white shadow-sm"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      {fy.year}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/setup/settings"
              onClick={() => setOpen(false)}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-600 transition hover:bg-slate-100"
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
