"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useApiUrl } from "@/lib/org-context";
import { DateInput } from "@/components/ui/DateInput";
import { getTodayInputVal, toDisplayDate } from "@/lib/date-utils";

type Method = "CASH" | "TRANSFER" | "CHECK" | "BANK_DEPOSIT";
type OtherReceiptType = "RENT" | "OTHER";

type OtherReceipt = {
  id: string;
  receiptNumber: number;
  type: OtherReceiptType;
  description: string;
  date: string;
  method: Method;
  amount: number;
  bankName?: string | null;
  bankId?: string | null;
  bankRef?: string | null;
  note?: string | null;
};

type InternalBank = {
  id: string;
  name: string;
  isActive: boolean;
};

export function OtherReceiptModal({
  open,
  onClose,
  onSaved,
  receipt,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  receipt: OtherReceipt | null;
}) {
  const isEdit = Boolean(receipt);
  const apiUrl = useApiUrl();

  const [type, setType] = useState<OtherReceiptType>("OTHER");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [date, setDate] = useState(() => getTodayInputVal());
  const [bankName, setBankName] = useState("");
  const [bankId, setBankId] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [note, setNote] = useState("");
  const [banks, setBanks] = useState<InternalBank[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (!receipt) {
      setType("OTHER");
      setDescription("");
      setAmount("");
      setMethod("CASH");
      setDate(getTodayInputVal());
      setBankName("");
      setBankId("");
      setBankRef("");
      setNote("");
      setError("");
    } else {
      setType(receipt.type ?? "OTHER");
      setDescription(receipt.description ?? "");
      setAmount(String(receipt.amount ?? ""));
      setMethod(receipt.method ?? "CASH");
      setDate(receipt.date ? String(receipt.date).slice(0, 10) : getTodayInputVal());
      setBankName(receipt.bankName ?? "");
      setBankId(receipt.bankId ?? "");
      setBankRef(receipt.bankRef ?? "");
      setNote(receipt.note ?? "");
      setError("");
    }

    async function loadBanks() {
      try {
        const res = await fetch(apiUrl("/api/internal-banks"));
        const json = await res.json();
        setBanks(Array.isArray(json) ? json.filter((b: any) => b.isActive) : []);
      } catch (err) {
        console.error("Failed to load banks:", err);
      }
    }
    void loadBanks();
  }, [open, receipt, apiUrl]);

  async function save() {
    if (busy) return;
    if (!description.trim()) return;
    if (Number(amount) <= 0) return;
    if (((method === "TRANSFER" || method === "CHECK" || method === "BANK_DEPOSIT") && !bankName.trim()) ||
        (method === "CHECK" && !bankRef.trim())) return;

    setBusy(true);
    setError("");

    try {
      const res = await fetch(
        apiUrl(
          isEdit ? `/api/other-receipts/${receipt!.id}` : "/api/other-receipts"
        ),
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            description,
            amount: Number(amount),
            method,
            date,
            bankName,
            bankId: bankId || null,
            bankRef,
            note,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Impossible d'enregistrer cette recette");
        return;
      }

      await Promise.resolve(onSaved());
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Modifier une autre recette" : "Ajouter une autre recette"}
      containerClassName="w-[min(850px,94vw)]"
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-zinc-700">Type de recette</label>
              <select
                className="h-12 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-900"
                value={type}
                onChange={(e) => setType(e.target.value as OtherReceiptType)}
              >
                <option value="RENT">Loyer</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-zinc-700">Description / Objet</label>
              <input
                className="h-12 w-full rounded-md border border-zinc-200 px-4 text-sm outline-none focus:border-zinc-900"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Loyer local commercial"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-zinc-700">Montant (MAD)</label>
              <input
                className="h-12 w-full rounded-md border border-zinc-200 px-4 text-sm outline-none focus:border-zinc-900"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="Ex: 1200"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-zinc-700">Date de l'opération</label>
              <DateInput
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-zinc-700">Méthode de paiement</label>
              <select
                className="h-12 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-900"
                value={method}
                onChange={(e) => {
                  const m = e.target.value as Method;
                  setMethod(m);
                  if (m === "BANK_DEPOSIT") {
                    const totalWithFee = (Number(amount) || 0) + 1;
                    const displayDate = toDisplayDate(date);
                    const feeText = `Versement d'un montant de ${totalWithFee} DH avec une retenue de 1 DH pour les frais de timbre à la date du ${displayDate}`;
                    
                    if (!note.includes("frais de timbre")) {
                      setNote(prev => prev ? `${prev}\n${feeText}` : feeText);
                    } else {
                      setNote(prev => {
                        const lines = prev.split("\n");
                        const filtered = lines.filter(l => !l.includes("frais de timbre"));
                        return [...filtered, feeText].join("\n").trim();
                      });
                    }
                  }
                }}
              >
                <option value="CASH">Espèces</option>
                <option value="TRANSFER">Virement</option>
                <option value="CHECK">Chèque</option>
                <option value="BANK_DEPOSIT">Versement</option>
              </select>
            </div>

            {(method === "TRANSFER" || method === "CHECK" || method === "BANK_DEPOSIT") && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="mb-1.5 block text-sm font-semibold text-zinc-700">Banque de destination</label>
                <select
                  className="h-12 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-900"
                  value={bankId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setBankId(id);
                    const bank = banks.find(b => b.id === id);
                    setBankName(bank ? bank.name : "");
                  }}
                >
                  <option value="">Sélectionner une banque</option>
                  {banks.map(bank => (
                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {(method === "CHECK" || method === "TRANSFER") && (
          <div className="animate-in fade-in slide-in-from-top-2">
            <label className="mb-1.5 block text-sm font-semibold text-zinc-700">
              {method === "CHECK" ? "Numéro de chèque" : "Référence du virement"}
            </label>
            <input
              className="h-12 w-full rounded-md border border-zinc-200 px-4 text-sm outline-none focus:border-zinc-900"
              value={bankRef}
              onChange={(e) => setBankRef(e.target.value)}
              placeholder={method === "CHECK" ? "Ex: 1234567" : "Ex: VIR-987654"}
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-zinc-700">Observations / Note</label>
          <textarea
            className="min-h-[100px] w-full rounded-md border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-900 shadow-sm"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note facultative..."
          />
        </div>

        <div className="flex justify-center pt-4 border-t border-zinc-100">
          <button onClick={save}
            disabled={
              busy ||
              !description.trim() ||
              Number(amount) <= 0 ||
              ((method === "TRANSFER" || method === "CHECK" || method === "BANK_DEPOSIT") && !bankName.trim()) ||
              (method === "CHECK" && !bankRef.trim())
            }
            className="btn-brand h-12 w-full px-12 text-sm font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 sm:w-auto min-w-[220px]"
          >
            {busy ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Enregistrer la recette"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
