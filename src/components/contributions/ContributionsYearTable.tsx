"use client";

import * as React from "react";
import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/Table";
import { ReceiptsDetailModal } from "./ReceiptsDetailModal";
import { Receipt as ReceiptIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

type MonthData = {
  status: "PAID" | "PARTIAL" | "UNPAID" | "ADVANCE" | null;
  paidAmount: number;
};

type RowData = {
  id: string;
  lot: string;
  owner: string;
  jan: MonthData;
  feb: MonthData;
  mar: MonthData;
  apr: MonthData;
  may: MonthData;
  jun: MonthData;
  jul: MonthData;
  aug: MonthData;
  sep: MonthData;
  oct: MonthData;
  nov: MonthData;
  dec: MonthData;
  resteAPayerAnterieur: number;
  resteAPayerEnCours: number;
  isFullyPaid: boolean;
  frequency: "MONTHLY" | "ANNUAL";
};

function StatusBadge({
  value,
  monthIndex,
}: {
  value: MonthData;
  monthIndex: number;
}) {
  const searchParams = useSearchParams();
  const year = Number(searchParams.get("year"));

  const getAmountDisplay = (amount: number, colorLabel: string) => {
    if (amount > 0) {
      return (
        <span className="flex items-baseline">
          {amount}
          <span className="ml-[2px] text-[8px] font-bold opacity-70">DH</span>
        </span>
      );
    }
    return colorLabel;
  };

  if (value.status === "PAID") {
    return (
      <div className="flex h-10 w-full items-center justify-center">
        <span className="inline-flex items-center justify-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          {getAmountDisplay(value.paidAmount, "PAYE")}
        </span>
      </div>
    );
  }

  if (value.status === "PARTIAL") {
    return (
      <div className="flex h-10 w-full items-center justify-center">
        <span className="inline-flex items-center justify-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
          {getAmountDisplay(value.paidAmount, "PARTIEL")}
        </span>
      </div>
    );
  }

  if (value.status === "UNPAID") {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let isLate = false;
    if (year < currentYear) {
      isLate = true;
    } else if (year === currentYear) {
      if (monthIndex < currentMonth) {
        isLate = true;
      }
    }

    if (isLate) {
      return (
        <div className="flex h-10 w-full items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-rose-500 shadow-sm" />
        </div>
      );
    } else {
      return (
        <div className="flex h-10 w-full items-center justify-center">
          <span className="inline-flex items-center justify-center rounded-md bg-zinc-50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">
            -
          </span>
        </div>
      );
    }
  }

  if (value.status === "ADVANCE") {
    return (
      <div className="flex h-10 w-full items-center justify-center">
        <span className="inline-flex items-center justify-center rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
          {getAmountDisplay(value.paidAmount, "AVANCE")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-10 w-full items-center justify-center">
      <span className="inline-flex items-center justify-center rounded-md bg-zinc-50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">
        -
      </span>
    </div>
  );
}

function getAnnualStatus(row: RowData): MonthData {
  const months: (keyof RowData)[] = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  // Check if any month has a status other than UNPAID (or just take the one that is configured)
  const nonUnpaid = months.map(m => row[m] as MonthData).find(d => d.status !== "UNPAID" && d.status !== null);
  return nonUnpaid || (row.jan as MonthData);
}

export function ContributionsYearTable({ data }: { data: RowData[] }) {
  const searchParams = useSearchParams();
  const year = Number(searchParams.get("year"));

  const [detailUnit, setDetailUnit] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const isPurelyAnnual = React.useMemo(() => 
    data.length > 0 && data.every((r) => r.frequency === "ANNUAL"),
  [data]);

  const tableColumns = React.useMemo<ColumnDef<RowData>[]>(() => {
    const baseColumns: ColumnDef<RowData>[] = [
      {
        accessorKey: "lot",
        header: "Lot",
        cell: ({ row }) => (
          <div
            className={`font-semibold text-sm ${row.original.isFullyPaid ? "text-emerald-700" : "text-zinc-900"}`}
          >
            {row.original.lot}
          </div>
        ),
      },
      {
        accessorKey: "owner",
        header: "Coproprietaire",
        cell: ({ row }) => (
          <div
            className={`min-w-[210px] text-xs ${row.original.isFullyPaid ? "text-emerald-600 font-medium" : "text-zinc-800"}`}
          >
            {row.original.owner}
          </div>
        ),
      },
    ];

    if (isPurelyAnnual) {
      baseColumns.push({
        id: "annualStatus",
        header: `Cotisation ${year || ""}`,
        cell: ({ row }) => (
          <div className="flex justify-center">
            <StatusBadge monthIndex={0} value={getAnnualStatus(row.original)} />
          </div>
        )
      });
    } else {
      const months = [
        { key: "jan", label: "Jan" },
        { key: "feb", label: "Fev" },
        { key: "mar", label: "Mar" },
        { key: "apr", label: "Avr" },
        { key: "may", label: "Mai" },
        { key: "jun", label: "Jun" },
        { key: "jul", label: "Jul" },
        { key: "aug", label: "Aou" },
        { key: "sep", label: "Sep" },
        { key: "oct", label: "Oct" },
        { key: "nov", label: "Nov" },
        { key: "dec", label: "Dec" },
      ];

      months.forEach((m, i) => {
        baseColumns.push({
          accessorKey: m.key,
          header: m.label,
          cell: ({ row }) => <StatusBadge monthIndex={i} value={(row.original as any)[m.key]} />,
        });
      });
    }

    baseColumns.push({
      accessorKey: "resteAPayerAnterieur",
      header: "Reste à payer ant.",
      cell: ({ row }) => (
        <div className="flex h-10 w-full items-center justify-center">
          <div className="flex flex-col items-center">
            <span
              className={`text-[11px] font-bold ${row.original.isFullyPaid ? "text-emerald-600" : row.original.resteAPayerAnterieur > 0 ? "text-rose-600" : "text-zinc-600"}`}
            >
              {row.original.resteAPayerAnterieur.toLocaleString()}
              <span className="ml-[1px] text-[8px] opacity-70 uppercase">DH</span>
            </span>
          </div>
        </div>
      ),
    });

    baseColumns.push({
      accessorKey: "resteAPayerEnCours",
      header: "Reste à payer (Année)",
      cell: ({ row }) => (
        <div className="flex h-10 w-full items-center justify-center">
          <div className="flex flex-col items-center">
            <span
              className={`text-[11px] font-bold ${row.original.isFullyPaid ? "text-emerald-600" : row.original.resteAPayerEnCours > 0 ? "text-rose-600" : "text-zinc-600"}`}
            >
              {row.original.resteAPayerEnCours.toLocaleString()}
              <span className="ml-[1px] text-[8px] opacity-70 uppercase">DH</span>
            </span>
          </div>
        </div>
      ),
    });

    baseColumns.push({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-center px-2">
          <button
            onClick={() =>
              setDetailUnit({ id: row.original.id, name: row.original.lot })
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-sky-50 hover:text-sky-600 transition-all border border-transparent hover:border-sky-100"
            title="Détail des reçus"
          >
            <ReceiptIcon className="h-4.5 w-4.5" />
          </button>
        </div>
      ),
    });

    return baseColumns;
  }, [isPurelyAnnual, year]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  const getCellClass = (index: number, total: number) => {
    const isLastAction = index === total - 1;
    const isBalance = index === total - 2 || index === total - 3;

    return [
      "h-10 align-middle border-b border-zinc-100 py-1",
      index === 0 ? "sticky left-0 z-20 bg-inherit pl-4" : "",
      index === 1 ? "sticky left-[120px] z-20 bg-inherit pl-4 border-r border-zinc-100" : "",
      index >= 2 && !isBalance && !isLastAction ? "p-0 text-center" : "",
      isBalance ? "bg-zinc-50/30 font-bold" : "",
    ].join(" ");
  };

  const getHeaderClass = (index: number, total: number) => {
    const isLastAction = index === total - 1;
    const isBalance = index === total - 2 || index === total - 3;

    return [
      "h-10 whitespace-nowrap border-b border-zinc-200 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500",
      index === 0 ? "sticky left-0 z-30 bg-zinc-50" : "",
      index === 1 ? "sticky left-[120px] z-30 bg-zinc-50 border-r border-zinc-100" : "",
      index >= 2 && !isBalance && !isLastAction ? "px-0 text-center" : "",
      isBalance ? "bg-zinc-100/50" : "",
    ].join(" ");
  };

  const getStyle = (index: number, total: number): React.CSSProperties => {
    const isLastAction = index === total - 1;
    const isBalance = index === total - 2 || index === total - 3;

    if (index === 0) return { width: 120, minWidth: 120, maxWidth: 120 };
    if (index === 1) return { width: 210, minWidth: 210, maxWidth: 210 };
    if (isBalance) return { width: 90, minWidth: 90, maxWidth: 90 };
    if (isLastAction) return { width: 60, minWidth: 60, maxWidth: 60 };

    if (isPurelyAnnual && index === 2) return { width: 250, minWidth: 250 };

    return { width: 64, minWidth: 64, maxWidth: 64 };
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="overflow-x-auto">
        <Table className={`mx-auto max-w-[85vw] ${isPurelyAnnual ? "min-w-[800px]" : "min-w-[1260px]"}`}>
          <TableHeader className="bg-zinc-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-zinc-200 hover:bg-zinc-50"
              >
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    className={getHeaderClass(index, headerGroup.headers.length)}
                    style={getStyle(index, headerGroup.headers.length)}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row, rowIndex) => (
                <TableRow
                  key={row.id}
                  className={
                    row.original.isFullyPaid
                      ? "bg-emerald-50/40 hover:bg-emerald-50/70"
                      : rowIndex % 2 === 0
                        ? "bg-white hover:bg-zinc-50"
                        : "bg-zinc-50/40 hover:bg-zinc-50"
                  }
                >
                  {(() => {
                    const cells = row.getVisibleCells();
                    
                    // Specific handling for mixed Annual rows in a Monthly table
                    if (!isPurelyAnnual && row.original.frequency === "ANNUAL") {
                      return (
                        <>
                          {/* Lot & Owner cells */}
                          {cells.slice(0, 2).map((cell, index) => (
                            <TableCell key={cell.id} className={getCellClass(index, cells.length)} style={getStyle(index, cells.length)}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                          
                          {/* Merged Annual Status cell (spanning 12 month columns) */}
                          <TableCell colSpan={12} className="h-10 align-middle border-b border-zinc-100 p-0 text-center bg-amber-50/10">
                            <div className="flex items-center justify-center gap-3">
                               <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Cotisation Annuelle:</span>
                               <div className="min-w-[120px]">
                                 <StatusBadge monthIndex={0} value={getAnnualStatus(row.original)} />
                               </div>
                            </div>
                          </TableCell>
                          
                          {/* Balance & Actions cells */}
                          {cells.slice(cells.length - 3).map((cell, index) => (
                            <TableCell key={cell.id} className={getCellClass(index + cells.length - 3, cells.length)} style={getStyle(index + cells.length - 3, cells.length)}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </>
                      );
                    }
                    
                    return cells.map((cell, index) => (
                      <TableCell key={cell.id} className={getCellClass(index, cells.length)} style={getStyle(index, cells.length)}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ));
                  })()}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={isPurelyAnnual ? 6 : 16}
                  className="h-28 text-center text-zinc-500"
                >
                  Aucune donnee
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ReceiptsDetailModal
        open={!!detailUnit}
        onClose={() => setDetailUnit(null)}
        unitId={detailUnit?.id || null}
        unitName={detailUnit?.name || null}
        year={year}
      />
    </div>
  );
}
