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
        className={`rounded-md border px-5 py-2 text-sm font-semibold transition-all ${
          tab === "CONTRIBUTION"
            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-transparent shadow-sm scale-[1.02]"
            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
        }`}
      >
        Cotisations
      </button>

      <button
        onClick={() => setTab("OTHER")}
        className={`rounded-md border px-5 py-2 text-sm font-semibold transition-all ${
          tab === "OTHER"
            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-transparent shadow-sm scale-[1.02]"
            : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
        }`}
      >
        Autres recettes
      </button>

    </div>
  );
}