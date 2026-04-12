"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ReceiptsTabs } from "@/components/receipts/ReceiptsTabs";
import { ContributionReceiptsTab } from "@/components/receipts/ContributionReceiptsTab";
import { OtherReceiptsTab } from "@/components/receipts/OtherReceiptsTab";
import {
  usePageLogger,
  PageLoggerToggle,
  PageLoggerPanel,
} from "@/components/ui/PageLogger";

export default function ReceiptsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [tab, setTab] = useState<"CONTRIBUTION" | "OTHER">(() => {
    const t = searchParams.get("type");
    return t === "OTHER" ? "OTHER" : "CONTRIBUTION";
  });

  const [monthFilter, setMonthFilter] = useState(0);
  const logger = usePageLogger();

  const handleTabChange = useCallback((newTab: "CONTRIBUTION" | "OTHER") => {
    setTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", newTab);
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  useEffect(() => {
    const t = searchParams.get("type");
    if (t === "OTHER") setTab("OTHER");
    else setTab("CONTRIBUTION");
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <h1 className="text-2xl font-semibold">Recettes</h1>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-500">Mois :</span>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(Number(e.target.value))}
            className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700 shadow-sm"
          >
            <option value={0}>Tous les mois</option>
            <option value={1}>Janvier</option>
            <option value={2}>Fevrier</option>
            <option value={3}>Mars</option>
            <option value={4}>Avril</option>
            <option value={5}>Mai</option>
            <option value={6}>Juin</option>
            <option value={7}>Juillet</option>
            <option value={8}>Aout</option>
            <option value={9}>Septembre</option>
            <option value={10}>Octobre</option>
            <option value={11}>Novembre</option>
            <option value={12}>Decembre</option>
          </select>
          {monthFilter > 0 ? (
            <button
              type="button"
              onClick={() => setMonthFilter(0)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-50"
            >
              x
            </button>
          ) : null}

          <div className="ml-4 pl-4 border-l border-zinc-200">
            <PageLoggerToggle
              isLogActive={logger.isLogActive}
              setIsLogActive={logger.setIsLogActive}
            />
          </div>
        </div>
      </div>

      <ReceiptsTabs tab={tab} setTab={handleTabChange} />

      <Suspense
        fallback={
          <div className="rounded-md border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
            Chargement des recettes...
          </div>
        }
      >
        {tab === "CONTRIBUTION" && (
          <ContributionReceiptsTab
            monthFilter={monthFilter}
            onMonthFilterChange={setMonthFilter}
            logger={logger}
          />
        )}
        {tab === "OTHER" && <OtherReceiptsTab monthFilter={monthFilter} />}
      </Suspense>

      <PageLoggerPanel
        logs={logger.logs}
        isLogActive={logger.isLogActive}
        clearLogs={logger.clearLogs}
      />
    </div>
  );
}
