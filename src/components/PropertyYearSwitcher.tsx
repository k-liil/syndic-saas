"use client";

import Link from "next/link";
import { Building2, ChevronDown, FolderCog, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
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

export function PropertyYearSwitcher({
  brandName = "Syndicly",
}: {
  brandName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const { org, orgs, switchOrg } = useOrganization();
  const isSuperAdmin = (session?.user as any)?.role === "SUPER_ADMIN";

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
    const orgId = org?.id || localStorage.getItem("syndic-org-id");
    const url = orgId ? `/api/fiscal-years?orgId=${orgId}` : "/api/fiscal-years";
    fetch(url)
      .then((r) => r.json())
      .then((data) =>
        setYears(
          Array.isArray(data)
            ? [...data].sort((a, b) => a.year - b.year)
            : []
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

  const handleOrgSwitch = useCallback((newOrgId: string) => {
    const newOrg = orgs.find((o) => o.id === newOrgId);
    if (newOrg) {
      switchOrg(newOrg);
    }
    setOpen(false);
  }, [orgs, switchOrg]);

  async function handleDeleteOrg(o: { id: string, name: string }) {
    if (!confirm(`Supprimer l'organisation "${o.name}" ?\nCette action est irreversible.`)) return;

    try {
      const res = await fetch(`/api/organizations/${o.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la suppression");
      
      // Refresh page to sync if the current org was deleted
      window.location.reload();
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (!org) {
    return (
      <span className="inline-flex gap-3 h-11 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-500 shadow-sm">
        Chargement...
      </span>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 cursor-pointer items-center gap-3 rounded-md px-3 py-1.5 text-left transition hover:bg-sky-50"
      >
        {org.logoUrl ? (
          <img src={org.logoUrl} alt={org.name} className="h-9 w-9 shrink-0 rounded-md object-contain shadow-sm bg-white" />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
            <Building2 size={16} />
          </span>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-slate-900">{org.name}</span>
          <span className="text-[10px] leading-tight text-slate-500">Exercice {activeYear?.year}</span>
        </div>
      </button>

      {open ? (
        <div className="absolute left-0 top-14 z-50 w-64 rounded-md border border-slate-200 bg-white p-3 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          {orgs.length > 0 && (
            <div className="rounded-md bg-slate-50 p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                Copropriete
              </div>
              <div className="space-y-1.5">
                {orgs.map((o) => (
                  <div key={o.id} className="flex items-center gap-1.5 group/item">
                    <button
                      type="button"
                      onClick={() => handleOrgSwitch(o.id)}
                      className={[
                        "flex-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-left transition",
                        o.id === org.id
                          ? "bg-sky-100 text-sky-800"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      ].join(" ")}
                    >
                      {o.name}
                    </button>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={(e) =>{ e.stopPropagation(); handleDeleteOrg(o); }} className="p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover/item:opacity-100 transition" title="Supprimer l'organisation" > <Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              Exercices fiscaux
            </div>

            {years.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
                Aucun exercice disponible
              </div>
            ) : (
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
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
                        "rounded-lg px-3 py-1.5 text-xs font-medium transition",
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
            )}
          </div>

          <Link
            href="/setup/settings"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            onClick={() => setOpen(false)}
          >
            <FolderCog size={14} />
            Parametres
          </Link>
        </div>
      ) : null}
    </div>
  );
}
