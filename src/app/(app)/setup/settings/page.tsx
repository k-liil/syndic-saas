"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import SuppliersPage, {
  SuppliersPageHandle,
} from "@/app/(app)/setup/suppliers/page";
import PaymentCategoriesPage, {
  PaymentCategoriesPageHandle,
} from "@/app/(app)/setup/payment-categories/page";

type Settings = {
  id: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
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

type StatusState = {
  type: "idle" | "saving" | "success" | "error";
  text: string;
};

export default function SettingsPage() {
  const categoriesRef = useRef<PaymentCategoriesPageHandle>(null);
  const suppliersRef = useRef<SuppliersPageHandle>(null);

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
  const [savingSettings, setSavingSettings] = useState(false);
  const [categoriesDirty, setCategoriesDirty] = useState(false);
  const [suppliersDirty, setSuppliersDirty] = useState(false);
  const [status, setStatus] = useState<StatusState>({
    type: "idle",
    text: "",
  });
  const [tab, setTab] = useState<
    "general" | "numbering" | "banks" | "categories" | "suppliers"
  >("general");

  const settingsDirty = useMemo(() => {
    if (!s) return false;

    return (
      brandName !== (s.brandName ?? "Syndic") ||
      brandColor !== (s.brandColor ?? "#4f46e5") ||
      startYear !== Number(s.startYear ?? 2026) ||
      startMonth !== Number(s.startMonth ?? 1) ||
      receiptStartNumber !== Number(s.receiptStartNumber ?? 1) ||
      receiptUsePrefix !== Boolean(s.receiptUsePrefix ?? false) ||
      receiptPrefix !== (s.receiptPrefix ?? "") ||
      paymentStartNumber !== Number(s.paymentStartNumber ?? 1) ||
      paymentUsePrefix !== Boolean(s.paymentUsePrefix ?? false) ||
      paymentPrefix !== (s.paymentPrefix ?? "") ||
      openingCashBalance !== Number(s.openingCashBalance ?? 0) ||
      openingBankBalance !== Number(s.openingBankBalance ?? 0)
    );
  }, [
    brandColor,
    brandName,
    openingBankBalance,
    openingCashBalance,
    paymentPrefix,
    paymentStartNumber,
    paymentUsePrefix,
    receiptPrefix,
    receiptStartNumber,
    receiptUsePrefix,
    s,
    startMonth,
    startYear,
  ]);

  const primaryAction = useMemo(() => {
    if (tab === "banks") {
      return {
        label: savingBank ? "Enregistrement..." : "Enregistrer",
        disabled: savingBank || !newBankName.trim(),
      };
    }

    if (tab === "categories") {
      return {
        label: "Enregistrer",
        disabled: !categoriesDirty,
      };
    }

    if (tab === "suppliers") {
      return {
        label: "Enregistrer",
        disabled: !suppliersDirty,
      };
    }

    return {
      label: savingSettings ? "Enregistrement..." : "Enregistrer",
      disabled: savingSettings || !settingsDirty,
    };
  }, [
    categoriesDirty,
    newBankName,
    savingBank,
    savingSettings,
    settingsDirty,
    suppliersDirty,
    tab,
  ]);

  function showStatus(type: StatusState["type"], text: string) {
    setStatus({ type, text });
  }

  function handleSectionStatus(text: string) {
    if (!text) {
      showStatus("idle", "");
      return;
    }

    if (text === "Enregistrement...") {
      showStatus("saving", text);
      return;
    }

    if (text.startsWith("Erreur")) {
      showStatus("error", text);
      return;
    }

    showStatus("success", text);
  }

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
    setSavingSettings(true);
    showStatus("saving", "Enregistrement...");

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
      showStatus("error", `Erreur: ${err?.error ?? "save failed"}`);
      setSavingSettings(false);
      return;
    }

    const updated = await res.json();
    setS(updated);
    showStatus("success", "Parametres enregistres.");
    setSavingSettings(false);
  }

  async function addBank() {
    const name = newBankName.trim();
    if (!name) return;

    setSavingBank(true);
    showStatus("saving", "Enregistrement...");

    const res = await fetch("/api/internal-banks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showStatus("error", `Erreur: ${err?.error ?? "create bank failed"}`);
      setSavingBank(false);
      return;
    }

    setNewBankName("");
    await loadBanks();
    setSavingBank(false);
    showStatus("success", "Banque enregistree.");
  }

  async function toggleBank(bank: InternalBank) {
    showStatus("idle", "");

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
      showStatus("error", `Erreur: ${err?.error ?? "update bank failed"}`);
      return;
    }

    await loadBanks();
  }

  async function deleteBank(bankId: string) {
    showStatus("idle", "");

    const res = await fetch("/api/internal-banks", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: bankId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showStatus("error", `Erreur: ${err?.error ?? "delete bank failed"}`);
      return;
    }

    await loadBanks();
    showStatus("success", "Banque desactivee.");
  }

  async function handlePrimaryAction() {
    if (primaryAction.disabled) return;

    if (tab === "banks") {
      await addBank();
      return;
    }

    if (tab === "categories") {
      await categoriesRef.current?.submit();
      return;
    }

    if (tab === "suppliers") {
      await suppliersRef.current?.submit();
      return;
    }

    await save();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setTab("general")}
          className={`px-4 py-2 text-sm font-medium rounded-xl ${
            tab === "general"
              ? "bg-indigo-600 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          General
        </button>

        <button
          onClick={() => setTab("numbering")}
          className={`px-4 py-2 text-sm font-medium rounded-xl ${
            tab === "numbering"
              ? "bg-indigo-600 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          Numerotation
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

        <button
          onClick={() => setTab("categories")}
          className={`px-4 py-2 text-sm font-medium rounded-xl ${
            tab === "categories"
              ? "bg-indigo-600 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          Categories depenses
        </button>

        <button
          onClick={() => setTab("suppliers")}
          className={`px-4 py-2 text-sm font-medium rounded-xl ${
            tab === "suppliers"
              ? "bg-indigo-600 text-white"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          Fournisseurs
        </button>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Parametres
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Configure le syndic, la date de depart, la numerotation et les
              banques internes utilisees dans les encaissements.
            </p>
            {s?.organization ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                <span className="font-semibold text-zinc-900">Organisation</span>
                <span>{s.organization.name}</span>
                <span className="text-zinc-400">/</span>
                <span className="font-mono text-xs text-zinc-500">{s.organization.slug}</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={primaryAction.disabled}
              className="h-11 rounded-2xl bg-zinc-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {primaryAction.label}
            </button>

            <div
              className="h-12 w-12 rounded-2xl border border-zinc-200 shadow-inner"
              style={{ backgroundColor: brandColor }}
            />
          </div>
        </div>

        {status.text ? (
          <div
            className={`mt-5 rounded-2xl px-4 py-3 text-sm font-medium ${
              status.type === "error"
                ? "bg-red-50 text-red-700"
                : status.type === "success"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-zinc-50 text-zinc-700"
            }`}
          >
            {status.text}
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        {tab === "general" ? (
          <>
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Identite du syndic
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Nom affiche et couleur principale de l'application.
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

            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Debut du systeme
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Point de depart comptable du syndic.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Annee de depart
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
                    Mois de depart
                  </label>
                  <select
                    className="h-12 w-full rounded-2xl border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
                    value={startMonth}
                    onChange={(e) => setStartMonth(Number(e.target.value))}
                  >
                    <option value={1}>Janvier</option>
                    <option value={2}>Fevrier</option>
                    <option value={3}>Mars</option>
                    <option value={4}>Avril</option>
                    <option value={5}>Mai</option>
                    <option value={6}>Juin</option>
                    <option value={7}>Juillet</option>
                    <option value={8}>Aout</option>
                    <option value={9}>Septembre</option>
                    <option value={10}>Octobre</option>
                    <option value={11}>Novembre</option>
                    <option value={12}>Decembre</option>
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
          </>
        ) : null}

        {tab === "numbering" ? (
          <>
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Numerotation des encaissements
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Prepare la future generation des numeros de recus.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Premier numero
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
                    <span className="text-sm text-zinc-700">
                      Activer le prefixe
                    </span>

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
                    Prefixe encaissement
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
                Apercu :{" "}
                <span className="font-semibold">
                  {receiptUsePrefix && receiptPrefix.trim()
                    ? `${receiptPrefix.trim()}${receiptStartNumber}`
                    : receiptStartNumber}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Numerotation des paiements
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Reserve aux futurs paiements sortants du syndic.
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Premier numero
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
                    <span className="text-sm text-zinc-700">
                      Activer le prefixe
                    </span>

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
                    Prefixe paiement
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
                Apercu :{" "}
                <span className="font-semibold">
                  {paymentUsePrefix && paymentPrefix.trim()
                    ? `${paymentPrefix.trim()}${paymentStartNumber}`
                    : paymentStartNumber}
                </span>
              </div>
            </div>
          </>
        ) : null}

        {tab === "banks" ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">
                Banques internes
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Banques du syndic a utiliser dans les encaissements et plus tard
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
                disabled
                className="h-12 rounded-2xl bg-zinc-900 px-5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Utilise Enregistrer
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {banks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
                  Aucune banque interne configuree.
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
                        {bank.isActive ? "Desactiver" : "Reactiver"}
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

        {tab === "categories" ? (
          <PaymentCategoriesPage
            ref={categoriesRef}
            hidePageHeader
            onDirtyChange={setCategoriesDirty}
            onStatusChange={handleSectionStatus}
          />
        ) : null}

        {tab === "suppliers" ? (
          <SuppliersPage
            ref={suppliersRef}
            hidePageHeader
            onDirtyChange={setSuppliersDirty}
            onStatusChange={handleSectionStatus}
          />
        ) : null}
      </div>
    </div>
  );
}
