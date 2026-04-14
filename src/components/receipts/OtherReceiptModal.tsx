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
    >
      <div className="grid gap-4">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div>
          <label className="text-sm font-medium">Type</label>
          <select
            className="h-10 w-full rounded-md border px-3"
            value={type}
            onChange={(e) => setType(e.target.value as OtherReceiptType)}
          >
            <option value="RENT">Loyer</option>
            <option value="OTHER">Autre</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <input
            className="h-10 w-full rounded-md border px-3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Loyer local commercial"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Montant</label>
          <input
            className="h-10 w-full rounded-md border px-3"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Ex: 1200"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Méthode</label>
          <select
            className="h-10 w-full rounded-md border px-3"
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

        <div>
          <label className="text-sm font-medium">Date (JJ/MM/AAAA)</label>
          <DateInput
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {method !== "CASH" && (
          <div>
            <label className="text-sm font-medium">Banque</label>
            <select
              className="h-10 w-full rounded-md border px-3"
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

        {method === "CHECK" && (
          <div>
            <label className="text-sm font-medium">Numéro de chèque</label>
            <input
              className="h-10 w-full rounded-md border px-3"
              value={bankRef}
              onChange={(e) => setBankRef(e.target.value)}
              placeholder="Numéro du chèque"
            />
          </div>
        )}

        {method === "TRANSFER" && (
          <div>
            <label className="text-sm font-medium">Référence bancaire</label>
            <input
              className="h-10 w-full rounded-md border px-3"
              value={bankRef}
              onChange={(e) => setBankRef(e.target.value)}
              placeholder="Référence du virement"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Note</label>
          <textarea
            className="w-full rounded-md border px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note optionnelle"
          />
        </div>

        <button onClick={save}
          disabled={
            busy ||
            !description.trim() ||
            Number(amount) <= 0 ||
            ((method === "TRANSFER" || method === "CHECK" || method === "BANK_DEPOSIT") && !bankName.trim()) ||
            (method === "CHECK" && !bankRef.trim())
          }
          className="flex items-center justify-center gap-2 btn-brand h-12 w-full rounded-md disabled:opacity-50"
        >
          {busy ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Enregistrer la recette"}
        </button>
      </div>
    </Modal>
  );
}
