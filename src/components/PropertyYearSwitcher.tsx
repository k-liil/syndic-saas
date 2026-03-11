"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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

  const year = sp.get("year");

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
  const fallback = years[0].year;
  params.set("year", String(fallback));
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
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  if (years.length === 0) {
    return (
      <div className="mt-1">
        <span className="inline-flex h-8 items-center rounded-full border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-500">
          Exercice indisponible
        </span>
      </div>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-xl bg-zinc-100 px-4 py-2 text-left hover:bg-zinc-200"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white">
          🏢
        </div>

        <div className="flex flex-col">
          <span className="text-sm font-semibold text-zinc-900">
            {brandName}
          </span>
          <span className="text-xs text-zinc-500">
            Exercice {activeYear?.year}
          </span>
        </div>
      </button>

      {open ? (
        <div className="absolute left-0 top-12 z-50 w-72 rounded-2xl border border-zinc-200 bg-white shadow-xl">
          <div className="border-b border-zinc-200 p-4">
            <div className="mb-2 text-xs font-semibold uppercase text-zinc-400">
              Copropriété
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 text-sm font-medium">
              🏢 {brandName}
            </div>

            <Link
              href="/setup/owners"
              className="mt-2 block text-sm text-blue-600 hover:underline"
              onClick={() => setOpen(false)}
            >
              ⚙️ Gérer les copropriétaires
            </Link>
          </div>

          <div className="p-4">
            <div className="mb-2 text-xs font-semibold uppercase text-zinc-400">
              Exercice fiscal
            </div>

            <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
              {years.map((fy) => {
                const isActive = fy.year === activeYear?.year;

                return (
                  <button
                    key={fy.id}
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams(sp.toString());
                      params.set("year", String(fy.year));
                      setQuery(router, pathname, params);
                      setOpen(false);
                    }}
                    className={`rounded-lg px-3 py-1 text-sm font-medium ${
                      isActive
                        ? "bg-blue-500 text-white"
                        : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                    }`}
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