export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Dépenses</h1>
          <p className="text-sm text-zinc-500">Paiements prestataires, charges et dépenses de copropriété.</p>
        </div>

        <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          + Ajouter une dépense
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
        Aucune dépense enregistrée.
      </div>
    </div>
  );
}