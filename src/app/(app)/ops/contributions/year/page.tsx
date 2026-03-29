"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ContributionsYearTable } from "@/components/contributions/ContributionsYearTable";
import { useApiUrl } from "@/lib/org-context";

type DueStatus = "PAID" | "PARTIAL" | "UNPAID";

type ApiBuilding = {
  id: string;
  name: string;
  units: {
    id: string;
    lotNumber: string;
    reference: string;
    ownerships: {
      owner: {
        firstName: string | null;
        name: string;
      };
    }[];
    dues: {
      period: string;
      status: DueStatus;
    }[];
  }[];
};

type BuildingOption = {
  id: string;
  name: string;
};

type MonthStatus = "PAID" | "PARTIAL" | "UNPAID" | "ADVANCE" | null;

type RowData = {
  id: string;
  lot: string;
  owner: string;
  jan: MonthStatus;
  feb: MonthStatus;
  mar: MonthStatus;
  apr: MonthStatus;
  may: MonthStatus;
  jun: MonthStatus;
  jul: MonthStatus;
  aug: MonthStatus;
  sep: MonthStatus;
  oct: MonthStatus;
  nov: MonthStatus;
  dec: MonthStatus;
};

function ContributionsYearPageContent() {
  const searchParams = useSearchParams();
  const year = Number(searchParams.get("year"));
  const apiUrl = useApiUrl();

  const [data, setData] = useState<ApiBuilding[]>([]);
  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [buildingId, setBuildingId] = useState("");

  const load = useCallback(async () => {
    if (!year) return;

    const url = buildingId
      ? apiUrl(`/api/contributions/year?year=${year}&buildingId=${buildingId}`)
      : apiUrl(`/api/contributions/year?year=${year}`);

    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    setData(Array.isArray(json) ? json : []);
  }, [apiUrl, buildingId, year]);

  const loadBuildings = useCallback(async () => {
    const res = await fetch(apiUrl("/api/buildings/options"), { cache: "no-store" });
    const json = await res.json();

    setBuildings(Array.isArray(json) ? json : []);
  }, [apiUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadBuildings();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadBuildings]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function convertUnits(building: ApiBuilding): RowData[] {
    return building.units.map((u) => {
      const months = new Map<number, MonthStatus>();

      u.dues.forEach((d) => {
        const m = new Date(d.period).getUTCMonth();
        months.set(m, d.status);
      });

      const get = (m: number): MonthStatus => {
        return months.get(m) ?? "UNPAID";
      };

      return {
        id: u.id,
        lot: u.lotNumber || u.reference || "",
        owner: [u.ownerships?.[0]?.owner?.firstName, u.ownerships?.[0]?.owner?.name]
          .filter(Boolean)
          .join(" "),
        jan: get(0),
        feb: get(1),
        mar: get(2),
        apr: get(3),
        may: get(4),
        jun: get(5),
        jul: get(6),
        aug: get(7),
        sep: get(8),
        oct: get(9),
        nov: get(10),
        dec: get(11),
      };
    });
  }

  if (!year) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <div className="text-lg font-semibold text-zinc-800">Aucun exercice selectionne</div>
          <div className="mt-2 text-sm text-zinc-500">
            Selectionne un exercice fiscal en haut de la page.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[85vw] space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Cotisations annuelles</h1>
          <p className="mt-1 text-sm text-zinc-500">Exercice {year}</p>
        </div>

        <select
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          className="h-10 min-w-[240px] rounded-lg border border-zinc-300 bg-white px-3 text-sm shadow-sm"
        >
          <option value="">Tous les bâtiments</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Paye
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          Retard
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Partiel
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          Avance
        </div>
      </div>

      {data.map((building) => {
        const rows = convertUnits(building);

        return (
          <div key={building.id} className="space-y-4">
            <h2 className="text-lg font-semibold">{building.name}</h2>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-zinc-400">Lots</div>
                <div className="mt-2 text-xl font-bold text-zinc-900">{rows.length}</div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-zinc-400">Mois payes</div>
                <div className="mt-2 text-xl font-bold text-emerald-600">
                  {rows.reduce((sum, row) => {
                    return sum + Object.values(row).filter((v) => v === "PAID").length;
                  }, 0)}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-zinc-400">Retards</div>
                <div className="mt-2 text-xl font-bold text-rose-600">
                  {rows.reduce((sum, row) => {
                    return sum + Object.values(row).filter((v) => v === "UNPAID").length;
                  }, 0)}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-zinc-400">Partiels</div>
                <div className="mt-2 text-xl font-bold text-amber-600">
                  {rows.reduce((sum, row) => {
                    return sum + Object.values(row).filter((v) => v === "PARTIAL").length;
                  }, 0)}
                </div>
              </div>
            </div>

            <ContributionsYearTable data={rows} />
          </div>
        );
      })}
    </div>
  );
}

export default function ContributionsYearPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
            Chargement des cotisations...
          </div>
        </div>
      }
    >
      <ContributionsYearPageContent />
    </Suspense>
  );
}
