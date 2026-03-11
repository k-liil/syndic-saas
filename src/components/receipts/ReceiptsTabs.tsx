"use client";

export function ReceiptsTabs({
  tab,
  setTab,
}: {
  tab: "CONTRIBUTION" | "OTHER";
  setTab: (v: "CONTRIBUTION" | "OTHER") => void;
}) {
  return (
    <div className="flex gap-2">

      <button
        onClick={() => setTab("CONTRIBUTION")}
        className={`rounded-xl border px-4 py-2 text-sm ${
          tab === "CONTRIBUTION"
            ? "bg-zinc-900 text-white"
            : "bg-white"
        }`}
      >
        Cotisations
      </button>

      <button
        onClick={() => setTab("OTHER")}
        className={`rounded-xl border px-4 py-2 text-sm ${
          tab === "OTHER"
            ? "bg-zinc-900 text-white"
            : "bg-white"
        }`}
      >
        Autres recettes
      </button>

    </div>
  );
}