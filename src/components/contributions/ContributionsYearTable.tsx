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

type MonthStatus = "PAID" | "PARTIAL" | "UNPAID" | "ADVANCE" | null;

type RowData = {
  id: string;
  lot: string;
  owner: string;
  jan: MonthStatus;
  feb: MonthStatus;
  mar: MonthStatus;
  apr: MonthStatus;
  may: MonthStatus;
  jun: MonthStatus;
  jul: MonthStatus;
  aug: MonthStatus;
  sep: MonthStatus;
  oct: MonthStatus;
  nov: MonthStatus;
  dec: MonthStatus;
};

function StatusBadge({ value }: { value: MonthStatus }) {
  if (value === "PAID") {
    return (
      <div className="flex h-[54px] w-full items-center justify-center">
        <span className="h-3 w-3 rounded-full bg-emerald-500" />
      </div>
    );
  }

  if (value === "PARTIAL") {
    return (
      <div className="flex h-[54px] w-full items-center justify-center">
        <span className="h-3 w-3 rounded-full bg-amber-500" />
      </div>
    );
  }

  if (value === "UNPAID") {
    return (
      <div className="flex h-[54px] w-full items-center justify-center">
        <span className="h-3 w-3 rounded-full bg-rose-500" />
      </div>
    );
  }

  if (value === "ADVANCE") {
    return (
      <div className="flex h-[54px] w-full items-center justify-center">
        <span className="h-3 w-3 rounded-full bg-sky-500" />
      </div>
    );
  }

  return (
    <div className="flex h-[54px] w-full items-center justify-center">
      <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
    </div>
  );
}

const columns: ColumnDef<RowData>[] = [
  {
    accessorKey: "lot",
    header: "Lot",
    cell: ({ row }) => (
      <div className="font-semibold text-zinc-900">{row.original.lot}</div>
    ),
  },
  {
    accessorKey: "owner",
    header: "Coproprietaire",
    cell: ({ row }) => (
      <div className="min-w-[240px] text-sm text-zinc-800">{row.original.owner}</div>
    ),
  },
  { accessorKey: "jan", header: "Jan", cell: ({ row }) => <StatusBadge value={row.original.jan} /> },
  { accessorKey: "feb", header: "Fev", cell: ({ row }) => <StatusBadge value={row.original.feb} /> },
  { accessorKey: "mar", header: "Mar", cell: ({ row }) => <StatusBadge value={row.original.mar} /> },
  { accessorKey: "apr", header: "Avr", cell: ({ row }) => <StatusBadge value={row.original.apr} /> },
  { accessorKey: "may", header: "Mai", cell: ({ row }) => <StatusBadge value={row.original.may} /> },
  { accessorKey: "jun", header: "Jun", cell: ({ row }) => <StatusBadge value={row.original.jun} /> },
  { accessorKey: "jul", header: "Jul", cell: ({ row }) => <StatusBadge value={row.original.jul} /> },
  { accessorKey: "aug", header: "Aou", cell: ({ row }) => <StatusBadge value={row.original.aug} /> },
  { accessorKey: "sep", header: "Sep", cell: ({ row }) => <StatusBadge value={row.original.sep} /> },
  { accessorKey: "oct", header: "Oct", cell: ({ row }) => <StatusBadge value={row.original.oct} /> },
  { accessorKey: "nov", header: "Nov", cell: ({ row }) => <StatusBadge value={row.original.nov} /> },
  { accessorKey: "dec", header: "Dec", cell: ({ row }) => <StatusBadge value={row.original.dec} /> },
];

export function ContributionsYearTable({ data }: { data: RowData[] }) {
  const searchParams = useSearchParams();
  const year = Number(searchParams.get("year"));
  
  const [detailUnit, setDetailUnit] = useState<{id: string, name: string} | null>(null);

  const tableColumns = React.useMemo<ColumnDef<RowData>[]>(() => [
    ...columns,
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-center px-2">
          <button
            onClick={() => setDetailUnit({ id: row.original.id, name: row.original.lot })}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-sky-50 hover:text-sky-600 transition-all border border-transparent hover:border-sky-100"
            title="Détail des reçus"
          >
            <ReceiptIcon className="h-4.5 w-4.5" />
          </button>
        </div>
      ),
    }
  ], []);

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
              <TableRow key={headerGroup.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    className={[
                      "h-14 whitespace-nowrap border-b border-zinc-200 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500",
                      index === 0 ? "sticky left-0 z-30 bg-zinc-50" : "",
                      index === 1 ? "sticky left-[132px] z-30 bg-zinc-50" : "",
                      index >= 2 ? "px-0 text-center" : "",
                    ].join(" ")}
                    style={
                      index === 0
                        ? { width: 132, minWidth: 132, maxWidth: 132 }
                        : index === 1
                          ? { width: 240, minWidth: 240, maxWidth: 240 }
                          : { width: 72, minWidth: 72, maxWidth: 72 }
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                  className={rowIndex % 2 === 0 ? "bg-white hover:bg-zinc-50" : "bg-zinc-50/40 hover:bg-zinc-50"}
                >
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell
                      key={cell.id}
                      className={[
                        "h-[54px] align-middle border-b border-zinc-100 py-2",
                        index === 0 ? "sticky left-0 z-20 bg-inherit pl-4" : "",
                        index === 1 ? "sticky left-[132px] z-20 bg-inherit pl-4" : "",
                        index >= 2 ? "p-0 text-center" : "",
                      ].join(" ")}
                      style={
                        index === 0
                          ? { width: 132, minWidth: 132, maxWidth: 132 }
                          : index === 1
                            ? { width: 240, minWidth: 240, maxWidth: 240 }
                            : index === 14 
                              ? { width: 60, minWidth: 60, maxWidth: 60 }
                              : { width: 72, minWidth: 72, maxWidth: 72 }
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={15} className="h-28 text-center text-zinc-500">
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
