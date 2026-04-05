"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  SuppliersContent,
  SuppliersPageHandle,
} from "@/app/(app)/setup/suppliers/SuppliersContent";
import { canAccessSettings } from "@/lib/roles";
import { useApiUrl } from "@/lib/org-context";
import { Save, Loader2, ArrowRight, Activity, HandCoins, Building2, UserRound, Trash2, Pencil, Plus, PlusCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

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
  contributionType: ContributionType;
  globalFixedAmount: number | null;
};

type InternalBank = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type SupplierSector = {
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

type ContributionType = "GLOBAL_FIXED" | "GROUP_FIXED" | "SURFACE";

type Group = {
  id: string;
  name: string;
  units: Array<{
    id: string;
    unit: {
      id: string;
      lotNumber: string | null;
      reference: string;
      surface: number | null;
    };
  }>;
};

type Period = {
  id: string;
  contributionType: ContributionType;
  groupId: string | null;
  unitId: string | null;
  startPeriod: string;
  endPeriod: string | null;
  amount: number;
};

type Unit = {
  id: string;
  lotNumber: string | null;
  reference: string;
  surface: number | null;
};

type SimulationResult = {
  period: string;
  contributionType: ContributionType;
  configured: Array<{
    unitId: string;
    lotNumber: string | null;
    reference: string;
    surface: number | null;
    calculatedAmount: number | null;
    method: string;
  }>;
  unconfigured: Array<{
    unitId: string;
    lotNumber: string | null;
    reference: string;
    surface: number | null;
    calculatedAmount: number | null;
    method: string;
  }>;
  totalConfigured: number;
};

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const suppliersRef = useRef<SuppliersPageHandle>(null);
  const apiUrl = useApiUrl();

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
  const [status, setStatus] = useState<StatusState>({
    type: "idle",
    text: "",
  });
  const [tab, setTab] = useState<
    "general" | "numbering" | "banks" | "contributions"
  >("general");

  // Contributions state
  const [groups, setGroups] = useState<Group[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodType, setPeriodType] = useState<ContributionType>("GLOBAL_FIXED");
  const [periodGroupId, setPeriodGroupId] = useState("");
  const [periodUnitId, setPeriodUnitId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [periodAmount, setPeriodAmount] = useState("");
  const [simulationPeriod, setSimulationPeriod] = useState("");
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [contributionType, setContributionType] = useState<ContributionType>("GLOBAL_FIXED");
  const [globalFixedAmount, setGlobalFixedAmount] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string, type: "bank" | "sector" } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const role = (session?.user as any)?.role;
  const allowed = canAccessSettings(role);

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

    if (tab === "contributions") {
      return {
        label: savingSettings ? "Enregistrement..." : "Enregistrer les réglages",
        disabled: savingSettings || 
          (contributionType === (s?.contributionType ?? "GLOBAL_FIXED") && 
           globalFixedAmount === (s?.globalFixedAmount ?? null)),
      };
    }

    return {
      label: savingSettings ? "Enregistrement..." : "Enregistrer",
      disabled: savingSettings || !settingsDirty,
    };
  }, [
    newBankName,
    savingBank,
    savingSettings,
    settingsDirty,
    tab,
    contributionType,
    globalFixedAmount,
    s,
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
    const res = await fetch(apiUrl("/api/settings"));
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
    setContributionType(json.contributionType ?? "GLOBAL_FIXED");
    setGlobalFixedAmount(json.globalFixedAmount ?? null);
  }

  async function loadBanks() {
    const res = await fetch(apiUrl("/api/internal-banks"));
    const json = await res.json();
    setBanks(Array.isArray(json) ? json : []);
  }

  async function loadContributions() {
    const [groupsRes, unitsRes, periodsRes] = await Promise.all([
      fetch(apiUrl("/api/contribution-groups")).then(r => r.json()),
      fetch(apiUrl("/api/units")).then(r => r.json()),
      fetch(apiUrl("/api/contribution-periods")).then(r => r.json()),
    ]);
    setGroups(Array.isArray(groupsRes) ? groupsRes : []);
    setUnits(Array.isArray(unitsRes) ? unitsRes : []);
    setPeriods(Array.isArray(periodsRes) ? periodsRes : []);
  }

  // Contributions Actions
  async function saveContributionSettings() {
    setSavingSettings(true);
    showStatus("saving", "Enregistrement...");
    try {
      const res = await fetch(apiUrl("/api/settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributionType,
          globalFixedAmount,
        }),
      });
      if (!res.ok) throw new Error();
      await loadSettings();
      showStatus("success", "Calcul des cotisations mis à jour.");
    } catch {
      showStatus("error", "Erreur lors de l'enregistrement");
    } finally {
      setSavingSettings(false);
    }
  }

  async function createGroup() {
    if (!groupName.trim()) return;
    setSavingSettings(true);
    showStatus("saving", "Création du groupe...");
    try {
      const res = await fetch(apiUrl("/api/contribution-groups"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          unitIds: selectedUnitIds,
        }),
      });
      if (!res.ok) throw new Error();
      setShowGroupModal(false);
      setGroupName("");
      setSelectedUnitIds([]);
      await loadContributions();
      showStatus("success", "Groupe créé.");
    } catch {
      showStatus("error", "Erreur lors de la création");
    } finally {
      setSavingSettings(false);
    }
  }

  async function deleteGroup(groupId: string) {
    if (!confirm("Supprimer ce groupe ?")) return;
    showStatus("saving", "Suppression...");
    await fetch(apiUrl(`/api/contribution-groups/${groupId}`), { method: "DELETE" });
    await loadContributions();
    showStatus("success", "Groupe supprimé.");
  }

  async function addPeriod() {
    if (!periodStart || !periodAmount) return;
    setSavingSettings(true);
    showStatus("saving", "Ajout de la période...");
    try {
      const res = await fetch(apiUrl("/api/contribution-periods"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contributionType: periodType,
          groupId: periodType === "GROUP_FIXED" ? periodGroupId : null,
          unitId: periodType === "SURFACE" ? periodUnitId : null,
          startPeriod: periodStart + "-01",
          endPeriod: periodEnd ? periodEnd + "-01" : null,
          amount: Number(periodAmount),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setShowPeriodModal(false);
      setPeriodStart("");
      setPeriodEnd("");
      setPeriodAmount("");
      await loadContributions();
      showStatus("success", "Période ajoutée.");
    } catch (e: any) {
      showStatus("error", e?.message || "Erreur");
    } finally {
      setSavingSettings(false);
    }
  }

  async function deletePeriod(periodId: string) {
    if (!confirm("Supprimer cette période ?")) return;
    showStatus("saving", "Suppression...");
    await fetch(apiUrl(`/api/contribution-periods?id=${periodId}`), { method: "DELETE" });
    await loadContributions();
    showStatus("success", "Période supprimée.");
  }

  async function runSimulation() {
    if (!simulationPeriod) return;
    setSimLoading(true);
    showStatus("saving", "Simulation en cours...");
    try {
      const res = await fetch(apiUrl("/api/contributions/simulate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: simulationPeriod }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSimulationResult(data);
      showStatus("success", "Simulation terminée.");
    } catch {
      showStatus("error", "Erreur de simulation");
    } finally {
      setSimLoading(false);
    }
  }

  function formatPeriod(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("fr-FR", { month: "2-digit", year: "numeric" })}`;
  }

  useEffect(() => {
    if (!allowed) return;
    loadSettings();
    loadBanks();
    loadContributions();
  }, [allowed, apiUrl]);

  async function save() {
    setSavingSettings(true);
    showStatus("saving", "Enregistrement...");

    const res = await fetch(apiUrl("/api/settings"), {
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

    const res = await fetch(apiUrl("/api/internal-banks"), {
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

    const res = await fetch(apiUrl("/api/internal-banks"), {
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

  function requestDeleteBank(bankId: string, bankName: string) {
    setDeleteTarget({ id: bankId, name: bankName, type: "bank" });
  }

  async function confirmDelete() {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    showStatus("idle", "");

    const res = await fetch(apiUrl("/api/internal-banks"), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteTarget.id }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      showStatus("error", `Erreur: ${err?.error ?? "delete failed"}`);
    } else {
      await loadBanks();
      showStatus("success", "Élément supprimé.");
    }

    setIsDeleting(false);
    setDeleteTarget(null);
  }


  async function handlePrimaryAction() {
    if (primaryAction.disabled) return;

    if (tab === "banks") {
      await addBank();
      return;
    }

    if (tab === "contributions") {
      await saveContributionSettings();
      return;
    }

    await save();
  }

  if (sessionStatus === "loading") {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 shadow-sm">
        Chargement...
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Parametres</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Cette section est reservee a l&apos;administrateur et au gerant.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setTab("general")}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            tab === "general"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm transition-all"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          General
        </button>

        <button
          onClick={() => setTab("numbering")}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            tab === "numbering"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm transition-all"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          Numerotation
        </button>

        <button
          onClick={() => setTab("banks")}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            tab === "banks"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm transition-all"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          Banques internes
        </button>

        <button
          onClick={() => setTab("contributions")}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            tab === "contributions"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm transition-all"
              : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
          }`}
        >
          Cotisations
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
              <div className="mt-4 inline-flex gap-3 items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                <span className="font-semibold text-zinc-900">Organisation</span>
                <span>{s.organization.name}</span>
                <span className="text-zinc-400">/</span>
                <span className="font-mono text-xs text-zinc-500">{s.organization.slug}</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <button type="button"
              onClick={handlePrimaryAction}
              disabled={primaryAction.disabled}
              className="flex items-center gap-2 h-11 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {primaryAction.label}
            </button>

            <div
              className="h-12 w-12 rounded-md border border-zinc-200 shadow-inner"
              style={{ backgroundColor: brandColor }}
            />
          </div>
        </div>

        {status.text ? (
          <div
            className={`mt-5 rounded-md px-4 py-3 text-sm font-medium ${
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
                    className="h-12 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none ring-0 placeholder:text-zinc-400"
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
                      className="h-12 w-16 rounded-md border border-zinc-200 bg-white p-1 shadow-sm"
                    />
                    <input
                      className="h-12 w-full rounded-md border border-zinc-200 bg-white px-4 font-mono text-sm shadow-sm outline-none"
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
                    className="h-12 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
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
                    className="h-12 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
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
                    className="h-12 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
                    value={openingCashBalance}
                    onChange={(e) => setOpeningCashBalance(Number(e.target.value))}
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700">
                    Solde initial banque
                  </label>
                  <input
                    type="number"
                    className="h-12 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
                    value={openingBankBalance}
                    onChange={(e) => setOpeningBankBalance(Number(e.target.value))}
                    step="0.01"
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
                    className="h-12 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
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
                      className={`relative inline-flex gap-3 h-6 w-11 items-center rounded-md transition ${
                        receiptUsePrefix ? "bg-emerald-500" : "bg-zinc-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-md bg-white transition ${
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
                    className="h-12 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
                    value={receiptPrefix}
                    onChange={(e) => setReceiptPrefix(e.target.value)}
                    placeholder="Ex: E"
                  />
                </div>
              ) : null}

              <div className="mt-4 rounded-md bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
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
                    className="h-12 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
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
                      className={`relative inline-flex gap-3 h-6 w-11 items-center rounded-md transition ${
                        paymentUsePrefix ? "bg-emerald-500" : "bg-zinc-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-md bg-white transition ${
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
                    className="h-12 w-full rounded-md border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none"
                    value={paymentPrefix}
                    onChange={(e) => setPaymentPrefix(e.target.value)}
                    placeholder="Ex: P"
                  />
                </div>
              ) : null}

              <div className="mt-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">
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
                className="h-12 flex-1 rounded-md border border-zinc-200 bg-white px-4 text-sm shadow-sm outline-none placeholder:text-zinc-400"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="Ex: Attijariwafa Bank"
              />
              <button type="button"
                disabled
                className="flex items-center gap-2 h-12 rounded-md bg-blue-600 hover:bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Utilise Enregistrer
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {banks.length === 0 ? (
                <div className="rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
                  Aucune banque interne configuree.
                </div>
              ) : (
                banks.map((bank) => (
                  <div
                    key={bank.id}
                    className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-zinc-900">
                        {bank.name}
                      </div>
                      <div className="mt-1">
                        <span
                          className={
                            bank.isActive
                              ? "inline-flex gap-3 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
                              : "inline-flex gap-3 rounded-md bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600"
                          }
                        >
                          {bank.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleBank(bank)}
                        className={`relative inline-flex gap-3 h-6 w-11 items-center rounded-md transition ${
                          bank.isActive ? "bg-emerald-500" : "bg-zinc-300"
                        }`}
                        title={bank.isActive ? "Désactiver" : "Réactiver"}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-md bg-white transition ${
                            bank.isActive ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>requestDeleteBank(bank.id, bank.name)} className="rounded-md p-2 text-red-500 hover:bg-red-50 transition" title="Supprimer" > <Trash2 className="h-5 w-5" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {tab === "contributions" ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Mode de cotisation */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Mode de calcul par défaut</h2>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contributionType"
                      checked={contributionType === "GLOBAL_FIXED"}
                      onChange={() => setContributionType("GLOBAL_FIXED")}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-zinc-700">Montant fixe global</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contributionType"
                      checked={contributionType === "GROUP_FIXED"}
                      onChange={() => setContributionType("GROUP_FIXED")}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-zinc-700">Par groupe de lots</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="contributionType"
                      checked={contributionType === "SURFACE"}
                      onChange={() => setContributionType("SURFACE")}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-zinc-700">Au prorata de la surface</span>
                  </label>
                </div>

                {contributionType === "GLOBAL_FIXED" && (
                  <div className="pt-2 max-w-xs">
                    <label className="block text-sm font-medium text-zinc-700 mb-2">Montant annuel par lot (DH)</label>
                    <input
                      type="number"
                      value={globalFixedAmount || ""}
                      onChange={(e) => setGlobalFixedAmount(e.target.value ? Number(e.target.value) : null)}
                      className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm"
                      placeholder="Ex: 1200"
                    />
                  </div>
                )}
                
                <p className="text-xs text-zinc-500 italic">
                  Note: Les réglages spécifiques (périodes) priment sur ce réglage par défaut.
                </p>
              </div>
            </div>

            {/* Groupes de lots */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Groupes de lots</h2>
                  <p className="text-sm text-zinc-500">Regroupez des lots pour leur appliquer un montant commun.</p>
                </div>
                <button
                  onClick={() =>setShowGroupModal(true)} className="inline-flex gap-3 h-10 items-center gap-2 rounded-md bg-indigo-50 px-4 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition" > <Plus className="h-4 w-4" /> Nouveau groupe</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <div key={group.id} className="rounded-md border border-zinc-200 p-4 hover:border-indigo-200 transition bg-zinc-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-zinc-900">{group.name}</h3>
                      <button onClick={() =>deleteGroup(group.id)} className="text-zinc-400 hover:text-red-500 transition"> <Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.units.map((u) => (
                        <span key={u.id} className="px-2 py-0.5 rounded-lg bg-white border border-zinc-200 text-[10px] font-medium text-zinc-600">
                          Lot {u.unit.lotNumber || u.unit.reference}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {groups.length === 0 && (
                  <div className="col-span-full py-8 text-center text-zinc-400 border-2 border-dashed border-zinc-100 rounded-md">
                    Aucun groupe créé
                  </div>
                )}
              </div>
            </div>

            {/* Périodes spécifiques */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">Exceptions et Périodes</h2>
                  <p className="text-sm text-zinc-500">Configurez des montants spécifiques pour des périodes données.</p>
                </div>
                <button
                  onClick={() =>setShowPeriodModal(true)} className="inline-flex gap-3 h-10 items-center gap-2 rounded-md bg-indigo-50 px-4 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition" > <Plus className="h-4 w-4" /> Ajouter une période</button>
              </div>

              <div className="overflow-hidden rounded-md border border-zinc-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-zinc-500 font-medium">
                    <tr>
                      <th className="px-4 py-3">Cible</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Début</th>
                      <th className="px-4 py-3">Fin</th>
                      <th className="px-4 py-3 text-right">Montant (DH)</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {periods.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-50/50 transition">
                        <td className="px-4 py-3 font-medium">
                          {p.contributionType === "GLOBAL_FIXED" ? "Tous les lots" : 
                           p.contributionType === "GROUP_FIXED" ? `Groupe: ${groups.find(g => g.id === p.groupId)?.name}` :
                           `Lot: ${units.find(u => u.id === p.unitId)?.lotNumber || "N/A"}`}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-[10px] font-semibold text-zinc-600">
                            {p.contributionType === "SURFACE" ? "Surface" : "Fixe"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{formatPeriod(p.startPeriod)}</td>
                        <td className="px-4 py-3">{p.endPeriod ? formatPeriod(p.endPeriod) : "Indéterminée"}</td>
                        <td className="px-4 py-3 text-right font-semibold">{p.amount.toLocaleString()} DH</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() =>deletePeriod(p.id)} className="text-zinc-400 hover:text-red-500 transition p-1"> <Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                    {periods.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic">
                          Aucune période spécifique configurée
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Simulation */}
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm overflow-hidden">
               <div className="mb-6">
                  <h2 className="text-lg font-semibold text-zinc-900">Simulateur de calcul</h2>
                  <p className="text-sm text-zinc-500 font-medium mt-1">Vérifiez les montants qui seront générés pour une date donnée.</p>
                </div>
              
              <div className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-md mb-6">
                <input
                  type="month"
                  value={simulationPeriod}
                  onChange={(e) => setSimulationPeriod(e.target.value)}
                  className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button onClick={runSimulation}
                  disabled={simLoading || !simulationPeriod}
                  className="flex items-center gap-2 btn-brand h-10 rounded-md px-6 text-sm font-semibold disabled:opacity-50"
                >
                  {simLoading ? "Calcul..." : "Lancer la simulation"}
                </button>
              </div>

              {simulationResult && (
                <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-md bg-emerald-50 border border-emerald-100">
                      <div className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">Total calculé</div>
                      <div className="text-2xl font-bold text-emerald-900">{simulationResult.totalConfigured.toLocaleString()} DH</div>
                    </div>
                    <div className="p-4 rounded-md bg-zinc-50 border border-zinc-200">
                      <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Nombre de lots</div>
                      <div className="text-2xl font-bold text-zinc-900">{simulationResult.configured.length + simulationResult.unconfigured.length}</div>
                    </div>
                  </div>

                  <div className="border border-zinc-200 rounded-md overflow-hidden shadow-sm bg-white">
                    <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 font-semibold text-zinc-800 text-sm">Détails des calculs</div>
                    <div className="max-h-96 overflow-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50/50 text-zinc-500 sticky top-0 backdrop-blur-md z-10">
                          <tr>
                            <th className="px-4 py-2 font-medium border-b border-zinc-200 text-[11px]">N° Lot</th>
                            <th className="px-4 py-2 font-medium border-b border-zinc-200 text-[11px]">Méthode appliquée</th>
                            <th className="px-4 py-2 font-medium border-b border-zinc-200 text-[11px] text-right">Montant</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {simulationResult.configured.map((item) => (
                            <tr key={item.unitId} className="hover:bg-zinc-50/50">
                              <td className="px-4 py-2 font-medium text-zinc-900 font-mono text-xs">Lot {item.lotNumber || item.reference}</td>
                              <td className="px-4 py-2 text-zinc-500 text-[11px]">
                                {item.method === "PERIOD" ? <span className="text-indigo-600 font-medium">Règle spécifique</span> : "Réglage par défaut"}
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-zinc-900">{item.calculatedAmount?.toLocaleString()} DH</td>
                            </tr>
                          ))}
                          {simulationResult.unconfigured.map((item) => (
                            <tr key={item.unitId} className="bg-red-50/30">
                              <td className="px-4 py-2 font-medium text-red-900 font-mono text-xs">Lot {item.lotNumber || item.reference}</td>
                              <td className="px-4 py-2 text-red-500 text-[11px]">Non configuré</td>
                              <td className="px-4 py-2 text-right font-bold text-red-600">0 DH</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-[30px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-slate-900">
              {deleteTarget.type === "bank" ? "Supprimer la banque ?" : "Supprimer le secteur ?"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Souhaitez-vous vraiment supprimer <strong>{deleteTarget.name}</strong> ? Cette action est définitive.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button onClick={confirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-md bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Suppression..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Group Modal */}
      <Modal
        open={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        title="Nouveau groupe de lots"
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Nom du groupe</label>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ex: Bloc A, Commerces..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Lots à inclure</label>
            <div className="max-h-60 overflow-auto border border-zinc-200 rounded-md p-2 bg-zinc-50/50">
              <div className="grid grid-cols-2 gap-2">
                {units.map((u) => {
                  const isInGroup = groups.some(g => g.units.some(gu => gu.unit.id === u.id));
                  const isSelected = selectedUnitIds.includes(u.id);
                  return (
                    <label key={u.id} className={`flex items-center gap-3 p-2 rounded-lg border transition cursor-pointer ${
                      isSelected ? "border-indigo-200 bg-indigo-50" : 
                      isInGroup ? "opacity-50 border-zinc-100 bg-zinc-100 cursor-not-allowed" : "border-zinc-200 bg-white hover:border-zinc-300"
                    }`}>
                      <input
                        type="checkbox"
                        disabled={isInGroup && !isSelected}
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedUnitIds([...selectedUnitIds, u.id]);
                          else setSelectedUnitIds(selectedUnitIds.filter(id => id !== u.id));
                        }}
                        className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-semibold text-zinc-800">Lot {u.lotNumber || u.reference}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 pt-2">
            <button
              onClick={() => setShowGroupModal(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-md"
            >
              Annuler
            </button>
            <button onClick={createGroup}
              disabled={!groupName.trim() || selectedUnitIds.length === 0}
              className="flex items-center gap-2 btn-brand rounded-md px-6 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Créer le groupe
            </button>
          </div>
        </div>
      </Modal>

      {/* Period Modal */}
      <Modal
        open={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        title="Ajouter une période spécifique"
      >
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-full">
              <label className="block text-sm font-medium text-zinc-700 mb-1">Cible</label>
              <select
                className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as ContributionType)}
              >
                <option value="GLOBAL_FIXED">Tous les lots</option>
                <option value="GROUP_FIXED">Un groupe spécifique</option>
                <option value="SURFACE">Un lot spécifique (prorata surface)</option>
              </select>
            </div>

            {periodType === "GROUP_FIXED" && (
              <div className="col-span-full">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Groupe</label>
                <select
                  className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                  value={periodGroupId}
                  onChange={(e) => setPeriodGroupId(e.target.value)}
                >
                  <option value="">Sélectionner un groupe</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}

            {periodType === "SURFACE" && (
              <div className="col-span-full">
                <label className="block text-sm font-medium text-zinc-700 mb-1">Lot</label>
                <select
                  className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                  value={periodUnitId}
                  onChange={(e) => setPeriodUnitId(e.target.value)}
                >
                  <option value="">Sélectionner un lot</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>Lot {u.lotNumber || u.reference}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Mois début</label>
              <input
                type="month"
                className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Mois fin (opt.)</label>
              <input
                type="month"
                className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
            <div className="col-span-full">
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                {periodType === "SURFACE" ? "Montant par m² annuel (DH)" : "Montant annuel fixe (DH)"}
              </label>
              <input
                type="number"
                className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm font-bold"
                value={periodAmount}
                onChange={(e) => setPeriodAmount(e.target.value)}
                placeholder="Ex: 1200"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowPeriodModal(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-md"
            >
              Annuler
            </button>
            <button onClick={addPeriod}
              disabled={!periodStart || !periodAmount}
              className="flex items-center gap-2 btn-brand rounded-md px-6 py-2 text-sm font-semibold disabled:opacity-50"
            ><PlusCircle className="h-4 w-4" /> Ajouter</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
