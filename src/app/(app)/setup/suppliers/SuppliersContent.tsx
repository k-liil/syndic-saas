"use client";

import Image from "next/image";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useApiUrl, useOrgId } from "@/lib/org-context";
import { canManage } from "@/lib/roles";
import { Building2, Mail, MapPin, Pencil, Phone, Plus, Trash2, User, X, PlusCircle } from "lucide-react";

type Supplier = {
  id: string;
  name: string;
  sector: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  note: string | null;
  photoUrl: string | null;
  isActive: boolean;
  _count?: {
    payments: number;
  };
};

type SupplierPaymentPreview = {
  id: string;
  date: string;
  description: string;
  organizationName: string;
  amount: number;
};

type SupplierDetail = {
  supplier: Supplier;
  recentPayments: SupplierPaymentPreview[];
};

export type SuppliersPageHandle = {
  submit: () => Promise<boolean>;
};

type SuppliersPageProps = {
  hidePageHeader?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onStatusChange?: (msg: string) => void;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getSectorBadgeClass(sector: string | null) {
  switch (sector) {
    case "Electricite":
      return "bg-sky-100 text-sky-700";
    case "Plomberie":
      return "bg-cyan-100 text-cyan-700";
    case "Nettoyage":
      return "bg-emerald-100 text-emerald-700";
    case "Ascenseur":
      return "bg-violet-100 text-violet-700";
    case "Jardinage":
      return "bg-lime-100 text-lime-700";
    case "Securite":
      return "bg-amber-100 text-amber-700";
    case "Maconnerie":
      return "bg-stone-200 text-stone-700";
    case "Peinture":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Impossible de lire l'image"));
    reader.readAsDataURL(file);
  });
}

const primaryGradientButtonClass =
  "inline-flex gap-3 items-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)] transition hover:from-cyan-600 hover:to-blue-700";

const SuppliersContent = forwardRef<SuppliersPageHandle, SuppliersPageProps>(
  function SuppliersContent({ hidePageHeader = false, onDirtyChange, onStatusChange }, ref) {
    const { data: session } = useSession();
    const canEdit = canManage(session?.user?.role);
    const apiUrl = useApiUrl();

    const [items, setItems] = useState<Supplier[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [detail, setDetail] = useState<SupplierDetail | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [showSectorsModal, setShowSectorsModal] = useState(false);
    const [sectors, setSectors] = useState<any[]>([]);
    const [newSectorName, setNewSectorName] = useState("");
    const [savingSector, setSavingSector] = useState(false);
    const [editSectorTarget, setEditSectorTarget] = useState<{ id: string, name: string } | null>(null);
    const [editSectorName, setEditSectorName] = useState("");

    const [name, setName] = useState("");
    const [dynamicSectors, setDynamicSectors] = useState<string[]>(["Autre"]);
    const [sector, setSector] = useState<string>("Autre");
    const [contactName, setContactName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    const [note, setNote] = useState("");
    const [photoUrl, setPhotoUrl] = useState("");

    const isDirty = useMemo(
      () =>
        [name, sector, contactName, phone, email, address, note, photoUrl].some(
          (value) => value.trim().length > 0
        ),
      [address, contactName, email, name, note, phone, photoUrl, sector]
    );

    const load = useCallback(async () => {
      try {
        const url = apiUrl("/api/suppliers");
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          setItems(Array.isArray(json) ? json : []);
        }

        const sectorRes = await fetch(apiUrl("/api/supplier-sectors"));
        if (sectorRes.ok) {
          const sectorJson = await sectorRes.json();
          if (Array.isArray(sectorJson)) {
            setSectors(sectorJson);
            const activeSectors = sectorJson.filter((s) => s.isActive).map((s) => s.name);
            setDynamicSectors(Array.from(new Set([...activeSectors, "Autre"])));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }, [apiUrl]);

    const orgId = useOrgId();

    useEffect(() => {
      if (orgId) {
        void load();
      }
    }, [load, orgId]);

    useEffect(() => {
      onDirtyChange?.(isDirty && showModal);
    }, [isDirty, onDirtyChange, showModal]);

    function resetForm() {
      setEditingId(null);
      setName("");
      setSector("Autre");
      setContactName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setNote("");
      setPhotoUrl("");
    }

    function openCreateModal() {
      resetForm();
      setShowModal(true);
    }

    function editSupplier(supplier: Supplier) {
      setEditingId(supplier.id);
      setName(supplier.name);
      setSector(supplier.sector || "Autre");
      setContactName(supplier.contactName || "");
      setPhone(supplier.phone || "");
      setEmail(supplier.email || "");
      setAddress(supplier.address || "");
      setNote(supplier.note || "");
      setPhotoUrl(supplier.photoUrl || "");
      setShowModal(true);
    }

    function closeModal() {
      setShowModal(false);
      resetForm();
      onStatusChange?.("");
    }

    async function saveSupplier() {
      if (!name.trim() || saving) return false;

      setSaving(true);
      onStatusChange?.("Enregistrement...");

      const body = {
        name: name.trim(),
        sector: sector.trim() || "Autre",
        contactName: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        note: note.trim() || null,
        photoUrl: photoUrl.trim() || null,
      };

      const res = await fetch(apiUrl("/api/suppliers"), {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...body } : body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onStatusChange?.(`Erreur: ${err?.error ?? "Erreur"}`);
        setSaving(false);
        return false;
      }

      await load();
      closeModal();
      onStatusChange?.("Prestataire enregistre.");
      setSaving(false);
      return true;
    }

    function requestDeleteSupplier(supplier: Supplier) {
      setDeleteTarget({ id: supplier.id, name: supplier.name });
    }

    async function confirmDelete() {
      if (!deleteTarget || isDeleting) return;
      setIsDeleting(true);

      const res = await fetch(apiUrl("/api/suppliers"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });

      if (res.ok) {
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || "Erreur lors de la suppression du prestataire.");
      }
      
      setIsDeleting(false);
      setDeleteTarget(null);
    }

    async function toggleSupplier(supplier: Supplier) {
      const res = await fetch(apiUrl("/api/suppliers"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: supplier.id,
          isActive: !supplier.isActive,
        }),
      });

      if (!res.ok) return;
      await load();
    }

    async function addSector() {
      const name = newSectorName.trim();
      if (!name) return;
      setSavingSector(true);
      const res = await fetch(apiUrl("/api/supplier-sectors"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setNewSectorName("");
        await load();
      }
      setSavingSector(false);
    }

    async function toggleSector(sectorId: string, isActive: boolean) {
      await fetch(apiUrl("/api/supplier-sectors"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sectorId, isActive: !isActive }),
      });
      await load();
    }

    async function deleteSector(sectorId: string) {
      if (!confirm("Supprimer ce secteur ?")) return;
      await fetch(apiUrl("/api/supplier-sectors"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sectorId }),
      });
      await load();
    }

    async function renameSector() {
      if (!editSectorTarget || !editSectorName.trim()) return;
      await fetch(apiUrl("/api/supplier-sectors"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editSectorTarget.id, name: editSectorName.trim() }),
      });
      setEditSectorTarget(null);
      await load();
    }

    function formatMoney(amount: number) {
      return new Intl.NumberFormat("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + " MAD";
    }

    function formatDate(value: string) {
      return new Date(value).toLocaleDateString("fr-FR");
    }

    async function openSupplierDetail(supplier: Supplier) {
      const res = await fetch(apiUrl(`/api/suppliers/${supplier.id}`));
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.supplier) return;
      setDetail(json);
      setDetailOpen(true);
    }

    useImperativeHandle(ref, () => ({
      submit: saveSupplier,
    }));

    return (
      <div className="flex flex-col h-full">
        {!hidePageHeader ? (
          <div className="sticky top-0 z-20 -mx-4 -mt-6 mb-6 bg-[#FCFCFB]/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:-mt-8 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Gestion des Prestataires</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Entreprises et personnes de service de la copropriete.
                </p>
              </div>

              {canEdit ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSectorsModal(true)}
                    className="inline-flex gap-3 h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Gérer les métiers
                  </button>
                  <button
                    onClick={openCreateModal}
                    className={`${primaryGradientButtonClass} h-11 flex items-center gap-2`}
                  ><PlusCircle className="h-4 w-4" /> Ajouter un Prestataire</button>
                </div>
              ) : null}
            </div>
          </div>
        ) : canEdit ? (
          <div className="flex justify-end mb-6">
            <button
              onClick={openCreateModal}
              className={`${primaryGradientButtonClass} h-11 flex items-center gap-2`}
            ><PlusCircle className="h-4 w-4" /> Ajouter un Prestataire</button>
          </div>
        ) : null}

        <div className="flex-1 overflow-auto">
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-white/70 p-10 text-center text-sm text-slate-500">
              Aucun prestataire configure.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 pb-8">
              {items.map((supplier) => (
                <article
                  key={supplier.id}
                  onClick={() => void openSupplierDetail(supplier)}
                  className={`rounded-[28px] border p-4 transition ${
                    supplier.isActive
                      ? "border-slate-200 bg-white shadow-sm"
                      : "border-slate-200 bg-slate-100/70"
                  } cursor-pointer hover:-translate-y-0.5 hover:shadow-md`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-4">
                      {supplier.photoUrl ? (
                        <Image
                          src={supplier.photoUrl}
                          alt={supplier.name}
                          width={56}
                          height={56}
                          unoptimized
                          className="h-14 w-14 rounded-md object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                          {getInitials(supplier.name) || "PR"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="truncate text-lg font-semibold text-slate-900">
                          {supplier.name}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex gap-3 rounded-md px-3 py-1 text-xs font-semibold ${getSectorBadgeClass(
                              supplier.sector
                            )}`}
                          >
                            {supplier.sector || "Autre"}
                          </span>
                          {!supplier.isActive ? (
                            <span className="inline-flex gap-3 rounded-md bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                              Inactif
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {canEdit ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            editSupplier(supplier);
                          }}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Modifier ${supplier.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {(() => {
                          const hasHistory = (supplier._count?.payments ?? 0) > 0;
                          return (
                            <button
                              onClick={(event) =>{ event.stopPropagation(); if (!hasHistory) requestDeleteSupplier(supplier); }} disabled={hasHistory} className={`rounded-md p-2 transition ${ hasHistory ? "text-slate-300 cursor-not-allowed" : "text-red-500 hover:bg-red-50" }`} title={hasHistory ? "Impossible de supprimer (paiements liés)" : "Supprimer"} aria-label={`Supprimer ${supplier.name}`} > <Trash2 className="h-5 w-5" /></button>
                          );
                        })()}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 h-px bg-slate-100" />

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    {supplier.contactName ? (
                      <div className="flex items-start gap-2">
                        <User className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span>{supplier.contactName}</span>
                      </div>
                    ) : null}

                    {supplier.phone ? (
                      <div className="flex items-start gap-2">
                        <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span>{supplier.phone}</span>
                      </div>
                    ) : null}

                    {supplier.email ? (
                      <div className="flex items-start gap-2">
                        <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span className="break-all">{supplier.email}</span>
                      </div>
                    ) : null}

                    {supplier.address ? (
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span>{supplier.address}</span>
                      </div>
                    ) : null}

                    {supplier.note ? (
                      <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500">
                        {supplier.note}
                      </div>
                    ) : null}
                  </div>

                  {canEdit ? (
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {supplier.contactName ? "Contact principal" : "Prestataire"}
                      </span>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleSupplier(supplier);
                        }}
                        className={`relative inline-flex gap-3 h-6 w-11 items-center rounded-md transition ${
                          supplier.isActive ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        title={supplier.isActive ? "Actif" : "Inactif"}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-md bg-white transition ${
                            supplier.isActive ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Modals are unchanged but kept for completeness */}
        {showModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={closeModal}>
            <div className="w-full max-w-3xl rounded-[30px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <h2 className="text-xl font-semibold text-slate-900">
                  {editingId ? "Modifier le prestataire" : "Ajouter un prestataire"}
                </h2>
                <button onClick={closeModal} className="flex items-center gap-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-6 px-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-[28px] border border-dashed border-slate-300 bg-slate-50">
                    {photoUrl ? (
                      <Image
                        src={photoUrl}
                        alt={name || "Prestataire"}
                        width={400}
                        height={208}
                        unoptimized
                        className="h-52 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-52 items-center justify-center px-6 text-center text-sm text-slate-400">
                        Photo du prestataire
                      </div>
                    )}
                  </div>

                  <label className="inline-flex gap-3 h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Building2 className="h-4 w-4" />
                    Charger une photo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const nextPhotoUrl = await fileToDataUrl(file);
                        setPhotoUrl(nextPhotoUrl);
                      }}
                    />
                  </label>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Nom de l&apos;entreprise ou de la personne
                      </label>
                      <input
                        className="h-11 w-full rounded-md border border-slate-200 px-4 text-sm"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Ex: Lydec"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Metier / secteur
                      </label>
                      <select
                        className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm"
                        value={sector}
                        onChange={(event) => setSector(event.target.value)}
                      >
                        {dynamicSectors.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Nom du contact
                      </label>
                      <input
                        className="h-11 w-full rounded-md border border-slate-200 px-4 text-sm"
                        value={contactName}
                        onChange={(event) => setContactName(event.target.value)}
                        placeholder="Ex: Maitre avocat"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Telephone
                      </label>
                      <input
                        className="h-11 w-full rounded-md border border-slate-200 px-4 text-sm"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="Ex: 0600000000"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Email
                      </label>
                      <input
                        className="h-11 w-full rounded-md border border-slate-200 px-4 text-sm"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Ex: contact@prestataire.ma"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Adresse
                      </label>
                      <input
                        className="h-11 w-full rounded-md border border-slate-200 px-4 text-sm"
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        placeholder="Optionnel"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Note
                    </label>
                    <textarea
                      className="min-h-28 w-full rounded-md border border-slate-200 px-4 py-3 text-sm"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Informations utiles, horaires, remarques..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={closeModal}
                      className="flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Annuler
                    </button>
                    <button onClick={saveSupplier}
                      disabled={!name.trim() || saving}
                      className="flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)] transition hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50"
                    >
                      {saving ? "Enregistrement..." : editingId ? "Enregistrer" : "Ajouter"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {detailOpen && detail ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => {
            setDetailOpen(false);
            setDetail(null);
          }}>
            <div className="w-full max-w-2xl rounded-[30px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <h2 className="text-xl font-semibold text-slate-900">
                  Details de {detail.supplier.name}
                </h2>
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    setDetail(null);
                  }}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6 px-6 py-6">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-start gap-4">
                    {detail.supplier.photoUrl ? (
                      <Image
                        src={detail.supplier.photoUrl}
                        alt={detail.supplier.name}
                        width={72}
                        height={72}
                        unoptimized
                        className="h-[72px] w-[72px] rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-[72px] w-[72px] items-center justify-center rounded-md bg-slate-100 text-base font-semibold text-slate-600">
                        {getInitials(detail.supplier.name) || "PR"}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="text-2xl font-semibold text-slate-900">
                        {detail.supplier.name}
                      </div>
                      <div className="mt-1">
                        <span
                          className={`inline-flex gap-3 rounded-md px-3 py-1 text-sm font-semibold ${getSectorBadgeClass(
                            detail.supplier.sector
                          )}`}
                        >
                          {detail.supplier.sector || "Autre"}
                        </span>
                      </div>

                      <div className="mt-4 space-y-1 text-sm text-slate-600">
                        {detail.supplier.contactName ? <div>Contact: {detail.supplier.contactName}</div> : null}
                        {detail.supplier.phone ? <div>Tel: {detail.supplier.phone}</div> : null}
                        {detail.supplier.email ? <div>Email: {detail.supplier.email}</div> : null}
                        {detail.supplier.address ? <div>Adresse: {detail.supplier.address}</div> : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900">Historique des Depenses</h3>
                  <div className="mt-3 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm">
                    <div className="max-h-[300px] overflow-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                          <tr className="text-left text-slate-500">
                            <th className="px-3 py-2.5 font-medium">Date</th>
                            <th className="px-3 py-2.5 font-medium">Description</th>
                            <th className="px-3 py-2.5 font-medium">Copropriete</th>
                            <th className="px-3 py-2.5 text-right font-medium">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.recentPayments.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                                Aucune depense recente.
                              </td>
                            </tr>
                          ) : (
                            detail.recentPayments.map((payment) => (
                              <tr key={payment.id} className="border-t border-slate-100">
                                <td className="px-3 py-2.5">{formatDate(payment.date)}</td>
                                <td className="px-3 py-2.5 text-slate-700">{payment.description}</td>
                                <td className="px-3 py-2.5 text-slate-600">{payment.organizationName}</td>
                                <td className="px-3 py-2.5 text-right font-semibold text-red-600">
                                  {formatMoney(payment.amount)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {showSectorsModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowSectorsModal(false)}>
            <div className="w-full max-w-lg rounded-[30px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <h2 className="text-xl font-semibold text-slate-900">Gérer les métiers</h2>
                <button
                  onClick={() => setShowSectorsModal(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="flex gap-2">
                  <input
                    className="h-11 flex-1 rounded-md border border-slate-200 px-4 text-sm"
                    placeholder="Nouveau métier (ex: Peinture)"
                    value={newSectorName}
                    onChange={(e) => setNewSectorName(e.target.value)}
                  />
                  <button onClick={addSector}
                    disabled={!newSectorName.trim() || savingSector}
                    className="flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 px-4 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(14,165,233,0.22)] transition hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50"
                  ><PlusCircle className="h-4 w-4" /> Ajouter</button>
                </div>

                <div className="mt-6 max-h-[300px] overflow-auto rounded-md border border-slate-200 bg-slate-50/50 p-2">
                  {sectors.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Aucun métier personnalisé.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {sectors.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between rounded-md bg-white p-3 shadow-sm ring-1 ring-slate-200/50"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => void toggleSector(s.id, s.isActive)}
                              className={`h-5 w-5 rounded border transition ${
                                s.isActive
                                  ? "bg-slate-900 border-slate-900 text-white"
                                  : "bg-white border-slate-300"
                              }`}
                            >
                              {s.isActive && (
                                <svg
                                  className="h-full w-full p-0.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </button>
                            {editSectorTarget?.id === s.id ? (
                              <input
                                autoFocus
                                className="h-7 w-full border-b border-slate-400 text-sm focus:outline-none"
                                value={editSectorName}
                                onChange={(e) => setEditSectorName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") void renameSector();
                                  if (e.key === "Escape") setEditSectorTarget(null);
                                }}
                                onBlur={() => void renameSector()}
                              />
                            ) : (
                              <span className={`text-sm ${s.isActive ? "text-slate-900" : "text-slate-400 line-through"}`}>
                                {s.name}
                              </span>
                            )}
                          </div>

                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditSectorTarget({ id: s.id, name: s.name });
                                setEditSectorName(s.name);
                              }}
                              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() =>void deleteSector(s.id)} className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500" > <Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {deleteTarget ? (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setDeleteTarget(null)}>
            <div className="w-full max-w-sm rounded-[30px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-slate-900">Confirmer la suppression</h3>
              <p className="mt-2 text-sm text-slate-500">
                Êtes-vous sûr de vouloir supprimer <b>{deleteTarget.name}</b> ? Cette action est irréversible.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => void confirmDelete()}
                  disabled={isDeleting}
                  className="rounded-md bg-gradient-to-r from-rose-500 to-red-600 px-6 py-2.5 text-sm font-bold text-white shadow-[0_10px_20px_rgba(244,63,94,0.2)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                >
                  {isDeleting ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
);

SuppliersContent.displayName = "SuppliersContent";

export { SuppliersContent };
