"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, Plus, Search, Clock, CheckCircle2, AlertCircle, ChevronRight, User as UserIcon, Home as HomeIcon, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useApiUrl } from "@/lib/org-context";
import { canManage, isSuperAdmin } from "@/lib/roles";

type Claim = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  priority: "LOW" | "NORMAL" | "HIGH";
  createdAt: string;
  updatedAt: string;
  owner?: { name: string; firstName: string | null };
  unit?: { lotNumber: string | null; reference: string };
  comments: {
    id: string;
    message: string;
    createdAt: string;
    user: {
      name: string | null;
      email: string;
      role: string;
      owner?: { firstName: string | null; name: string } | null;
    };
  }[];
};

type Owner = {
  id: string;
  name: string;
  firstName: string | null;
  units: { id: string; lotNumber: string | null; reference: string }[];
};

export default function ClaimsPage() {
  const { data: session } = useSession();
  const apiUrl = useApiUrl();
  const role = session?.user?.role;
  const isAdmin = canManage(role);
  const isSA = isSuperAdmin(role);

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [toast, setToast] = useState("");

  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [newUnitId, setNewUnitId] = useState("");
  const [newOwnerId, setNewOwnerId] = useState("");
  const [saving, setSaving] = useState(false);

  const [availableOwners, setAvailableOwners] = useState<Owner[]>([]);
  const [selectedOwnerUnits, setSelectedOwnerUnits] = useState<
    { id: string; lotNumber: string | null; reference: string }[]
  >([]);

  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSaving, setCommentSaving] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/claims"));
      const data = await response.json().catch(() => []);
      if (Array.isArray(data)) {
        setClaims(data);
      } else {
        setToast(data?.error ?? "Impossible de charger les reclamations");
      }
    } catch (error) {
      console.error("Load claims failed", error);
      setToast("Impossible de charger les reclamations");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const loadOwners = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("/api/owners"));
      const data = await response.json().catch(() => []);
      if (Array.isArray(data)) {
        setAvailableOwners(data);
      }
    } catch (error) {
      console.error("Load owners failed", error);
    }
  }, [apiUrl]);

  useEffect(() => {
    void loadClaims();
    void loadOwners();
  }, [loadClaims, loadOwners]);

  useEffect(() => {
    if (isAdmin) {
      if (!newOwnerId) {
        setSelectedOwnerUnits([]);
        return;
      }

      const owner = availableOwners.find((item) => item.id === newOwnerId);
      setSelectedOwnerUnits(owner?.units ?? []);
      if (owner?.units.length === 1) {
        setNewUnitId(owner.units[0].id);
      } else if (owner && !owner.units.some((unit) => unit.id === newUnitId)) {
        setNewUnitId("");
      }
      return;
    }

    const linkedOwner = availableOwners[0];
    if (!linkedOwner) {
      setSelectedOwnerUnits([]);
      return;
    }

    setNewOwnerId(linkedOwner.id);
    setSelectedOwnerUnits(linkedOwner.units ?? []);

    if (linkedOwner.units.length === 1) {
      setNewUnitId(linkedOwner.units[0].id);
    } else if (!linkedOwner.units.some((unit) => unit.id === newUnitId)) {
      setNewUnitId("");
    }
  }, [availableOwners, isAdmin, newOwnerId, newUnitId]);

  const ownerHasSingleUnit = !isAdmin && selectedOwnerUnits.length === 1;
  const ownerHasUnits = selectedOwnerUnits.length > 0;

  function openCreateModal() {
    if (!isAdmin && availableOwners.length === 0) {
      setToast("Aucun profil coproprietaire lie a ce compte");
      return;
    }

    if (!isAdmin && !ownerHasUnits) {
      setToast("Aucun lot actif rattache a ce compte");
      return;
    }

    setShowNewModal(true);
  }

  function getSelectedUnitLabel() {
    const unit = selectedOwnerUnits.find((item) => item.id === newUnitId);
    if (!unit) {
      return "";
    }

    return `Lot ${unit.lotNumber || unit.reference}`;
  }

  function resetCreateForm() {
    setNewTitle("");
    setNewDescription("");
    setNewCategory("General");
    if (isAdmin) {
      setNewUnitId("");
      setNewOwnerId("");
    } else {
      const linkedOwner = availableOwners[0];
      setNewOwnerId(linkedOwner?.id ?? "");
      if (linkedOwner?.units.length === 1) {
        setNewUnitId(linkedOwner.units[0].id);
      } else {
        setNewUnitId("");
      }
    }
  }

  async function handleCreate() {
    if (!newTitle.trim() || !newDescription.trim()) {
      setToast("Titre et description obligatoires");
      return;
    }

    if ((isAdmin && (!newOwnerId || !newUnitId)) || (!isAdmin && !newUnitId)) {
      setToast("Selectionne un proprietaire et un lot");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(apiUrl("/api/claims"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          category: newCategory,
          unitId: newUnitId || undefined,
          ownerId: isAdmin ? newOwnerId : undefined,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setToast(data?.error ?? "Impossible d'envoyer la reclamation");
        return;
      }

      setShowNewModal(false);
      resetCreateForm();
      setToast("Reclamation envoyee");
      await loadClaims();
    } catch (error) {
      console.error("Create claim failed", error);
      setToast("Impossible d'envoyer la reclamation");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(claimId: string, newStatus: Claim["status"]) {
    try {
      const response = await fetch(apiUrl("/api/claims"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: claimId, status: newStatus }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setToast(data?.error ?? "Mise a jour impossible");
        return;
      }

      await loadClaims();
      if (selectedClaim?.id === claimId) {
        setSelectedClaim(data);
      }
      setToast("Statut mis a jour");
    } catch (error) {
      console.error("Update status failed", error);
      setToast("Mise a jour impossible");
    }
  }

  async function handleDeleteClaim(claimId: string) {
    const ok = window.confirm("Supprimer definitivement cette reclamation ?");
    if (!ok) return;

    try {
      const response = await fetch(apiUrl("/api/claims"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: claimId }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setToast(data?.error ?? "Suppression impossible");
        return;
      }

      setSelectedClaim(null);
      setShowDetailModal(false);
      setToast("Reclamation supprimee");
      await loadClaims();
    } catch (error) {
      console.error("Delete claim failed", error);
      setToast("Suppression impossible");
    }
  }

  async function handleAddComment() {
    if (!selectedClaim || !commentText.trim()) {
      setToast("Commentaire obligatoire");
      return;
    }

    setCommentSaving(true);
    try {
      const response = await fetch(apiUrl("/api/claims"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedClaim.id, comment: commentText.trim() }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setToast(data?.error ?? "Ajout du commentaire impossible");
        return;
      }

      setSelectedClaim(data);
      setClaims((current) => current.map((item) => (item.id === data.id ? data : item)));
      setCommentText("");
      setToast("Commentaire ajoute");
    } catch (error) {
      console.error("Add comment failed", error);
      setToast("Ajout du commentaire impossible");
    } finally {
      setCommentSaving(false);
    }
  }

  const filteredClaims = claims.filter((claim) => {
    const ownerName = `${claim.owner?.firstName ?? ""} ${claim.owner?.name ?? ""}`.toLowerCase();
    const matchesSearch =
      claim.title.toLowerCase().includes(search.toLowerCase()) ||
      claim.description.toLowerCase().includes(search.toLowerCase()) ||
      ownerName.includes(search.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || claim.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  function getStatusInfo(status: string) {
    switch (status) {
      case "OPEN":
        return { label: "Ouverte", icon: Clock, color: "text-blue-600 bg-blue-50 border-blue-100" };
      case "IN_PROGRESS":
        return { label: "En cours", icon: AlertCircle, color: "text-amber-600 bg-amber-50 border-amber-100" };
      case "RESOLVED":
        return { label: "Traitee", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-100" };
      default:
        return { label: status, icon: MessageSquare, color: "text-slate-600 bg-slate-50 border-slate-100" };
    }
  }

  function getCommentAuthorLabel(claimComment: Claim["comments"][number]) {
    const owner = claimComment.user?.owner;
    if (owner?.firstName || owner?.name) {
      return `${owner.firstName ?? ""} ${owner.name ?? ""}`.trim();
    }

    return claimComment.user?.name?.trim() || claimComment.user?.email || "Utilisateur";
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col overflow-hidden">
      {toast ? (
        <div className="fixed right-6 top-20 z-[100] rounded-md bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="sticky top-0 z-10 shrink-0 bg-[#FCFCFB] pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Reclamations</h1>
            <p className="text-sm text-slate-500">Suivi et gestion des plaintes et demandes de travaux.</p>
          </div>
          <button type="button"
            onClick={openCreateModal}
            className="btn-brand flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold active:translate-y-0"
          ><Plus size={18} /> Nouvelle reclamation</button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher une reclamation..."
              className="h-11 w-full rounded-md border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-slate-900"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            className="h-11 rounded-md border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-900"
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="ALL">Tous les statuts</option>
            <option value="OPEN">Ouvertes</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="RESOLVED">Traitees</option>
          </select>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-auto pr-2">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="animate-pulse text-sm text-slate-400">Chargement des reclamations...</div>
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="flex h-60 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-slate-50 text-slate-400">
              <MessageSquare size={28} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Aucune reclamation trouvee</h3>
            <p className="mt-1 text-sm text-slate-500">
              {search || filterStatus !== "ALL"
                ? "Essaie de modifier tes filtres de recherche."
                : "Les reclamations apparaitront ici une fois soumises."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {filteredClaims.map((claim) => {
              const status = getStatusInfo(claim.status);
              return (
                <div
                  key={claim.id}
                  className="group relative rounded-3xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="pointer-events-none absolute left-5 right-5 top-5 z-[1] flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${status.color}`}>
                        <status.icon size={12} />
                        {status.label}
                      </div>
                      {isSA ? (
                          <button
                            type="button"
                            onClick={() =>void handleDeleteClaim(claim.id)} 
                            className="pointer-events-auto inline-flex gap-3 h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-sm transition-all hover:scale-110 active:scale-90" 
                            title="Supprimer la reclamation" 
                          > <Trash2 size={14} /></button>
                      ) : null}
                    </div>
                    <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
                      {new Date(claim.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClaim(claim);
                      setCommentText("");
                      setShowDetailModal(true);
                    }}
                    className="flex w-full cursor-pointer flex-col justify-between rounded-3xl p-5 pt-14 text-left"
                  >
                  <div>
                    <h3 className="line-clamp-1 text-base font-bold text-slate-900">{claim.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">
                      {claim.description}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-50 pt-4">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                          <UserIcon size={12} />
                          {claim.owner?.firstName} {claim.owner?.name}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                          <HomeIcon size={10} />
                          Lot {claim.unit?.lotNumber || claim.unit?.reference || "-"}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-md bg-slate-50 p-2 text-slate-400 transition group-hover:bg-slate-900 group-hover:text-white">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNewModal ? (
        <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="Nouvelle reclamation">
          <div className="mt-4 space-y-5">
            {isAdmin ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Proprietaire</label>
                  <select
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-900"
                    value={newOwnerId}
                    onChange={(event) => setNewOwnerId(event.target.value)}
                  >
                    <option value="">Selectionner un proprietaire...</option>
                    {availableOwners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.firstName} {owner.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Lot rattache</label>
                  <select
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
                    value={newUnitId}
                    onChange={(event) => setNewUnitId(event.target.value)}
                    disabled={!newOwnerId}
                  >
                    <option value="">Selectionner un lot...</option>
                    {selectedOwnerUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        Lot {unit.lotNumber || unit.reference}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}

            {!isAdmin ? (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Lot rattache</label>
                {ownerHasSingleUnit ? (
                  <input
                    className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-sm text-slate-600 outline-none"
                    value={getSelectedUnitLabel()}
                    disabled
                  />
                ) : (
                  <select
                    className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
                    value={newUnitId}
                    onChange={(event) => setNewUnitId(event.target.value)}
                    disabled={!ownerHasUnits}
                  >
                    <option value="">Selectionner votre lot...</option>
                    {selectedOwnerUnits.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        Lot {unit.lotNumber || unit.reference}
                      </option>
                    ))}
                  </select>
                )}
                {!ownerHasUnits ? (
                  <div className="text-xs text-amber-600">
                    Aucun lot actif n&apos;est rattache a votre compte.
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Rubrique</label>
              <select
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-900"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
              >
                <option value="General">General</option>
                <option value="Plomberie">Plomberie</option>
                <option value="Electricite">Electricite</option>
                <option value="Parties communes">Parties communes</option>
                <option value="Ascenseur">Ascenseur</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Objet</label>
              <input
                className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-900"
                placeholder="Titre de votre demande"
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Description de la reclamation</label>
              <textarea
                className="h-32 w-full resize-none rounded-md border border-slate-200 bg-white p-4 text-sm outline-none focus:border-slate-900"
                placeholder="Detaillez votre probleme ici..."
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="rounded-md bg-slate-100 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={
                  saving ||
                  !newTitle.trim() ||
                  !newDescription.trim() ||
                  (isAdmin ? (!newOwnerId || !newUnitId) : !newUnitId)
                }
                onClick={() => void handleCreate()}
                className="btn-brand rounded-md px-8 py-3 text-sm font-semibold active:translate-y-0 disabled:opacity-50"
              >
                {saving ? "Envoi..." : "Envoyer la reclamation"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {selectedClaim ? (
        <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)} title="Detail de la reclamation">
          <div className="mt-4 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className={`inline-flex gap-3 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${getStatusInfo(selectedClaim.status).color}`}>
                    {getStatusInfo(selectedClaim.status).label}
                  </div>
                </div>
                <h2 className="mt-3 text-xl font-bold text-slate-900">{selectedClaim.title}</h2>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    Soumise le {new Date(selectedClaim.createdAt).toLocaleDateString("fr-FR")} a{" "}
                    {new Date(selectedClaim.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-md bg-slate-50 p-5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Message</div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{selectedClaim.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border border-slate-100 p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Emetteur</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-200 text-slate-500">
                    <UserIcon size={14} />
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {selectedClaim.owner?.firstName} {selectedClaim.owner?.name}
                  </span>
                </div>
              </div>
              <div className="rounded-md border border-slate-100 p-4">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lot</div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-200 text-slate-500">
                    <HomeIcon size={14} />
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    Lot {selectedClaim.unit?.lotNumber || selectedClaim.unit?.reference || "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-md border border-slate-200 p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Commentaires</div>

              <div className="space-y-3">
                {selectedClaim.comments.length === 0 ? (
                  <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-400">
                    Aucun commentaire pour le moment.
                  </div>
                ) : (
                  selectedClaim.comments.map((claimComment) => (
                    <div key={claimComment.id} className="rounded-md bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">
                          {getCommentAuthorLabel(claimComment)}
                        </span>
                        <span>{new Date(claimComment.createdAt).toLocaleDateString("fr-FR")}</span>
                        <span>
                          {new Date(claimComment.createdAt).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                        {claimComment.message}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-sm font-semibold text-slate-700">Ajouter un commentaire</label>
                <textarea
                  className="h-28 w-full resize-none rounded-md border border-slate-200 bg-white p-4 text-sm outline-none focus:border-slate-900"
                  placeholder="Ecrire un commentaire..."
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={commentSaving || !commentText.trim()}
                    onClick={() => void handleAddComment()}
                    className="btn-brand rounded-md px-6 py-3 text-sm font-semibold disabled:opacity-50"
                  >
                    {commentSaving ? "Ajout..." : "Ajouter le commentaire"}
                  </button>
                </div>
              </div>
            </div>

            {isAdmin ? (
              <div className="space-y-3 border-t border-slate-100 pt-2">
                <div className="px-1 text-xs font-bold text-slate-900">Actions d&apos;administration</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleUpdateStatus(selectedClaim.id, "OPEN")}
                    className={`rounded-md px-4 py-2 text-xs font-bold transition ${selectedClaim.status === "OPEN" ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    Ouverte
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUpdateStatus(selectedClaim.id, "IN_PROGRESS")}
                    className={`rounded-md px-4 py-2 text-xs font-bold transition ${selectedClaim.status === "IN_PROGRESS" ? "bg-amber-500 text-white shadow-md shadow-amber-100" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    En cours
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleUpdateStatus(selectedClaim.id, "RESOLVED")}
                    className={`rounded-md px-4 py-2 text-xs font-bold transition ${selectedClaim.status === "RESOLVED" ? "bg-emerald-600 text-white shadow-md shadow-emerald-100" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    Traitee
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="btn-brand rounded-md px-8 py-3 text-sm font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
