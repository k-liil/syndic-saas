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
import { DateInput } from "@/components/ui/DateInput";

type Bank = {
  id: string;
  name: string;
};

type Supplier = {
  id: string;
  name: string;
};

type AccountingPost = {
  id: string;
  name: string;
  code: string;
};

export default function TransferPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accountingPosts, setAccountingPosts] = useState<AccountingPost[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Form State
  const [sourceId, setSourceId] = useState<string>("caisse");
  const [destId, setDestId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState<string>("");
  
  // Accounting Details State
  const [supplierId, setSupplierId] = useState<string>("");
  const [accountingPostId, setAccountingPostId] = useState<string>("");
  const [destReceiptType, setDestReceiptType] = useState<string>("TRANSFER");
  
  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [banksRes, suppliersRes, postsRes] = await Promise.all([
          fetch("/api/internal-banks"),
          fetch("/api/suppliers"),
          fetch("/api/accounting-posts?type=CHARGE")
        ]);

        const [banksData, suppliersData, postsData] = await Promise.all([
          banksRes.json(),
          suppliersRes.json(),
          postsRes.json()
        ]);

        setBanks(Array.isArray(banksData) ? banksData : []);
        setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
        
        const postsArray = Array.isArray(postsData) ? postsData : (postsData?.posts || []);
        setAccountingPosts(postsArray);
        
        // Auto-select "Autres charges" or "VI" if exists
        const defaultPost = postsArray.find((p: any) => p.code === 'VI' || p.name.toLowerCase().includes('charge'));
        if (defaultPost) setAccountingPostId(defaultPost.id);

      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
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
          note,
          supplierId: supplierId || null,
          accountingPostId: accountingPostId || null,
          destinationReceiptType: destReceiptType
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
  if (loadingData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
          <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sky-500 animate-pulse" size={24} />
        </div>
        <p className="text-zinc-500 font-medium animate-pulse">Chargement des données...</p>
      </div>
    );
  }

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
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 mb-2 flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
               <ArrowRightLeft size={22} />
            </div>
            Transfert de fonds
          </h1>
          <p className="text-zinc-500">Déplacez de l'argent entre la caisse et vos comptes bancaires avec imputation comptable.</p>
        </div>
      </div>

      <form onSubmit={handleTransfer} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Section 1: Flux de Trésorerie */}
          <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-8">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-2">
              <div className="w-8 h-8 bg-zinc-900 text-white rounded-lg flex items-center justify-center">
                <Plus size={18} />
              </div>
              <h2 className="font-bold text-zinc-900 text-lg">Flux de Trésorerie</h2>
            </div>
            
            {/* Accounts Selection */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-[1fr,40px,1fr] items-end gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Source (Sortie)</label>
                  <div className="relative group">
                    <select
                      value={sourceId}
                      onChange={(e) => setSourceId(e.target.value)}
                      className="w-full h-14 bg-zinc-50 border border-zinc-200 rounded-xl pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                    >
                      <option value="caisse">Caisse (Espèces)</option>
                      {banks.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                      {sourceId === "caisse" ? <Wallet size={18} /> : <Banknote size={18} />}
                    </div>
                  </div>
                </div>

                <div className="h-14 flex items-center justify-center text-zinc-300">
                  <ArrowRight size={20} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Destination (Entrée)</label>
                  <div className="relative">
                    <select
                      value={destId}
                      onChange={(e) => setDestId(e.target.value)}
                      className="w-full h-14 bg-zinc-50 border border-zinc-200 rounded-xl pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                      required
                    >
                      <option value="" disabled>Vers...</option>
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
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
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
                  <DateInput
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Imputation Comptable */}
          <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-8">
            <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-2">
              <div className="w-8 h-8 bg-sky-500 text-white rounded-lg flex items-center justify-center">
                <FileText size={18} />
              </div>
              <h2 className="font-bold text-zinc-900 text-lg">Imputation Comptable</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prestataire (Côté Sortie) */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  Prestataire <span className="text-rose-500">*</span>
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                  required
                >
                  <option value="">Choisir prestataire...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Poste Comptable (Côté Sortie) */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Poste Comptable</label>
                <select
                  value={accountingPostId}
                  onChange={(e) => setAccountingPostId(e.target.value)}
                  className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                >
                  <option value="">Automatique (VI)</option>
                  {accountingPosts.map(p => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              {/* Type de Recette (Côté Entrée) */}
              <div className="space-y-2 lg:col-span-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Type de Recette</label>
                <select
                  value={destReceiptType}
                  onChange={(e) => setDestReceiptType(e.target.value)}
                  className="w-full h-12 bg-zinc-50 border border-zinc-200 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                >
                  <option value="TRANSFER">Transfert</option>
                  <option value="PAST_CONTRIBUTION">Cotisation exercice antérieur</option>
                  <option value="OTHER">Autre recette</option>
                </select>
              </div>

              {/* Note */}
              <div className="space-y-2 lg:col-span-1">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Note / Libellé</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: Approvisionnement caisse..."
                  className="w-full h-12 bg-white border border-zinc-200 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* Action Button Section - Centered */}
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="bg-zinc-900 text-white p-8 rounded-3xl shadow-2xl shadow-zinc-200/50 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h3 className="text-lg font-bold">Récapitulatif de l'opération</h3>
                <p className="text-zinc-500 text-sm italic">Mode de paiement: Virement bancaire / Caisse</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/50 uppercase font-bold tracking-widest mb-1">Total</p>
                <p className="text-3xl font-mono font-bold text-sky-400">{amount || '0'} DH</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-between h-24">
                <p className="text-[10px] text-white/40 uppercase font-bold">Sortie (Dépense)</p>
                <p className="text-sm font-medium">{sourceId === 'caisse' ? 'Caisse' : 'Banque'} → {suppliers.find(s => s.id === supplierId)?.name || '...'}</p>
                <p className="text-rose-400 font-bold ml-auto leading-none text-xl">-{amount || '0'} DH</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-between h-24">
                <p className="text-[10px] text-white/40 uppercase font-bold">Entrée (Recette)</p>
                <p className="text-sm font-medium">Reçu dans {destId ? (destId === 'caisse' ? 'Caisse' : 'Banque') : '...'}</p>
                <p className="text-emerald-400 font-bold ml-auto leading-none text-xl">+{amount || '0'} DH</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !amount || !destId || !supplierId}
              className="w-full py-5 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all shadow-lg shadow-sky-500/30 flex items-center justify-center gap-3 text-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Traitement en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 size={24} />
                  Confirmer le transfert
                </>
              )}
            </button>
          </div>

          <p className="text-zinc-400 text-xs text-center max-w-sm">
            Un transfert interne n'impacte pas le résultat net global. Les deux écritures seront liées et marquées comme <strong>Virement</strong>.
          </p>
        </div>
      </form>
    </div>
  );
}
