"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Pencil, Plus, Trash2, TrendingDown, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { canManage } from "@/lib/roles";
import { useApiUrl } from "@/lib/org-context";
import { useActiveYear } from "@/lib/use-active-year";

type AccountingPost = {
  id: string;
  code: string;
  name: string;
  postType: "CHARGE" | "PRODUCT";
  isActive: boolean;
};

type BudgetLine = {
  accountingPost: AccountingPost;
  budgetId: string | null;
  budgetAmount: number;
  paidAmount: number;
  executionPercent: number;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function ProgressBar({ percent, color }: { percent: number; color: string }) {
  const clampedPercent = Math.min(percent, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 flex-1 overflow-hidden rounded-full bg-zinc-200">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      <span className="min-w-[40px] text-xs font-semibold">{percent}%</span>
    </div>
  );
}

function BudgetAmountModal({
  line,
  year,
  onSave,
  onClose,
}: {
  line: BudgetLine;
  year: number;
  onSave: (line: BudgetLine, amount: number) => Promise<void>;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(
    line.budgetAmount > 0 ? String(line.budgetAmount) : ""
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const parsedAmount = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) return;

    setSubmitting(true);
    try {
      await onSave(line, parsedAmount);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            {line.budgetId ? "Modifier le budget" : "Budgetiser le poste"}
          </h2>
          <button onClick={onClose} className="text-2xl text-zinc-400 hover:text-zinc-600">
            &times;
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="rounded-xl bg-zinc-50 p-4">
            <div className="font-mono text-sm font-semibold text-indigo-600">
              {line.accountingPost.code}
            </div>
            <div className="mt-1 text-sm text-zinc-700">{line.accountingPost.name}</div>
            <div className="mt-2 text-xs text-zinc-500">Exercice {year}</div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">
              Montant budgete (MAD)
            </label>
            <input
              type="text"
              inputMode="decimal"
              className="h-12 w-full rounded-xl border border-zinc-200 px-4 text-sm outline-none"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <button
            onClick={() => void handleSubmit()}
            disabled={submitting || !amount.trim()}
            className="btn-brand h-12 w-full rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  line,
  onConfirm,
  onClose,
}: {
  line: BudgetLine;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Supprimer le budget</h2>
          <button onClick={onClose} className="text-2xl text-zinc-400 hover:text-zinc-600">
            &times;
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-zinc-600">
            Supprimer le budget pour{" "}
            <span className="font-semibold text-zinc-900">
              {line.accountingPost.code} - {line.accountingPost.name}
            </span>
            ?
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            Le poste comptable restera actif, seul le montant budgete sera retire.
          </p>

          <div className="mt-5 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm font-medium text-zinc-700"
            >
              Annuler
            </button>
            <button
              onClick={() => void onConfirm()}
              className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-medium text-white"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetTable({
  title,
  lines,
  totalBudget,
  totalPaid,
  accentColor,
  canEdit,
  onEdit,
  onDelete,
}: {
  title: string;
  lines: BudgetLine[];
  totalBudget: number;
  totalPaid: number;
  accentColor: "red" | "green";
  canEdit: boolean;
  onEdit: (line: BudgetLine) => void;
  onDelete: (line: BudgetLine) => void;
}) {
  const colorClasses =
    accentColor === "red"
      ? {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-600",
          bar: "bg-red-500",
          headerBg: "bg-red-100",
        }
      : {
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-600",
          bar: "bg-green-500",
          headerBg: "bg-green-100",
        };

  return (
    <div className="page-sticky-table page-section-inline">
      <div className={`${colorClasses.headerBg} border-b ${colorClasses.border} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-800">{title}</h3>
          <span className="text-xs text-zinc-500">
            {lines.length} poste{lines.length !== 1 ? "s" : ""} actif{lines.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-2 text-left font-semibold">Poste</th>
            <th className="px-4 py-2 text-right font-semibold">Budget (MAD)</th>
            <th className="px-4 py-2 text-right font-semibold">Engage (MAD)</th>
            <th className="px-4 py-2 text-right font-semibold">%</th>
            {canEdit ? <th className="px-4 py-2 w-[104px]"></th> : null}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={canEdit ? 5 : 4} className="px-4 py-8 text-center text-sm text-zinc-500">
                Aucun poste actif pour cette categorie.
              </td>
            </tr>
          ) : (
            lines.map((line) => (
              <tr
                key={line.accountingPost.id}
                className={`border-b border-zinc-50 text-sm hover:bg-zinc-50 ${
                  canEdit ? "cursor-pointer" : ""
                }`}
                onClick={canEdit ? () => onEdit(line) : undefined}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold text-indigo-600">
                    {line.accountingPost.code}
                  </span>
                  <span className="ml-2 text-zinc-700">{line.accountingPost.name}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-zinc-900">
                  {line.budgetAmount > 0 ? formatMoney(line.budgetAmount) : "—"}
                </td>
                <td className={`whitespace-nowrap px-4 py-3 text-right font-medium ${colorClasses.text}`}>
                  {line.paidAmount > 0 ? formatMoney(line.paidAmount) : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {line.budgetAmount > 0 ? (
                    <ProgressBar
                      percent={line.executionPercent}
                      color={
                        line.executionPercent > 100
                          ? "bg-red-500"
                          : line.executionPercent > 80
                          ? "bg-orange-500"
                          : colorClasses.bar
                      }
                    />
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                {canEdit ? (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(line);
                        }}
                        className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50"
                        title={line.budgetId ? "Modifier le montant" : "Budgetiser"}
                      >
                        {line.budgetId ? <Pencil size={16} /> : <Plus size={16} />}
                      </button>
                      {line.budgetId ? (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            onDelete(line);
                          }}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                          title="Supprimer le budget"
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className={`${colorClasses.bg} border-t ${colorClasses.border} font-semibold`}>
            <td className="px-4 py-3 text-zinc-700">TOTAL</td>
            <td className="whitespace-nowrap px-4 py-3 text-right text-zinc-900">
              {formatMoney(totalBudget)}
            </td>
            <td className={`whitespace-nowrap px-4 py-3 text-right ${colorClasses.text}`}>
              {formatMoney(totalPaid)}
            </td>
            <td className="px-4 py-3"></td>
            {canEdit ? <td className="px-4 py-3"></td> : null}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function BudgetsPageContent() {
  const { data: session } = useSession();
  const activeYear = useActiveYear();
  const year = Number(activeYear);
  const canEdit = canManage(session?.user?.role);
  const apiUrl = useApiUrl();

  const [charges, setCharges] = useState<BudgetLine[]>([]);
  const [products, setProducts] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingLine, setEditingLine] = useState<BudgetLine | null>(null);
  const [deleteLine, setDeleteLine] = useState<BudgetLine | null>(null);

  const totalChargeBudget = charges.reduce((sum, c) => sum + c.budgetAmount, 0);
  const totalChargePaid = charges.reduce((sum, c) => sum + c.paidAmount, 0);
  const totalProductBudget = products.reduce((sum, p) => sum + p.budgetAmount, 0);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(""), 3000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const budgetsRes = await fetch(apiUrl(`/api/budgets?year=${year}`), {
      cache: "no-store",
    });
    const budgetsJson = await budgetsRes.json();

    setCharges(Array.isArray(budgetsJson.charges) ? budgetsJson.charges : []);
    setProducts(Array.isArray(budgetsJson.products) ? budgetsJson.products : []);
    setLoading(false);
  }, [apiUrl, year]);

  useEffect(() => {
    const run = async () => {
      await load();
    };

    void run();
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [load]);

  async function handleSaveBudget(line: BudgetLine, amount: number) {
    const res = await fetch(apiUrl("/api/budgets"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountingPostId: line.accountingPost.id,
        year,
        amount,
      }),
    });

    if (res.ok) {
      await load();
      setEditingLine(null);
      showToast(line.budgetId ? "Montant mis a jour" : "Budget enregistre");
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err?.error || "Erreur");
    }
  }

  async function handleDeleteBudget() {
    if (!deleteLine?.budgetId) return;

    const res = await fetch(apiUrl("/api/budgets"), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteLine.budgetId }),
    });

    if (res.ok) {
      await load();
      setDeleteLine(null);
      showToast("Budget supprime");
    }
  }

  const balance = totalProductBudget - totalChargeBudget;
  const remaining = totalChargeBudget - totalChargePaid;

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="fixed right-6 top-6 z-[100] rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="page-section-inline">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Budget Previsionnel {year}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Cette page n&apos;affiche que les postes comptables actifs. Clique sur une ligne ou sur l&apos;icone pour budgetiser ou modifier le montant.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center">
          <div className="text-sm text-zinc-500">Chargement...</div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-100 p-2">
                  <Wallet className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-sm font-medium text-zinc-500">Budget depenses</span>
              </div>
              <div className="mt-3 text-2xl font-bold text-zinc-900">
                {formatMoney(totalChargeBudget)}
              </div>
              <div className="mt-1 text-xs text-zinc-400">MAD</div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-red-100 p-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <span className="text-sm font-medium text-zinc-500">Depenses reelles</span>
              </div>
              <div className="mt-3 text-2xl font-bold text-red-600">
                {formatMoney(totalChargePaid)}
              </div>
              <div className="mt-1 text-xs text-zinc-400">
                sur {formatMoney(totalChargeBudget)} MAD
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-green-100 p-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-zinc-500">Solde budgetaire</span>
              </div>
              <div className={`mt-3 text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatMoney(balance)}
              </div>
              <div className="mt-1 text-xs text-zinc-400">MAD</div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-amber-100 p-2">
                  <PiggyBank className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-zinc-500">Reste a depenser</span>
              </div>
              <div className={`mt-3 text-2xl font-bold ${remaining >= 0 ? "text-amber-600" : "text-red-600"}`}>
                {formatMoney(remaining)}
              </div>
              <div className="mt-1 text-xs text-zinc-400">MAD</div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BudgetTable
              title="CHARGES (Classe 6)"
              lines={charges}
              totalBudget={totalChargeBudget}
              totalPaid={totalChargePaid}
              accentColor="red"
              canEdit={canEdit}
              onEdit={setEditingLine}
              onDelete={setDeleteLine}
            />

            <BudgetTable
              title="PRODUITS (Classe 7)"
              lines={products}
              totalBudget={totalProductBudget}
              totalPaid={0}
              accentColor="green"
              canEdit={canEdit}
              onEdit={setEditingLine}
              onDelete={setDeleteLine}
            />
          </div>
        </>
      )}

      {canEdit && editingLine ? (
        <BudgetAmountModal
          line={editingLine}
          year={year}
          onSave={handleSaveBudget}
          onClose={() => setEditingLine(null)}
        />
      ) : null}

      {canEdit && deleteLine ? (
        <DeleteConfirmModal
          line={deleteLine}
          onConfirm={handleDeleteBudget}
          onClose={() => setDeleteLine(null)}
        />
      ) : null}
    </div>
  );
}

export default function BudgetsPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center">
          <div className="text-sm text-zinc-500">Chargement du budget...</div>
        </div>
      }
    >
      <BudgetsPageContent />
    </Suspense>
  );
}
