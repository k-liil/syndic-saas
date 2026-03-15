"use client";

import { Suspense, useState } from "react";
import { ReceiptsTabs } from "@/components/receipts/ReceiptsTabs";
import { ContributionReceiptsTab } from "@/components/receipts/ContributionReceiptsTab";
import { OtherReceiptsTab } from "@/components/receipts/OtherReceiptsTab";

export default function ReceiptsPage() {

  const [tab, setTab] = useState<"CONTRIBUTION" | "OTHER">("CONTRIBUTION");

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recettes</h1>
      </div>

      <ReceiptsTabs tab={tab} setTab={setTab} />

      <Suspense
        fallback={
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
            Chargement des recettes...
          </div>
        }
      >
        {tab === "CONTRIBUTION" && <ContributionReceiptsTab />}
        {tab === "OTHER" && <OtherReceiptsTab />}
      </Suspense>

    </div>
  );
}
