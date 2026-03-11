"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";

type Method = "CASH" | "TRANSFER" | "CHECK";
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
  bankRef?: string | null;
  note?: string | null;
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

  const [type, setType] = useState<OtherReceiptType>("OTHER");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bankName, setBankName] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (!receipt) {
      setType("OTHER");
      setDescription("");
      setAmount("");
      setMethod("CASH");
      setDate(new Date().toISOString().slice(0, 10));
      setBankName("");
      setBankRef("");
      setNote("");
      return;
    }

    setType(receipt.type ?? "OTHER");
    setDescription(receipt.description ?? "");
    setAmount(String(receipt.amount ?? ""));
    setMethod(receipt.method ?? "CASH");
    setDate(String(receipt.date).slice(0, 10));
    setBankName(receipt.bankName ?? "");
    setBankRef(receipt.bankRef ?? "");
    setNote(receipt.note ?? "");
  }, [open, receipt]);

  async function save() {
    if (busy) return;
    if (!description.trim()) return;
    if (Number(amount) <= 0) return;
    if ((method === "TRANSFER" || method === "CHECK") && !bankName.trim()) return;
    if (method === "CHECK" && !bankRef.trim()) return;

    setBusy(true);

    try {
      const res = await fetch(
        isEdit ? `/api/other-receipts/${receipt!.id}` : "/api/other-receipts",
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
            bankRef,
            note,
          }),
        }
      );

      if (!res.ok) return;

      onSaved();
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
        <div>
          <label className="text-sm font-medium">Type</label>
          <select
            className="h-10 w-full rounded-xl border px-3"
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
            className="h-10 w-full rounded-xl border px-3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Loyer local commercial"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Montant</label>
          <input
            className="h-10 w-full rounded-xl border px-3"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Ex: 1200"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Méthode</label>
          <select
            className="h-10 w-full rounded-xl border px-3"
            value={method}
            onChange={(e) => setMethod(e.target.value as Method)}
          >
            <option value="CASH">Espèces</option>
            <option value="TRANSFER">Virement</option>
            <option value="CHECK">Chèque</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Date</label>
          <input
            type="date"
            className="h-10 w-full rounded-xl border px-3"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {method !== "CASH" && (
          <div>
            <label className="text-sm font-medium">Banque</label>
            <input
              className="h-10 w-full rounded-xl border px-3"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Nom de la banque"
            />
          </div>
        )}

        {method === "CHECK" && (
          <div>
            <label className="text-sm font-medium">Numéro de chèque</label>
            <input
              className="h-10 w-full rounded-xl border px-3"
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
              className="h-10 w-full rounded-xl border px-3"
              value={bankRef}
              onChange={(e) => setBankRef(e.target.value)}
              placeholder="Référence du virement"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Note</label>
          <textarea
            className="w-full rounded-xl border px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note optionnelle"
          />
        </div>

        <button
          onClick={save}
          disabled={
            busy ||
            !description.trim() ||
            Number(amount) <= 0 ||
            ((method === "TRANSFER" || method === "CHECK") && !bankName.trim()) ||
            (method === "CHECK" && !bankRef.trim())
          }
          className="h-11 rounded-xl bg-blue-600 text-white disabled:opacity-50"
        >
          {busy ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Enregistrer"}
        </button>
      </div>
    </Modal>
  );
}