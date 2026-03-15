"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  Landmark,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

const emptyData: DashboardData = {
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
};

const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"];
const collectionColors = ["#22c55e", "#e5e7eb"];
const expensesColors = ["#38bdf8", "#f59e0b", "#f87171", "#8b5cf6", "#34d399", "#0f172a"];

function formatMAD(value: number) {
  return `${Number(value ?? 0).toLocaleString("fr-FR")} MAD`;
}

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)] ${className}`}
    >
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-[18px] font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: "emerald" | "rose" | "sky" | "amber";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <div className="border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </div>
          <div className="mt-2 text-[20px] font-extrabold tracking-tight text-slate-950 sm:text-[22px]">
            {value}
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</div>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center ${tones[tone]}`}
        >
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const year = searchParams.get("year");
  const hasYear = Boolean(year);
  const [data, setData] = useState<DashboardData>(emptyData);

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
            : emptyData.receiptsByMonth,
          paymentsByMonth: Array.isArray(json?.paymentsByMonth)
            ? json.paymentsByMonth
            : emptyData.paymentsByMonth,
          collectionRate: Number(json?.collectionRate ?? 0),
          ownersCount: Number(json?.ownersCount ?? 0),
          paidOwnersCount: Number(json?.paidOwnersCount ?? 0),
          expensesByCategory: Array.isArray(json?.expensesByCategory)
            ? json.expensesByCategory
            : [],
        });
      })
      .catch(() => setData(emptyData));
  }, [year]);

  const totalBalance = useMemo(
    () => data.cashBalance + data.bankBalance,
    [data.cashBalance, data.bankBalance]
  );

  const paidOwners = Number(data.paidOwnersCount ?? 0);
  const unpaidOwners = Math.max(Number(data.ownersCount ?? 0) - paidOwners, 0);

  const chartData = useMemo(
    () =>
      months.map((month, index) => ({
        month,
        encaisses: data.receiptsByMonth[index] ?? 0,
        depenses: data.paymentsByMonth[index] ?? 0,
      })),
    [data.paymentsByMonth, data.receiptsByMonth]
  );

  const collectionPie =
    paidOwners > 0
      ? [
          { name: "Paye", value: paidOwners },
          { name: "Non paye", value: unpaidOwners },
        ]
      : [];

  const totalExpensesAmount = data.expensesByCategory.reduce(
    (sum, item) => sum + Number(item.amount ?? 0),
    0
  );

  if (!hasYear) {
    return (
      <div className="flex h-[65vh] items-center justify-center">
        <div className="max-w-lg border border-slate-200 bg-white p-8 text-center shadow-[0_10px_26px_rgba(15,23,42,0.06)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center bg-slate-100 text-slate-700">
            <AlertTriangle size={24} />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
            Aucun exercice selectionne
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Creez ou selectionnez un exercice fiscal depuis l'en-tete pour afficher
            votre tableau de bord.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="border border-slate-200 bg-[linear-gradient(135deg,_rgba(248,250,252,0.98)_0%,_rgba(239,244,250,0.96)_100%)] p-6 text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="eyebrow text-sky-700">
              Tableau de bord
            </div>
            <h1 className="display-title mt-3 text-5xl font-semibold leading-[0.96] text-slate-950 sm:text-6xl">
              Vision globale de l'exercice {year}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              Suivez la tresorerie, les coproprietaires payeurs et la repartition
              des depenses depuis une seule vue.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Taux d'encaissement
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">{data.collectionRate}%</div>
            </div>
            <div className="border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Coproprietaires payes
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {paidOwners}/{data.ownersCount}
              </div>
            </div>
            <div className="border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                Tresorerie totale
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-950">
                {formatMAD(totalBalance)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-4">
        <KpiCard
          title={`Total encaisse (${year})`}
          value={formatMAD(data.totalReceipts)}
          subtitle="Recettes de l'exercice"
          icon={ArrowUpRight}
          tone="emerald"
        />
        <KpiCard
          title={`Total depense (${year})`}
          value={formatMAD(data.totalPayments)}
          subtitle="Charges reglees"
          icon={ArrowDownRight}
          tone="rose"
        />
        <KpiCard
          title="Solde actuel"
          value={formatMAD(totalBalance)}
          subtitle={`Caisse ${formatMAD(data.cashBalance)} - Banque ${formatMAD(data.bankBalance)}`}
          icon={CreditCard}
          tone="sky"
        />
        <KpiCard
          title={`Creances en retard (${year})`}
          value={`${unpaidOwners}`}
          subtitle="Coproprietaires restant a regulariser"
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <Card title={`Flux de tresorerie (${year})`}>
          <div className="border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                barCategoryGap="45%"
              >
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(148,163,184,0.08)" }}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
                    background: "#ffffff",
                  }}
                  formatter={(value, name) => [
                    `${Number(value ?? 0).toLocaleString("fr-FR")} MAD`,
                    name === "encaisses" ? "Encaisse" : "Depense",
                  ]}
                />
                <Bar dataKey="encaisses" fill="#38bdf8" radius={[8, 8, 0, 0]} barSize={24} />
                <Bar dataKey="depenses" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 flex items-center justify-center gap-6 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-sky-500" />
                Encaisse
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-amber-500" />
                Depense
              </div>
            </div>
          </div>
        </Card>

        <Card title="Synthese rapide">
          <div className="space-y-4">
            <div className="flex items-center justify-between border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center bg-emerald-500 text-white">
                  <Wallet size={18} />
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Encaissements de l'exercice
                  </div>
                  <div className="text-xs text-slate-500">Exercice {year}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-emerald-600">
                  +{formatMAD(data.totalReceipts)}
                </div>
                <div className="text-xs text-slate-500">Total recu</div>
              </div>
            </div>

            <div className="flex items-center justify-between border border-slate-200 bg-slate-50 px-4 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Solde caisse</div>
                <div className="text-xs text-slate-500">Situation actuelle</div>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {formatMAD(data.cashBalance)}
              </div>
            </div>

            <div className="flex items-center justify-between border border-slate-200 bg-slate-50 px-4 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Solde banque</div>
                <div className="text-xs text-slate-500">Situation actuelle</div>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {formatMAD(data.bankBalance)}
              </div>
            </div>

            <div className="flex items-center justify-between border border-slate-200 bg-slate-50 px-4 py-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Taux d'encaissement</div>
                <div className="text-xs text-slate-500">Paiements coproprietaires</div>
              </div>
              <div className="text-sm font-bold text-slate-900">{data.collectionRate}%</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Taux d'encaissement coproprietaires">
          {paidOwners === 0 ? (
            <div className="flex h-[260px] items-center justify-center border border-slate-200 bg-slate-50 text-sm font-medium text-slate-400">
              Aucun coproprietaire n'a encore paye.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={collectionPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={100}
                    paddingAngle={3}
                  >
                    {collectionPie.map((entry, index) => (
                      <Cell
                        key={`${entry.name}-${index}`}
                        fill={collectionColors[index % collectionColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value} coproprietaires`} />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-4 flex justify-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                  Paye ({paidOwners})
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-slate-300" />
                  Non paye ({unpaidOwners})
                </div>
              </div>

              <div className="mt-4 text-center text-sm text-slate-500">
                {data.collectionRate}% des coproprietaires ont paye
              </div>
            </>
          )}
        </Card>

        <Card title="Repartition des depenses">
          {totalExpensesAmount <= 0 ? (
            <div className="flex h-[260px] items-center justify-center border border-slate-200 bg-slate-50 text-sm font-medium text-slate-400">
              Aucune depense sur cet exercice.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.expensesByCategory}
                    dataKey="amount"
                    nameKey="categoryName"
                    innerRadius={68}
                    outerRadius={100}
                  >
                    {data.expensesByCategory.map((item, index) => (
                      <Cell
                        key={`${item.categoryName}-${index}`}
                        fill={expensesColors[index % expensesColors.length]}
                      />
                    ))}
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

              <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-slate-500">
                {data.expensesByCategory.map((item, index) => {
                  const amount = Number(item.amount ?? 0);
                  const percent =
                    totalExpensesAmount > 0
                      ? Math.round((amount / totalExpensesAmount) * 100)
                      : 0;
                  const label =
                    item.categoryName && item.categoryName.trim() !== ""
                      ? item.categoryName
                      : "Sans categorie";

                  return (
                    <div key={`${label}-${index}`} className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: expensesColors[index % expensesColors.length] }}
                      />
                      {label} ({percent}%)
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>

      <section className="border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          <Link
            className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50"
            href="/ops/payments"
          >
            Voir les paiements
            <ArrowRight size={14} />
          </Link>
          <Link
            className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50"
            href="/ops/contributions/year"
          >
            Ouvrir la vue annuelle
            <ArrowRight size={14} />
          </Link>
          <Link
            className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50"
            href="/ops/dues_generate"
          >
            Generer les cotisations
            <ArrowRight size={14} />
          </Link>
          <Link
            className="inline-flex items-center justify-center gap-2 border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50"
            href="/ops/receipts"
          >
            Gerer les recettes
            <Landmark size={14} />
          </Link>
        </div>
      </section>
    </div>
  );
}
