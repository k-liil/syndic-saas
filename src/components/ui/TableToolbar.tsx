"use client"
import { PlusCircle } from "lucide-react";

interface Props {
  search: string
  onSearch: (v: string) => void
  onAdd?: () => void
}

export function TableToolbar({ search, onSearch, onAdd }: Props) {
  return (
    <div className="flex items-center justify-between mb-4">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Rechercher..."
        className="w-64 rounded-lg border px-3 py-2 text-sm"
      />

      {onAdd && (
        <button onClick={onAdd}
          className="flex items-center gap-2 rounded-lg bg-black text-white px-4 py-2 text-sm"
        ><PlusCircle className="h-4 w-4" /> Ajouter</button>
      )}
    </div>
  )
}
