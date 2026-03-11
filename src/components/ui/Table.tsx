import { ReactNode, TdHTMLAttributes, ThHTMLAttributes, TableHTMLAttributes, HTMLAttributes } from "react";

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
};

type RowProps = HTMLAttributes<HTMLTableRowElement> & {
  children: ReactNode;
};

type ThProps = ThHTMLAttributes<HTMLTableCellElement> & {
  children: ReactNode;
};

type TdProps = TdHTMLAttributes<HTMLTableCellElement> & {
  children: ReactNode;
};

export function Table({ children, className = "", ...props }: TableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <table className={`w-full text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </thead>
  );
}

export function TR({ children, className = "", ...props }: RowProps) {
  return (
    <tr className={`border-b border-zinc-100 last:border-0 ${className}`} {...props}>
      {children}
    </tr>
  );
}

export function TH({ children, className = "", ...props }: ThProps) {
  return (
    <th className={`px-4 py-3 text-left ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TD({ children, className = "", ...props }: TdProps) {
  return (
    <td className={`px-4 py-4 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
}