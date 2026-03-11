"use client";

import { useState } from "react";
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

      {tab === "CONTRIBUTION" && <ContributionReceiptsTab />}

      {tab === "OTHER" && <OtherReceiptsTab />}

    </div>
  );
}