"use client";

import Link from "next/link";
import { Building2, ChevronDown, FolderCog } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type FiscalYear = { id: string; year: number };

function setQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  params: URLSearchParams
) {
  const qs = params.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname);
}

export function PropertyYearSwitcher({
  brandName = "Syndic",
}: {
  brandName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);

  const year =
    sp.get("year") ||
    (typeof window !== "undefined" ? localStorage.getItem("syndic-year") : null);

  const [years, setYears] = useState<FiscalYear[]>([]);
  const [open, setOpen] = useState(false);

  const activeYear = useMemo(() => {
    const y = Number(year);
    if (!Number.isFinite(y)) return undefined;
    return years.find((fy) => fy.year === y);
  }, [years, year]);

  useEffect(() => {
    fetch("/api/fiscal-years")
      .then((r) => r.json())
      .then((data) => setYears(Array.isArray(data) ? data : []))
      .catch(() => setYears([]));
  }, []);

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
  }, [years.length, pathname, router, sp]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  if (years.length === 0) {
    return (
      <span className="inline-flex h-11 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-500 shadow-sm">
        Exercice indisponible
      </span>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/20">
          <Building2 size={18} />
        </span>

        <span className="flex min-w-0 flex-col text-left">
          <span className="truncate text-sm font-semibold text-slate-900">{brandName}</span>
          <span className="text-xs text-slate-500">Exercice {activeYear?.year}</span>
        </span>

        <ChevronDown size={16} className="text-slate-400" />
      </button>

      {open ? (
        <div className="absolute left-0 top-16 z-50 w-80 rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <div className="rounded-[24px] bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Copropriete
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500 text-white">
                <Building2 size={18} />
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-900">{brandName}</div>
                <div className="text-xs text-slate-500">
                  Changer d'exercice ou acceder au parametrage
                </div>
              </div>
            </div>

            <Link
              href="/setup/settings"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              onClick={() => setOpen(false)}
            >
              <FolderCog size={16} />
              Gerer les parametres
            </Link>
          </div>

          <div className="mt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Exercices fiscaux
            </div>

            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {years.map((fy) => {
                const isActive = fy.year === activeYear?.year;

                return (
                  <button
                    key={fy.id}
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams(sp.toString());
                      params.set("year", String(fy.year));
                      localStorage.setItem("syndic-year", String(fy.year));
                      setQuery(router, pathname, params);
                      setOpen(false);
                    }}
                    className={[
                      "rounded-full px-4 py-2 text-sm font-medium transition",
                      isActive
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                    ].join(" ")}
                  >
                    {fy.year}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
