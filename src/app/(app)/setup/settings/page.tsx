"use client";

import { useEffect, useState } from "react";

type Settings = {
  id: string;
  brandName: string;
  brandColor: string;
  startYear: number;
  startMonth: number;
  receiptStartNumber: number;
  receiptUsePrefix: boolean;
  receiptPrefix: string | null;
  paymentStartNumber: number;
  paymentUsePrefix: boolean;
  paymentPrefix: string | null;
  openingCashBalance: number;
openingBankBalance: number;
};

type InternalBank = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function SettingsPage() {
  const [s, setS] = useState<Settings | null>(null);

  const [brandName, setBrandName] = useState("");
  const [brandColor, setBrandColor] = useState("#4f46e5");
  const [startYear, setStartYear] = useState<number>(2026);
  const [startMonth, setStartMonth] = useState<number>(1);

  const [receiptStartNumber, setReceiptStartNumber] = useState<number>(1);
  const [receiptUsePrefix, setReceiptUsePrefix] = useState(false);
  const [receiptPrefix, setReceiptPrefix] = useState("");

  const [paymentStartNumber, setPaymentStartNumber] = useState<number>(1);
  const [paymentUsePrefix, setPaymentUsePrefix] = useState(false);
  const [paymentPrefix, setPaymentPrefix] = useState("");
const [openingCashBalance, setOpeningCashBalance] = useState<number>(0);
const [openingBankBalance, setOpeningBankBalance] = useState<number>(0);
  const [banks, setBanks] = useState<InternalBank[]>([]);
  const [newBankName, setNewBankName] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  const [msg, setMsg] = useState("");
const [tab, setTab] = useState<
  "general" | "numbering" | "banks"
>("general");

  async function loadSettings() {
    const res = await fetch("/api/settings");
    const json = await res.json();

    setS(json);
    setBrandName(json.brandName ?? "Syndic");
    setBrandColor(json.brandColor ?? "#4f46e5");
    setStartYear(Number(json.startYear ?? 2026));
    setStartMonth(Number(json.startMonth ?? 1));

    setReceiptStartNumber(Number(json.receiptStartNumber ?? 1));
    setReceiptUsePrefix(Boolean(json.receiptUsePrefix ?? false));
    setReceiptPrefix(json.receiptPrefix ?? "");

    setPaymentStartNumber(Number(json.paymentStartNumber ?? 1));
    setPaymentUsePrefix(Boolean(json.paymentUsePrefix ?? false));
    setPaymentPrefix(json.paymentPrefix ?? "");
    setOpeningCashBalance(Number(json.openingCashBalance ?? 0));
setOpeningBankBalance(Number(json.openingBankBalance ?? 0));
  }

  async function loadBanks() {
    const res = await fetch("/api/internal-banks");
    const json = await res.json();
    setBanks(Array.isArray(json) ? json : []);
  }

  useEffect(() => {
    loadSettings();
    loadBanks();
  }, []);

  async function save() {
    setMsg("Enregistrement...");

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName,
        brandColor,
        startYear,
        startMonth,
        receiptStartNumber,
        receiptUsePrefix,
        receiptPrefix: receiptUsePrefix ? receiptPrefix : "",
        paymentStartNumber,
        paymentUsePrefix,
        paymentPrefix: paymentUsePrefix ? paymentPrefix : "",
        openingCashBalance,
openingBankBalance,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setMsg(`Erreur: ${err?.error ?? "save failed"}`);
      return;
    }

    const updated = await res.json();
    setS(updated);
    setMsg("✅ Sauvegardé.");
  }

  async function addBank() {
    const name = newBankName.trim();
    if (!name) return;

    setSavingBank(true);
    setMsg("");

    const res = await fetch("/api/internal-banks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setMsg(`Erreur: ${err?.error ?? "create bank failed"}`);
      setSavingBank(false);
      return;
    }

    setNewBankName("");
    await loadBanks();
    setSavingBank(false);
    setMsg("✅ Banque ajoutée.");
  }

  async function toggleBank(bank: InternalBank) {
    setMsg("");

    const res = await fetch("/api/internal-banks", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: bank.id,
        isActive: !bank.isActive,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setMsg(`Erreur: ${err?.error ?? "update bank failed"}`);
      return;
    }

    await loadBanks();
  }

  async function deleteBank(bankId: string) {
    setMsg("");

    const res = await fetch("/api/internal-banks", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: bankId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setMsg(`Erreur: ${err?.error ?? "delete bank failed"}`);
      return;
    }

    await loadBanks();
    setMsg("✅ Banque désactivée.");
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-zinc-200 pb-2">

  <button
    onClick={() => setTab("general")}
    className={`px-4 py-2 text-sm font-medium rounded-xl ${
      tab === "general"
        ? "bg-indigo-600 text-white"
: "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
    }`}
  >
    Général
  </button>

  <button
    onClick={() => setTab("numbering")}
    className={`px-4 py-2 text-sm font-medium rounded-xl ${
      tab === "numbering"
        ? "bg-indigo-600 text-white"
: "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
    }`}
  >
    Numérotation
  </button>

  <button
    onClick={() => setTab("banks")}
    className={`px-4 py-2 text-sm font-medium rounded-xl ${
      tab === "banks"
        ? "bg-indigo-600 text-white"
: "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
    }`}
  >
    Banques internes
  </button>

</div>
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Paramètres
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Configure le syndic, la date de départ, la numérotation et les
              banques internes utilisées dans les encaissements.
            </p>
          </div>

          <div
            className="h-12 w-12 rounded-2xl border border-zinc-200 shadow-inner"
            style={{ backgroundColor: brandColor }}
          />
        </div>
      </div>

      <div className="space-y-6">
          {tab === "general" ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Identité du syndic
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Nom affiché et couleur principale de l’application.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Nom du syndic
                </label>
                <input
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none ring-0 placeholder:text-zinc-400"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Ex: Syndic Al Amal"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Couleur principale
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-12 w-16 rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm"
                  />
                  <input
                    className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 font-mono text-sm shadow-sm outline-none"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
) : null}
{tab === "general" ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Début du système
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Point de départ comptable du syndic.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Année de départ
                </label>
                <input
                  type="number"
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
                  value={startYear}
                  onChange={(e) => setStartYear(Number(e.target.value))}
                  min={2000}
                  max={2100}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Mois de départ
                </label>
                <select
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
                  value={startMonth}
                  onChange={(e) => setStartMonth(Number(e.target.value))}
                >
                  <option value={1}>Janvier</option>
                  <option value={2}>Février</option>
                  <option value={3}>Mars</option>
                  <option value={4}>Avril</option>
                  <option value={5}>Mai</option>
                  <option value={6}>Juin</option>
                  <option value={7}>Juillet</option>
                  <option value={8}>Août</option>
                  <option value={9}>Septembre</option>
                  <option value={10}>Octobre</option>
                  <option value={11}>Novembre</option>
                  <option value={12}>Décembre</option>
                </select>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
  <div>
    <label className="mb-2 block text-sm font-medium text-zinc-700">
      Solde initial caisse
    </label>
    <input
      type="number"
      className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
      value={openingCashBalance}
      onChange={(e) => setOpeningCashBalance(Number(e.target.value))}
    />
  </div>

  <div>
    <label className="mb-2 block text-sm font-medium text-zinc-700">
      Solde initial banque
    </label>
    <input
      type="number"
      className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
      value={openingBankBalance}
      onChange={(e) => setOpeningBankBalance(Number(e.target.value))}
    />
  </div>
</div>
          </div>
) : null}
{tab === "banks" ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Banques internes
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Banques du syndic à utiliser dans les encaissements et plus tard
                dans les paiements sortants.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                className="h-12 flex-1 rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none placeholder:text-zinc-400"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="Ex: Attijariwafa Bank"
              />
              <button
                type="button"
                onClick={addBank}
                disabled={savingBank || !newBankName.trim()}
                className="h-12 rounded-2xl bg-zinc-900 px-5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {banks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
                  Aucune banque interne configurée.
                </div>
              ) : (
                banks.map((bank) => (
                  <div
                    key={bank.id}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-zinc-900">
                        {bank.name}
                      </div>
                      <div className="mt-1">
                        <span
                          className={
                            bank.isActive
                              ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
                              : "inline-flex rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600"
                          }
                        >
                          {bank.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleBank(bank)}
                        className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm"
                      >
                        {bank.isActive ? "Désactiver" : "Réactiver"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteBank(bank.id)}
                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 shadow-sm"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          ) : null}


        <div className="space-y-6">
          {tab === "numbering" ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Numérotation des encaissements
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Prépare la future génération des numéros de reçus.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Premier numéro
                </label>
                <input
                  type="number"
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
                  value={receiptStartNumber}
                  onChange={(e) => setReceiptStartNumber(Number(e.target.value))}
                  min={1}
                />
              </div>

              <div className="flex items-end">
                <div className="flex items-center gap-3">
  <span className="text-sm text-zinc-700">Activer le préfixe</span>

  <button
    type="button"
    onClick={() => setReceiptUsePrefix(!receiptUsePrefix)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
      receiptUsePrefix ? "bg-emerald-500" : "bg-zinc-300"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
        receiptUsePrefix ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
</div>
              </div>
            </div>

            {receiptUsePrefix ? (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Préfixe encaissement
                </label>
                <input
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
                  value={receiptPrefix}
                  onChange={(e) => setReceiptPrefix(e.target.value)}
                  placeholder="Ex: E"
                />
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              Aperçu :{" "}
              <span className="font-semibold">
                {receiptUsePrefix && receiptPrefix.trim()
                  ? `${receiptPrefix.trim()}${receiptStartNumber}`
                  : receiptStartNumber}
              </span>
            </div>
          </div>
) : null}
{tab === "numbering" ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Numérotation des paiements
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Réservé aux futurs paiements sortants du syndic.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Premier numéro
                </label>
                <input
                  type="number"
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
                  value={paymentStartNumber}
                  onChange={(e) => setPaymentStartNumber(Number(e.target.value))}
                  min={1}
                />
              </div>

              <div className="flex items-end">
                <div className="flex items-center gap-3">
  <span className="text-sm text-zinc-700">Activer le préfixe</span>

  <button
    type="button"
    onClick={() => setPaymentUsePrefix(!paymentUsePrefix)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
      paymentUsePrefix ? "bg-emerald-500" : "bg-zinc-300"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
        paymentUsePrefix ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
</div>
              </div>
            </div>

            {paymentUsePrefix ? (
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Préfixe paiement
                </label>
                <input
                  className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
                  value={paymentPrefix}
                  onChange={(e) => setPaymentPrefix(e.target.value)}
                  placeholder="Ex: P"
                />
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Aperçu :{" "}
              <span className="font-semibold">
                {paymentUsePrefix && paymentPrefix.trim()
                  ? `${paymentPrefix.trim()}${paymentStartNumber}`
                  : paymentStartNumber}
              </span>
            </div>
          </div>
) : null}
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Enregistrement
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Sauvegarde les paramètres généraux du syndic.
                </p>
              </div>

              <button
                onClick={save}
                className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >
                Enregistrer
              </button>
            </div>

            {msg ? (
              <div className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                {msg}
              </div>
            ) : null}

            {s ? (
              <div className="mt-4 text-xs text-zinc-400">
                Paramètres chargés.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>

    
  );
}