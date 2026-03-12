"use client";

import { useEffect, useState } from "react";
import { Table, THead, TR, TH, TD } from "@/components/ui/Table";
import { OtherReceiptModal } from "./OtherReceiptModal";

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

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString();
}

export function OtherReceiptsTab() {
  const [items, setItems] = useState<OtherReceipt[]>([]);
  const [page, setPage] = useState(1);
const [pageSize] = useState(50);
const [totalPages, setTotalPages] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OtherReceipt | null>(null);

async function load() {
  const res = await fetch(
    `/api/receipts?page=${page}&pageSize=${pageSize}&type=OTHER`,
    { cache: "no-store" }
  );
  const data = await res.json().catch(() => null);
  setItems(Array.isArray(data?.items) ? data.items : []);
  setTotalPages(Number(data?.pagination?.totalPages ?? 1));
}

  useEffect(() => {
    load();
  }, [page]);

  async function remove(id: string) {
    const ok = window.confirm("Supprimer cette autre recette ?");
    if (!ok) return;

    const res = await fetch(`/api/other-receipts/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) return;

    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="rounded-xl bg-blue-600 px-4 py-2 text-white"
        >
          + Ajouter
        </button>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>N°</TH>
            <TH>Date</TH>
            <TH>Type</TH>
            <TH>Description</TH>
            <TH>Méthode</TH>
            <TH className="text-right">Montant</TH>
            <TH></TH>
          </TR>
        </THead>

        <tbody>
          {items.map((r) => (
            <TR key={r.id}>
              <TD>{r.receiptNumber}</TD>
              <TD>{fmtDate(r.date)}</TD>
              <TD>{r.type}</TD>
              <TD>{r.description}</TD>
              <TD>{r.method}</TD>
              <TD className="text-right">
                {Number(r.amount).toLocaleString("fr-FR")} MAD
              </TD>
              <TD className="text-right">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditing(r);
                      setOpen(true);
                    }}
                    className="rounded-lg border px-3 py-1 text-sm hover:bg-zinc-50"
                  >
                    Modifier
                  </button>

                  <button
                    onClick={() => remove(r.id)}
                    className="rounded-lg border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </TD>
            </TR>
          ))}
        </tbody>
      </Table>
<div className="flex gap-2 mt-4">
  <button
    disabled={page === 1}
    onClick={() => setPage(page - 1)}
  >
    Previous
  </button>

  <span>
    Page {page} / {totalPages}
  </span>

  <button
    disabled={page === totalPages}
    onClick={() => setPage(page + 1)}
  >
    Next
  </button>
</div>
      <OtherReceiptModal
        open={open}
        receipt={editing}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSaved={load}
      />
    </div>
  );
}