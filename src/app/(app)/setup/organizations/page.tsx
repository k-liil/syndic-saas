"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { isSuperAdmin } from "@/lib/roles";
import { Modal } from "@/components/ui/Modal";
import { Table, THead, TR, TH, TD } from "@/components/ui/Table";
import { Building2, Users, Home, Receipt, AlertCircle, PlusCircle } from "lucide-react";

type OrgStats = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  address: string | null;
  city: string | null;
  zipCode: string | null;
  email: string | null;
  phone: string | null;
  landTitle: string | null;
  srmContact: string | null;
  rib: string | null;
  logoUrl: string | null;
  logoSize: string | null;
  createdAt: string;
  _count: {
    users: number;
    buildings: number;
    units: number;
    owners: number;
    payments: number;
    receipts: number;
  };
};

const initialFormData = {
  name: "", slug: "", address: "", city: "", zipCode: "", email: "", phone: "", landTitle: "", srmContact: "", rib: "", logoUrl: "", logoSize: ""
};

export default function OrganizationsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isGlobalAdmin = isSuperAdmin(role);

  const [organizations, setOrganizations] = useState<OrgStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ ...initialFormData });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editingOrg, setEditingOrg] = useState<OrgStats | null>(null);
  const [editFormData, setEditFormData] = useState({ ...initialFormData, isActive: true });
  const [saving, setSaving] = useState(false);

  const handleImageResizeAndUpload = (file: File, callback: (base64: string) => void) => {
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Str = event.target?.result as string;
        
        // Si le fichier est petit (< 200 KB), on évite le Canvas et on renvoie direct.
        if (file.size < 200 * 1024) {
          callback(base64Str);
          return;
        }

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          callback(canvas.toDataURL("image/webp", 0.8));
        };
        img.onerror = () => {
          // Fallback de sécurité si l'image plante au décodage Canvas
          callback(base64Str);
        };
        img.src = base64Str;
      };
      reader.onerror = () => alert("Impossible de lire le fichier.");
      reader.readAsDataURL(file);
    } catch (e: any) {
      alert("Erreur inattendue : " + e.message);
    }
  };

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/organizations", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur de chargement");
      }
      const data = await res.json();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setFormData({ ...initialFormData });
    setCreateError("");
    setShowCreate(true);
  }

  function handleSlugChange(value: string, isEdit: boolean) {
    const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
    if (isEdit) {
      setEditFormData(prev => ({ ...prev, slug }));
    } else {
      setFormData(prev => ({ ...prev, slug }));
    }
  }

  async function createOrganization() {
    if (!formData.name.trim() || !formData.slug.trim()) {
      setCreateError("Le nom et le slug sont obligatoires.");
      return;
    }

    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          name: formData.name.trim(),
          slug: formData.slug.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur de création");
      }

      setShowCreate(false);
      await load();
    } catch (e: any) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }

  function openEdit(org: OrgStats) {
    setEditingOrg(org);
    setEditFormData({
      name: org.name || "",
      slug: org.slug || "",
      address: org.address || "",
      city: org.city || "",
      zipCode: org.zipCode || "",
      email: org.email || "",
      phone: org.phone || "",
      landTitle: org.landTitle || "",
      srmContact: org.srmContact || "",
      rib: org.rib || "",
      logoUrl: org.logoUrl || "",
      logoSize: org.logoSize || "",
      isActive: org.isActive,
    });
  }

  async function saveOrg() {
    if (!editingOrg || !editFormData.name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${editingOrg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editFormData,
          name: editFormData.name.trim(),
          slug: editFormData.slug.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");

      setEditingOrg(null);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrg(org: OrgStats) {
    if (!confirm(`Supprimer "${org.name}" ?`)) return;

    try {
      const res = await fetch(`/api/organizations/${org.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Organisations</h1>
          <p className="mt-1 text-sm text-zinc-500">Gestion de vos copropriétés</p>
        </div>
        {isGlobalAdmin && (
          <button onClick={openCreate}
            className="flex items-center gap-2 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-cyan-600 hover:to-blue-700 hover:shadow"
          ><PlusCircle className="h-4 w-4" /> Nouvelle organisation</button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-zinc-500">Chargement...</div>
      ) : organizations.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 bg-zinc-50/50 p-12 text-center text-zinc-500">
          Aucune organisation pour le moment
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {organizations.map((org) => (
            <div
              key={org.id}
              onClick={() => openEdit(org)}
              className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-md border border-zinc-200 bg-white p-5 text-left shadow-sm transition-all hover:border-cyan-200 hover:shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between">
                  {org.logoUrl ? (
                    <img src={org.logoUrl} alt={org.name} className="h-10 w-10 shrink-0 rounded-md object-contain drop-shadow-sm" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan-50 font-bold text-cyan-600">
                      {org.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span
                    className={`inline-flex gap-3 items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                      org.isActive
                        ? "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/20"
                        : "bg-red-50 text-red-600 ring-1 ring-inset ring-red-500/20"
                    }`}
                  >
                    {org.isActive ? "Actif" : "Inactif"}
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="line-clamp-1 font-bold text-zinc-900">{org.name}</h3>
                  <p className="line-clamp-1 text-sm text-zinc-500">{org.rib ? `RIB: ${org.rib}` : org.slug}</p>
                </div>
                {org.city && (
                  <p className="mt-1 text-xs text-zinc-400">📍 {org.address}, {org.city}</p>
                )}
              </div>

              <div className="mt-6 flex items-center gap-4 border-t border-zinc-100 pt-4 text-xs font-medium text-zinc-600">
                <div className="flex items-center gap-1.5" title="Utilisateurs">
                  <Users size={14} className="text-zinc-400" />
                  {org._count.users}
                </div>
                <div className="flex items-center gap-1.5" title="Immeubles">
                  <Building2 size={14} className="text-zinc-400" />
                  {org._count.buildings}
                </div>
                <div className="flex items-center gap-1.5" title="Lots">
                  <Home size={14} className="text-zinc-400" />
                  {org._count.units}
                </div>
                <div className="flex flex-1 justify-end">
                  {isGlobalAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOrg(org);
                      }}
                      className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                      disabled={org._count.units > 0 || org._count.owners > 0}
                      title={
                        org._count.units > 0 || org._count.owners > 0
                          ? "Impossible à supprimer (Données rattachées existantes)"
                          : "Supprimer l'organisation"
                      }
                    >
                      <AlertCircle size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL CRÉER --- */}
      <Modal
        open={showCreate}
        onClose={() => !creating && setShowCreate(false)}
        title="Nouvelle organisation"
        zIndex={50}
        containerClassName="max-w-4xl w-full"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Nom *</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Les Jardins de Cherrat"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Adresse</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Ex: Route côtière..."
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-700">Ville</label>
              <input
                className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-medium text-zinc-700">Code postal</label>
              <input
                className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
                value={formData.zipCode}
                onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Slug * (URL)</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={formData.slug}
              onChange={(e) => handleSlugChange(e.target.value, false)}
              placeholder="les-jardins-cherrat"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Adresse email</label>
            <input
              type="email"
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Téléphone</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Titre foncier</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={formData.landTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, landTitle: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Numéro de contact SRM</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={formData.srmContact}
              onChange={(e) => setFormData(prev => ({ ...prev, srmContact: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700">RIB</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={formData.rib}
              onChange={(e) => setFormData(prev => ({ ...prev, rib: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Logo de l'organisation (Fichier Image)</label>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm text-zinc-500 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-700 hover:file:bg-cyan-100"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageResizeAndUpload(file, (base64) => {
                    setFormData(prev => ({ ...prev, logoUrl: base64 }));
                  });
                }
              }}
            />
          </div>
          <div className="md:col-span-2 pt-4">
            {createError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {createError}
              </div>
            )}
            <button onClick={createOrganization}
              disabled={creating}
              className="flex items-center gap-2 w-full rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-cyan-600 hover:to-blue-700 hover:shadow disabled:opacity-40"
            >
              {creating ? "Création..." : "Créer l'organisation"}
            </button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL ÉDITER --- */}
      <Modal
        open={!!editingOrg}
        onClose={() => setEditingOrg(null)}
        title={`Modifier: ${editingOrg?.name}`}
        zIndex={50}
        containerClassName="max-w-4xl w-full"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">Nom *</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={editFormData.name}
              onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Adresse</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={editFormData.address}
              onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-zinc-700">Ville</label>
              <input
                className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
                value={editFormData.city}
                onChange={(e) => setEditFormData(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div className="w-1/3">
              <label className="block text-sm font-medium text-zinc-700">Code postal</label>
              <input
                className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
                value={editFormData.zipCode}
                onChange={(e) => setEditFormData(prev => ({ ...prev, zipCode: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Slug * (URL)</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={editFormData.slug}
              onChange={(e) => handleSlugChange(e.target.value, true)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Adresse email</label>
            <input
              type="email"
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={editFormData.email}
              onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Téléphone</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={editFormData.phone}
              onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Titre foncier</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={editFormData.landTitle}
              onChange={(e) => setEditFormData(prev => ({ ...prev, landTitle: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Numéro de contact SRM</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={editFormData.srmContact}
              onChange={(e) => setEditFormData(prev => ({ ...prev, srmContact: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-zinc-700">RIB</label>
            <input
              className="mt-1 h-10 w-full rounded-md border border-zinc-200 px-3"
              value={editFormData.rib}
              onChange={(e) => setEditFormData(prev => ({ ...prev, rib: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Logo de l'organisation (Fichier Image)</label>
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-sm text-zinc-500 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cyan-700 hover:file:bg-cyan-100"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageResizeAndUpload(file, (base64) => {
                    setEditFormData(prev => ({ ...prev, logoUrl: base64 }));
                  });
                }
              }}
            />
          </div>
          {isGlobalAdmin && (
            <div className="md:col-span-2 pt-2 pb-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editFormData.isActive}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <span className="text-sm font-medium">Organisation active sur la plateforme</span>
              </label>
            </div>
          )}

          <div className="md:col-span-2 pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button
              onClick={() => setEditingOrg(null)}
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Annuler
            </button>
            <button onClick={saveOrg}
              disabled={saving || !editFormData.name.trim()}
              className="flex items-center gap-2 rounded-md w-32 bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-cyan-600 hover:to-blue-700 hover:shadow disabled:opacity-40"
            >
              {saving ? "Sauvegarde..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
