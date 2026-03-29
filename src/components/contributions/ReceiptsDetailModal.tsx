"use client";

import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { useApiUrl } from "@/lib/org-context";
import { FileText, Calendar, Wallet, Receipt as ReceiptIcon, ArrowRight } from "lucide-react";

type Receipt = {
  id: string;
  receiptNumber: string;
  date: string;
  amount: number;
  method: string;
  note: string | null;
};

export function ReceiptsDetailModal({
  open,
  onClose,
  unitId,
  unitName,
  year,
}: {
  open: boolean;
  onClose: () => void;
  unitId: string | null;
  unitName: string | null;
  year: number;
}) {
  const apiUrl = useApiUrl();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !unitId || !year) return;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/receipts?unitId=${unitId}&year=${year}&pageSize=100`));
        const json = await res.json();
        setReceipts(json.items || []);
      } catch (err) {
        console.error("Failed to load receipts:", err);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [open, unitId, year, apiUrl]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Détail des règlements - Lot ${unitName || ""} (${year})`}
      containerClassName="w-[min(840px,95vw)]"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-zinc-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-200 border-t-sky-500" />
            <span className="mt-4">Chargement des reçus...</span>
          </div>
        ) : receipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-zinc-50 p-4">
              <ReceiptIcon className="h-8 w-8 text-zinc-300" />
            </div>
            <div className="mt-4 text-sm font-medium text-zinc-900">Aucun reçu trouvé</div>
            <p className="mt-1 text-xs text-zinc-500">
              Il n'y a aucun règlement enregistré pour ce lot sur l'exercice {year}.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-zinc-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">N° Reçu</th>
                  <th className="px-4 py-3 font-semibold text-zinc-700">Méthode</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                        <span>{new Date(r.date).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 font-mono text-xs">
                      #{r.receiptNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-3.5 w-3.5 text-zinc-400" />
                        <span className="text-zinc-600">
                          {r.method === "CASH" ? "Espèces" : r.method === "TRANSFER" ? "Virement" : r.method === "CHECK" ? "Chèque" : r.method}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-zinc-900">
                      {r.amount.toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      dh
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-zinc-50/50 border-t border-zinc-200">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-zinc-700">Total</td>
                  <td className="px-4 py-3 text-right text-base font-bold text-emerald-600">
                    {receipts.reduce((sum, r) => sum + Number(r.amount), 0).toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    dh
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
}
