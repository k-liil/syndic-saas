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
  resteAPayer: number;
  isFullyPaid: boolean;
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

const columns: ColumnDef<RowData>[] = [
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
  {
    accessorKey: "jan",
    header: "Jan",
    cell: ({ row }) => <StatusBadge monthIndex={0} value={row.original.jan} />,
  },
  {
    accessorKey: "feb",
    header: "Fev",
    cell: ({ row }) => <StatusBadge monthIndex={1} value={row.original.feb} />,
  },
  {
    accessorKey: "mar",
    header: "Mar",
    cell: ({ row }) => <StatusBadge monthIndex={2} value={row.original.mar} />,
  },
  {
    accessorKey: "apr",
    header: "Avr",
    cell: ({ row }) => <StatusBadge monthIndex={3} value={row.original.apr} />,
  },
  {
    accessorKey: "may",
    header: "Mai",
    cell: ({ row }) => <StatusBadge monthIndex={4} value={row.original.may} />,
  },
  {
    accessorKey: "jun",
    header: "Jun",
    cell: ({ row }) => <StatusBadge monthIndex={5} value={row.original.jun} />,
  },
  {
    accessorKey: "jul",
    header: "Jul",
    cell: ({ row }) => <StatusBadge monthIndex={6} value={row.original.jul} />,
  },
  {
    accessorKey: "aug",
    header: "Aou",
    cell: ({ row }) => <StatusBadge monthIndex={7} value={row.original.aug} />,
  },
  {
    accessorKey: "sep",
    header: "Sep",
    cell: ({ row }) => <StatusBadge monthIndex={8} value={row.original.sep} />,
  },
  {
    accessorKey: "oct",
    header: "Oct",
    cell: ({ row }) => <StatusBadge monthIndex={9} value={row.original.oct} />,
  },
  {
    accessorKey: "nov",
    header: "Nov",
    cell: ({ row }) => <StatusBadge monthIndex={10} value={row.original.nov} />,
  },
  {
    accessorKey: "dec",
    header: "Dec",
    cell: ({ row }) => <StatusBadge monthIndex={11} value={row.original.dec} />,
  },
  {
    accessorKey: "resteAPayer",
    header: "Reste à payer",
    cell: ({ row }) => (
      <div className="flex h-10 w-full items-center justify-center">
        <div className="flex flex-col items-center">
          <span
            className={`text-[11px] font-bold ${row.original.resteAPayer > 0 ? "text-rose-600" : "text-emerald-600"}`}
          >
            {row.original.resteAPayer.toLocaleString()}
            <span className="ml-[1px] text-[8px] opacity-70 uppercase">DH</span>
          </span>
        </div>
      </div>
    ),
  },
];

export function ContributionsYearTable({ data }: { data: RowData[] }) {
  const searchParams = useSearchParams();
  const year = Number(searchParams.get("year"));

  const [detailUnit, setDetailUnit] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const tableColumns = React.useMemo<ColumnDef<RowData>[]>(
    () => [
      ...columns,
      {
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
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="overflow-x-auto">
        <Table className="mx-auto min-w-[1260px] max-w-[85vw]">
          <TableHeader className="bg-zinc-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b border-zinc-200 hover:bg-zinc-50"
              >
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    className={[
                      "h-10 whitespace-nowrap border-b border-zinc-200 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500",
                      index === 0 ? "sticky left-0 z-30 bg-zinc-50" : "",
                      index === 1 ? "sticky left-[120px] z-30 bg-zinc-50 border-r border-zinc-100" : "",
                      index >= 2 ? "px-0 text-center" : "",
                      index === 14 ? "bg-zinc-100/50" : "",
                    ].join(" ")}
                    style={
                      index === 0
                        ? { width: 120, minWidth: 120, maxWidth: 120 }
                        : index === 1
                          ? { width: 210, minWidth: 210, maxWidth: 210 }
                          : index === 14
                            ? { width: 90, minWidth: 90, maxWidth: 90 }
                            : { width: 64, minWidth: 64, maxWidth: 64 }
                    }
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
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell
                      key={cell.id}
                      className={[
                        "h-10 align-middle border-b border-zinc-100 py-1",
                        index === 0 ? "sticky left-0 z-20 bg-inherit pl-4" : "",
                        index === 1
                          ? "sticky left-[120px] z-20 bg-inherit pl-4 border-r border-zinc-100"
                          : "",
                        index >= 2 ? "p-0 text-center" : "",
                        index === 14 ? "bg-zinc-50/30 font-bold" : "",
                      ].join(" ")}
                      style={
                        index === 0
                          ? { width: 120, minWidth: 120, maxWidth: 120 }
                          : index === 1
                            ? { width: 210, minWidth: 210, maxWidth: 210 }
                            : index === 14
                              ? { width: 90, minWidth: 90, maxWidth: 90 }
                              : index === 15
                                ? { width: 60, minWidth: 60, maxWidth: 60 }
                                : { width: 64, minWidth: 64, maxWidth: 64 }
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={15}
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
