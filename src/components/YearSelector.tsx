"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOrganization } from "@/lib/org-context";

type FiscalYear = { id: string; year: number };

export function YearSelector({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const { org } = useOrganization();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [years, setYears] = useState<FiscalYear[]>([]);

  const yearParam =
    sp.get("year") ||
    (typeof window !== "undefined" ? localStorage.getItem("syndic-year") : null);

  const activeYear = useMemo(() => {
    const y = Number(yearParam);
    if (!Number.isFinite(y)) return undefined;
    return years.find((fy) => fy.year === y);
  }, [years, yearParam]);

  useEffect(() => {
    const orgId =
      org?.id ||
      (typeof window !== "undefined" ? localStorage.getItem("syndic-org-id") : null);
    const url = orgId ? `/api/fiscal-years?orgId=${orgId}` : "/api/fiscal-years";
    fetch(url)
      .then((r) => r.json())
      .then((data) =>
        setYears(
          Array.isArray(data) ? [...data].sort((a, b) => b.year - a.year) : []
        )
      )
      .catch(() => setYears([]));
  }, [org?.id]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function handleYearSwitch(fy: FiscalYear) {
    const params = new URLSearchParams(sp.toString());
    params.set("year", String(fy.year));
    localStorage.setItem("syndic-year", String(fy.year));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    setOpen(false);
  }

  const isSm = size === "sm";

  if (years.length === 0) {
    return (
      <div
        className={[
          "inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50",
          isSm ? "px-2.5 py-1.5" : "px-3 py-2",
          className,
        ].join(" ")}
      >
        <span className="h-4 w-20 animate-pulse rounded bg-sky-100" />
      </div>
    );
  }

  return (
    <div className={["relative inline-block", className].join(" ")} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-sky-300 bg-gradient-to-br from-sky-50 to-sky-100/60 text-left shadow-[0_2px_8px_rgba(2,132,199,0.10)] transition-all duration-200 hover:-translate-y-px hover:border-sky-400 hover:from-sky-100 hover:to-sky-200/60 hover:shadow-[0_4px_14px_rgba(2,132,199,0.18)] focus:outline-none focus:ring-2 focus:ring-sky-200",
          isSm ? "px-2.5 py-1.5" : "px-3 py-2",
        ].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white shadow-sm">
          <CalendarRange size={13} strokeWidth={2} />
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">
            Exercice
          </span>
          <span className="text-[14px] font-bold text-sky-900">
            {activeYear?.year ?? "—"}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={[
            "shrink-0 text-sky-600 transition-transform duration-200",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]"
        >
          {years.map((fy) => {
            const selected = fy.year === activeYear?.year;
            return (
              <button
                type="button"
                key={fy.id}
                role="option"
                aria-selected={selected}
                onClick={() => handleYearSwitch(fy)}
                className={[
                  "flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150",
                  selected
                    ? "bg-sky-50 font-semibold text-sky-700"
                    : "text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                <span>Exercice {fy.year}</span>
                {selected ? (
                  <Check size={14} className="shrink-0 text-sky-600" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
