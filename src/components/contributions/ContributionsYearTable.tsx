"use client";

import * as React from "react";
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

type MonthStatus = "PAID" | "PARTIAL" | "UNPAID" | "ADVANCE" | null;

type RowData = {
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
      <div className="inline-flex min-w-[82px] items-center justify-center rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        Paye
      </div>
    );
  }

  if (value === "PARTIAL") {
    return (
      <div className="inline-flex min-w-[82px] items-center justify-center rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
        Partiel
      </div>
    );
  }

  if (value === "UNPAID") {
    return (
      <div className="inline-flex min-w-[82px] items-center justify-center rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700">
        Retard
      </div>
    );
  }

  if (value === "ADVANCE") {
    return (
      <div className="inline-flex min-w-[82px] items-center justify-center rounded-full bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700">
        Avance
      </div>
    );
  }

  return <div className="text-xs text-zinc-300">-</div>;
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
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <div className="overflow-x-auto">
        <Table className="min-w-[1500px]">
          <TableHeader className="bg-zinc-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    className={[
                      "h-14 whitespace-nowrap border-b border-zinc-200 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500",
                      index === 0 ? "sticky left-0 z-30 bg-zinc-50" : "",
                      index === 1 ? "sticky left-[160px] z-30 bg-zinc-50" : "",
                      index >= 2 ? "text-center" : "",
                    ].join(" ")}
                    style={
                      index === 0
                        ? { width: 160, minWidth: 160, maxWidth: 160 }
                        : index === 1
                          ? { width: 320, minWidth: 320, maxWidth: 320 }
                          : { width: 92, minWidth: 92, maxWidth: 92 }
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
                        "h-[74px] align-middle border-b border-zinc-100",
                        index === 0 ? "sticky left-0 z-20 bg-inherit pl-5" : "",
                        index === 1 ? "sticky left-[160px] z-20 bg-inherit pl-5" : "",
                        index >= 2 ? "text-center" : "",
                      ].join(" ")}
                      style={
                        index === 0
                          ? { width: 160, minWidth: 160, maxWidth: 160 }
                          : index === 1
                            ? { width: 320, minWidth: 320, maxWidth: 320 }
                            : { width: 92, minWidth: 92, maxWidth: 92 }
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={14} className="h-28 text-center text-zinc-500">
                  Aucune donnee
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
