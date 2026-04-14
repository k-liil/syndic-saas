"use client";

import { useState, useEffect } from "react";
import { 
  ArrowRightLeft, 
  ArrowRight, 
  Banknote, 
  Wallet, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Plus
} from "lucide-react";

type Bank = {
  id: string;
  name: string;
};

export default function TransferPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  
  // Form State
  const [sourceId, setSourceId] = useState<string>("caisse");
  const [destId, setDestId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState<string>("");
  
  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/internal-banks")
      .then(res => res.json())
      .then(data => {
        setBanks(data);
        setLoadingBanks(false);
      })
      .catch(() => setLoadingBanks(false));
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    if (sourceId === destId) {
      setError("La source et la destination doivent être différentes.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceBankId: sourceId === "caisse" ? null : sourceId,
          destinationBankId: destId === "caisse" ? null : destId,
          amount: Number(amount),
          date,
          note
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors du transfert");
      }

      setSuccess(true);
      setAmount("");
      setNote("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSuccess(false);
    setError(null);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-zinc-200 shadow-sm animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 mb-2">Transfert réussi !</h2>
        <p className="text-zinc-500 mb-8 text-center max-w-sm">
          L'opération a été enregistrée. Une dépense a été créée pour la source et une recette pour la destination.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-zinc-900 text-white rounded-lg font-medium hover:bg-zinc-800 transition shadow-lg shadow-zinc-200"
        >
          Nouveau transfert
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 mb-2 flex items-center gap-3">
          <ArrowRightLeft className="text-sky-500" />
          Transfert de fonds
        </h1>
        <p className="text-zinc-500">Déplacez de l'argent entre la caisse et vos comptes bancaires.</p>
      </div>

      <form onSubmit={handleTransfer} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-8">
            
            {/* Accounts Selection */}
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="w-full space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Source</label>
                <div className="relative group">
                  <select
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    className="w-full h-14 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition group-hover:border-zinc-300"
                  >
                    <option value="caisse">Caisse (Espèces)</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 group-focus-within:text-sky-500 transition">
                    {sourceId === "caisse" ? <Wallet size={18} /> : <Banknote size={18} />}
                  </div>
                  <div className="pl-10"></div>
                </div>
              </div>

              <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0 mt-6 lg:mt-6">
                <ArrowRight size={20} />
              </div>

              <div className="w-full space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Destination</label>
                <select
                  value={destId}
                  onChange={(e) => setDestId(e.target.value)}
                  className="w-full h-14 bg-zinc-50 border border-zinc-200 rounded-xl px-12 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                  required
                >
                  <option value="" disabled>Choisir destination...</option>
                  <option value="caisse">Caisse (Espèces)</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                   {destId === "caisse" ? <Wallet size={18} /> : <Banknote size={18} />}
                </div>
              </div>
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Montant (DH)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-12 bg-white border border-zinc-200 rounded-lg pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition font-mono text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium tracking-tighter">DH</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Date de l'opération</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-12 bg-white border border-zinc-200 rounded-lg px-10 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                  />
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 text-zinc-400">Note / Libellé (Optionnel)</label>
              <div className="relative">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: Approvisionnement caisse..."
                  className="w-full h-12 bg-white border border-zinc-200 rounded-lg pl-10 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-center gap-3">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-xl shadow-zinc-200/50 space-y-6">
            <h3 className="font-bold flex items-center gap-2">
              <Plus size={18} className="text-sky-400" />
              Récapitulatif
            </h3>
            
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-[10px] text-white/50 uppercase font-bold mb-2">Impact Recettes</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Entrée {destId ? (destId === 'caisse' ? 'Caisse' : 'Banque') : '...'}</span>
                  <span className="text-emerald-400 font-bold">+{amount || '0'} DH</span>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-[10px] text-white/50 uppercase font-bold mb-2">Impact Dépenses</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Sortie {sourceId === 'caisse' ? 'Caisse' : 'Banque'}</span>
                  <span className="text-rose-400 font-bold">-{amount || '0'} DH</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !amount || !destId}
              className="w-full py-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Traitement...
                </>
              ) : (
                "Confirmer le transfert"
              )}
            </button>
          </div>

          <div className="p-6 bg-sky-50 rounded-2xl border border-sky-100 text-sky-800 text-xs">
            <h4 className="font-bold mb-2 flex items-center gap-1.5 uppercase tracking-wide">Info Comptable</h4>
            <p className="leading-relaxed opacity-80">
              Un transfert interne n'impacte pas le résultat global du syndic, il ne fait que déplacer la trésorerie. Les deux écritures seront marquées comme <strong>"Transfert Interne"</strong>.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
