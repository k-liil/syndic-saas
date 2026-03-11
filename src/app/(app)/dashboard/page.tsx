"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CreditCard,
} from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";

type DashboardData = {
  totalReceipts: number;
  totalPayments: number;
  cashBalance: number;
  bankBalance: number;
  receiptsByMonth: number[];
  paymentsByMonth: number[];

  collectionRate: number;
  ownersCount: number;
  paidOwnersCount: number;

  expensesByCategory: {
    categoryName: string;
    amount: number;
  }[];
};

function formatMAD(value: number) {
  return `${value.toLocaleString("fr-FR")} MAD`;
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconWrapClassName,
  iconClassName,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconWrapClassName: string;
  iconClassName: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            {title}
          </div>
          <div className="mt-3 text-[18px] font-extrabold tracking-tight text-slate-900 sm:text-[22px]">
            {value}
          </div>
          <div className="mt-2 text-sm text-slate-500">{subtitle}</div>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconWrapClassName}`}
        >
          <Icon size={18} className={iconClassName} />
        </div>
      </div>
    </div>
  );
}



export default function HomePage() {
  const searchParams = useSearchParams();
  const year = searchParams.get("year");
const hasYear = Boolean(year);

const [data, setData] = useState<DashboardData>({
  totalReceipts: 0,
  totalPayments: 0,
  cashBalance: 0,
  bankBalance: 0,
  receiptsByMonth: new Array(12).fill(0),
  paymentsByMonth: new Array(12).fill(0),

  collectionRate: 0,
  ownersCount: 0,
  paidOwnersCount: 0,
  expensesByCategory: []
});

useEffect(() => {
  if (!year) return;

  fetch(`/api/dashboard?year=${year}`, { cache: "no-store" })
    .then((r) => r.json())
    .then((json) => {

      setData({
        totalReceipts: Number(json?.totalReceipts ?? 0),
        totalPayments: Number(json?.totalPayments ?? 0),
        cashBalance: Number(json?.cashBalance ?? 0),
        bankBalance: Number(json?.bankBalance ?? 0),

        receiptsByMonth: Array.isArray(json?.receiptsByMonth)
          ? json.receiptsByMonth
          : new Array(12).fill(0),

        paymentsByMonth: Array.isArray(json?.paymentsByMonth)
          ? json.paymentsByMonth
          : new Array(12).fill(0),

        collectionRate: Number(json?.collectionRate ?? 0),
        ownersCount: Number(json?.ownersCount ?? 0),
        paidOwnersCount: Number(json?.paidOwnersCount ?? 0),

        expensesByCategory: Array.isArray(json?.expensesByCategory)
          ? json.expensesByCategory
          : []
      });

    })
    .catch(() => {
      setData({
        totalReceipts: 0,
        totalPayments: 0,
        cashBalance: 0,
        bankBalance: 0,
        receiptsByMonth: new Array(12).fill(0),
        paymentsByMonth: new Array(12).fill(0),

        collectionRate: 0,
        ownersCount: 0,
        paidOwnersCount: 0,
        expensesByCategory: [],
      });
    });
}, [year]);

  const totalBalance = useMemo(() => {
    return data.cashBalance + data.bankBalance;
  }, [data.cashBalance, data.bankBalance]);

  const chartMax = useMemo(() => {
    const base = Math.max(data.totalReceipts, data.totalPayments, 1);
    return Math.ceil(base / 100) * 100;
  }, [data.totalReceipts, data.totalPayments]);

  const receiptHeight = `${Math.max(
    6,
    Math.round((data.totalReceipts / chartMax) * 100)
  )}%`;

  const paymentHeight = `${Math.max(
    6,
    Math.round((data.totalPayments / chartMax) * 100)
  )}%`;

const maxMonthValue = useMemo(() => {
  const max = Math.max(...data.receiptsByMonth, ...data.paymentsByMonth, 1);
  return Math.ceil(max / 500) * 500;
}, [data.receiptsByMonth, data.paymentsByMonth]);

const chartData = useMemo(() => {
  const MONTHS = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];

  return MONTHS.map((month, i) => ({
    month,
    encaisses: data.receiptsByMonth[i] ?? 0,
    depenses: data.paymentsByMonth[i] ?? 0,
  }));
}, [data.receiptsByMonth, data.paymentsByMonth]);

const paidOwners = Number(data.paidOwnersCount ?? 0);
const unpaidOwners = Math.max(
  Number(data.ownersCount ?? 0) - Number(data.paidOwnersCount ?? 0),
  0
);

const collectionPie =
  paidOwners > 0
    ? [
        { name: "Payé", value: paidOwners },
        { name: "Non payé", value: unpaidOwners },
      ]
    : [];

const COLORS_COLLECTION = ["#22c55e", "#e5e7eb"];

const COLORS_EXPENSES = [
  "#38bdf8",
  "#fbbf24",
  "#f87171",
  "#a78bfa",
  "#34d399"
];

const totalExpensesAmount = data.expensesByCategory.reduce(
  (sum, item) => sum + Number(item.amount ?? 0),
  0
);
if (!hasYear) {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow">
        <div className="text-lg font-semibold text-zinc-800">
          Aucun exercice sélectionné
        </div>
        <div className="mt-2 text-sm text-zinc-500">
          Créez ou sélectionnez un exercice fiscal pour afficher le tableau de bord.
        </div>
      </div>
    </div>
  );
}
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-950 sm:text-[24px]">
          Tableau de Bord
        </h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Exercice {year}
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-4">
        <KpiCard
          title={`Total encaissé (exercice ${year})`}
          value={formatMAD(data.totalReceipts)}
          subtitle="Recettes encaissées"
          icon={ArrowUpRight}
          iconWrapClassName="bg-emerald-50"
          iconClassName="text-emerald-600"
        />

        <KpiCard
          title={`Total dépensé (exercice ${year})`}
          value={formatMAD(data.totalPayments)}
          subtitle="Charges payées"
          icon={ArrowDownRight}
          iconWrapClassName="bg-rose-50"
          iconClassName="text-rose-600"
        />

        <KpiCard
          title="Solde actuel"
          value={formatMAD(totalBalance)}
          subtitle={`Caisse ${formatMAD(data.cashBalance)} • Banque ${formatMAD(
            data.bankBalance
          )}`}
          icon={CreditCard}
          iconWrapClassName="bg-sky-50"
          iconClassName="text-sky-600"
        />

        <KpiCard
          title={`Créances en retard (${year})`}
          value="0"
          subtitle="Calcul à venir"
          icon={AlertTriangle}
          iconWrapClassName="bg-amber-50"
          iconClassName="text-amber-600"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="text-[22px] font-semibold tracking-tight text-slate-900">
              Flux de Trésorerie ({year})
            </div>
          </div>

          <div className="px-6 pb-6 pt-5">
            <div className="relative h-[300px] rounded-[24px] bg-gradient-to-b from-slate-50 to-white px-6 py-6">


<ResponsiveContainer width="100%" height={300}>
  <BarChart
    data={chartData}
    margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
    barCategoryGap="55%"
  >
    <CartesianGrid
      vertical={false}
      stroke="#e2e8f0"
      strokeDasharray="3 3"
    />

    <XAxis
      dataKey="month"
      tickLine={false}
      axisLine={{ stroke: "#94a3b8", strokeWidth: 1.4 }}
      tick={{ fill: "#64748b", fontSize: 12 }}
    />

<YAxis
  tickLine={false}
  axisLine={false}
  width={52}
  tick={{ fill: "#64748b", fontSize: 12 }}
  tickFormatter={(v)=>`${v}`}
/>

<Tooltip
  cursor={{ fill: "rgba(148,163,184,0.08)" }}
  contentStyle={{
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
    background: "#ffffff"
  }}
  formatter={(value:number,name:string)=>[
    `${Number(value).toLocaleString("fr-FR")} MAD`,
    name === "encaisses" ? "Encaissé" : "Dépensé"
  ]}
/>

<Bar
  dataKey="encaisses"
  fill="#38bdf8"
  radius={[6,6,0,0]}
  barSize={26}
  animationDuration={900}
/>

<Bar
  dataKey="depenses"
  fill="#fbbf24"
  radius={[6,6,0,0]}
  barSize={26}
  animationDuration={900}
/>
  </BarChart>
</ResponsiveContainer>

              <div className="mt-2 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="h-3 w-3 rounded-sm bg-sky-500" />
                  Encaissé
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="h-3 w-3 rounded-sm bg-amber-400" />
                  Dépensé
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="text-[22px] font-semibold tracking-tight text-slate-900">
              Derniers Encaissements
            </div>
          </div>

          <div className="px-6 py-5">
            {data.totalReceipts <= 0 ? (
              <div className="flex h-[300px] items-center justify-center rounded-[22px] bg-slate-50 text-sm font-medium text-slate-400">
                Aucun encaissement récent.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-500 text-sm font-bold text-white">
                      R
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Encaissements de l’exercice
                      </div>
                      <div className="text-xs text-slate-500">
                        Exercice {year}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-600">
                      +{formatMAD(data.totalReceipts)}
                    </div>
                    <div className="text-xs text-slate-500">Total reçu</div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Solde caisse
                    </div>
                    <div className="text-xs text-slate-500">
                      Situation actuelle
                    </div>
                  </div>

                  <div className="text-sm font-bold text-slate-900">
                    {formatMAD(data.cashBalance)}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Solde banque
                    </div>
                    <div className="text-xs text-slate-500">
                      Situation actuelle
                    </div>
                  </div>

                  <div className="text-sm font-bold text-slate-900">
                    {formatMAD(data.bankBalance)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

<div className="grid gap-5 xl:grid-cols-2">

{/* Camembert taux encaissement */}
<div className="rounded-[30px] border border-white/70 bg-white/90 p-6 shadow">
  <div className="text-lg font-semibold mb-4">
    Taux d'encaissement copropriétaires
  </div>

  {paidOwners === 0 ? (
    <div className="flex h-[240px] items-center justify-center rounded-[22px] bg-slate-50 text-sm font-medium text-slate-400">
      Aucun copropriétaire n&apos;a encore payé
    </div>
  ) : (
    <>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={collectionPie}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
          >
            {collectionPie.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS_COLLECTION[index % COLORS_COLLECTION.length]}
              />
            ))}
          </Pie>

          <Tooltip formatter={(v: number) => `${v} copropriétaires`} />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 flex justify-center gap-6 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500" />
          Payé ({paidOwners})
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-slate-300" />
          Non payé ({unpaidOwners})
        </div>
      </div>
    </>
  )}

  <div className="text-center text-sm text-slate-500 mt-2">
    {data.collectionRate}% des copropriétaires ont payé
  </div>
</div>

{/* Camembert dépenses */}
<div className="rounded-[30px] border border-white/70 bg-white/90 p-6 shadow">
  <div className="text-lg font-semibold mb-4">
    Répartition des dépenses
  </div>

  {totalExpensesAmount <= 0 ? (
    <div className="flex h-[240px] items-center justify-center rounded-[22px] bg-slate-50 text-sm font-medium text-slate-400">
      Aucune dépense sur cet exercice
    </div>
  ) : (
    <>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={Array.isArray(data.expensesByCategory) ? data.expensesByCategory : []}
            dataKey="amount"
            nameKey="categoryName"
            innerRadius={60}
            outerRadius={90}
          >
            {(Array.isArray(data.expensesByCategory) ? data.expensesByCategory : []).map(
              (_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS_EXPENSES[index % COLORS_EXPENSES.length]}
                />
              )
            )}
          </Pie>

          <Tooltip
            formatter={(value: number, _name, item: { payload?: { amount?: number } }) => {
              const amount = Number(item?.payload?.amount ?? value ?? 0);
              const percent =
                totalExpensesAmount > 0
                  ? Math.round((amount / totalExpensesAmount) * 100)
                  : 0;

              return [`${amount.toLocaleString("fr-FR")} MAD (${percent}%)`, "Montant"];
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">

{(Array.isArray(data.expensesByCategory) ? data.expensesByCategory : []).map(
  (item, index) => {
    const amount = Number(item.amount ?? 0);
    const percent =
      totalExpensesAmount > 0
        ? Math.round((amount / totalExpensesAmount) * 100)
        : 0;

    const label =
      item.categoryName && item.categoryName.trim() !== ""
        ? item.categoryName
        : "Sans catégorie";



    return (
      <div key={`${label}-${index}`} className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: COLORS_EXPENSES[index % COLORS_EXPENSES.length] }}
        />
        {label} ({percent}%)
      </div>
    );
  }
)}

      </div>
    </>
  )}
</div>

</div>


      <div className="flex flex-wrap gap-3">
        <Link
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          href="/ops/payments"
        >
          Paiements →
        </Link>

        <Link
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          href="/ops/year-view"
        >
          Vue annuelle →
        </Link>

        <Link
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          href="/ops/dues/generate"
        >
          Générer cotisations →
        </Link>
      </div>
    </div>
  );
}