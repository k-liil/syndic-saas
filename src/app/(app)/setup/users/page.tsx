"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { canManageUsers, getRoleLabel } from "@/lib/roles";
import { Table, THead, TR, TH, TD, TableBody } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import { Plus, Settings, X, Shield, User, Mail, Calendar, Key, Building2 } from "lucide-react";

type UserOrg = {
  organizationId: string;
  organizationName: string | null;
  role: string;
};

type UserItem = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  organizations: UserOrg[];
};

type Organization = {
  id: string;
  name: string;
  slug: string;
};

export default function UsersPage() {
  const { data: session } = useSession();
  const allowed = canManageUsers(session?.user?.role);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [toast, setToast] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newOrgId, setNewOrgId] = useState("");
  const [newActive, setNewActive] = useState(true);
  const [creating, setCreating] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const selectedUser = selectedUserId ? users.find(u => u.id === selectedUserId) : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, orgsRes] = await Promise.all([
        fetch("/api/users", { cache: "no-store" }),
        fetch("/api/organizations", { cache: "no-store" }),
      ]);

      const usersJson = await usersRes.json().catch(() => null);
      const fetchedUsers = Array.isArray(usersJson?.users) ? usersJson.users : [];
      setUsers(fetchedUsers);

      const orgsJson = await orgsRes.json().catch(() => null);
      const nextOrganizations = Array.isArray(orgsJson) ? orgsJson : [];
      setOrganizations(nextOrganizations);
      
      setNewOrgId(prev => prev || (nextOrganizations[0]?.id || ""));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    load();
  }, [allowed, load]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timeout);
  }, [toast]);

  async function createUser() {
    if (!email.trim() || !password.trim() || !newOrgId) {
      setToast("Email, mot de passe et organisation obligatoires");
      return;
    }

    setCreating(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        role: "MANAGER",
        organizationId: newOrgId,
        isActive: newActive,
      }),
    });
    const json = await res.json().catch(() => null);
    setCreating(false);

    if (!res.ok) {
      setToast(json?.error ?? "Creation impossible");
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    setToast("Gestionnaire cree");
    await load();
  }

  async function updateUserInfo() {
    if (!selectedUser) return;
    setIsUpdating(true);
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selectedUser.id,
        name: selectedUser.name,
        isActive: selectedUser.isActive,
        password: newPassword.trim() || "",
      }),
    });
    setIsUpdating(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setToast(json?.error ?? "Erreur de mise à jour");
      return;
    }

    setToast("Utilisateur mis à jour");
    setNewPassword("");
    await load();
  }

  async function addOrgToUser(orgId: string) {
    if (!selectedUser) return;
    setSavingId(selectedUser.id);
    const res = await fetch(`/api/users/${selectedUser.id}/organizations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", organizationId: orgId, role: "MANAGER" }),
    });
    setSavingId("");

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setToast(json?.error ?? "Ajout impossible");
      return;
    }

    setToast("Organisation ajoutée");
    await load();
  }

  async function removeOrgFromUser(orgId: string) {
    if (!selectedUser) return;
    if (!confirm("Retirer l'accès à cette organisation ?")) return;

    setSavingId(selectedUser.id);
    const res = await fetch(`/api/users/${selectedUser.id}/organizations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", organizationId: orgId }),
    });
    setSavingId("");

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setToast(json?.error ?? "Suppression impossible");
      return;
    }

    setToast("Organisation retirée");
    await load();
  }

  if (!allowed) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Utilisateurs</h1>
        <p className="mt-3 text-sm text-zinc-500">Accès réservé au Super Admin.</p>
      </div>
    );
  }

  const availableOrgOptions = selectedUser 
    ? organizations.filter(org => !selectedUser.organizations.some(uo => uo.organizationId === org.id))
    : [];

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-6 right-6 z-[100] rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-900 shadow-xl animate-in slide-in-from-top-4">
          {toast}
        </div>
      )}

      {/* Formulaire d'ajout */}
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Gestion des Comptes</h1>
            <p className="text-sm text-zinc-500 mt-1">Créez et affectez les gestionnaires aux organisations.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Nom complet</label>
            <input
              className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prénom et Nom"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Email</label>
            <input
              className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              type="email"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Mot de passe</label>
            <input
              className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
              type="password"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Organisation</label>
            <select
              className="h-11 w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
              value={newOrgId}
              onChange={(e) => setNewOrgId(e.target.value)}
            >
              <option value="">Choisir...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              checked={newActive}
              onChange={(e) => setNewActive(e.target.checked)}
              type="checkbox"
              className="h-5 w-5 rounded-lg border-zinc-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-zinc-600 group-hover:text-zinc-900 transition">Compte actif immédiatement</span>
          </label>

          <button
            onClick={createUser}
            disabled={creating}
            className="btn-brand inline-flex h-12 items-center gap-2 rounded-2xl px-6 text-sm font-semibold shadow-lg shadow-indigo-200 disabled:opacity-50 transition active:scale-95"
            style={{ backgroundColor: "#4f46e5", color: "white" }}
          >
            {creating ? "Création..." : <><Plus size={16} /> Ajouter le gestionnaire</>}
          </button>
        </div>
      </div>

      {/* Tableau des comptes */}
      <Table>
        <THead>
          <TR>
            <TH className="w-1/4">Nom</TH>
            <TH>Statut</TH>
            <TH>Rôle</TH>
            <TH>Email</TH>
            <TH>Création</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TableBody>
          {loading ? (
            <TR><TD colSpan={6} className="text-center py-12 text-zinc-400 italic">Chargement des utilisateurs...</TD></TR>
          ) : users.length === 0 ? (
            <TR><TD colSpan={6} className="text-center py-12 text-zinc-400 italic">Aucun compte trouvé.</TD></TR>
          ) : (
            users.map((user) => (
              <TR 
                key={user.id} 
                className="group hover:bg-zinc-50/50 cursor-pointer transition"
                onClick={() => setSelectedUserId(user.id)}
              >
                <TD className="font-semibold text-zinc-900">{user.name || "-"}</TD>
                <TD>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                  }`}>
                    {user.isActive ? "Actif" : "Inactif"}
                  </span>
                </TD>
                <TD>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    <Shield size={10} /> {getRoleLabel(user.role)}
                  </span>
                </TD>
                <TD className="text-zinc-600 font-medium">{user.email}</TD>
                <TD className="text-zinc-500">{new Date(user.createdAt).toLocaleDateString("fr-FR")}</TD>
                <TD className="text-right">
                  <button className="p-2 text-zinc-400 group-hover:text-indigo-600 transition">
                    <Settings size={18} />
                  </button>
                </TD>
              </TR>
            ))
          )}
        </TableBody>
      </Table>

      {/* Modal Détails / Edition */}
      <Modal
        open={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        title="Détails du compte"
        containerClassName="w-[min(640px,94vw)]"
      >
        {selectedUser && (
          <div className="space-y-8">
            {/* Infos de base */}
            <div className="grid grid-cols-2 gap-6 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Utilisateur</span>
                <div className="flex items-center gap-2 font-semibold text-zinc-900">
                  <User size={14} className="text-zinc-400" /> {selectedUser.name}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Email</span>
                <div className="flex items-center gap-2 font-medium text-zinc-600">
                  <Mail size={14} className="text-zinc-400" /> {selectedUser.email}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Statut</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUser.isActive}
                    onChange={(e) => {
                      const updatedUsers = users.map(u => u.id === selectedUser.id ? {...u, isActive: e.target.checked} : u);
                      setUsers(updatedUsers);
                    }}
                    className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
                  />
                  <span className="text-sm font-medium">{selectedUser.isActive ? "Compte Actif" : "Compte Désactivé"}</span>
                </label>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Membre depuis</span>
                <div className="flex items-center gap-2 text-zinc-500 text-sm">
                  <Calendar size={14} className="text-zinc-400" /> {new Date(selectedUser.createdAt).toLocaleDateString("fr-FR")}
                </div>
              </div>
            </div>

            {/* Mot de passe */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Key size={16} className="text-indigo-600" /> Sécurité
              </h3>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Changer le mot de passe</label>
                  <input
                    type="password"
                    className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Laisser vide pour ne pas changer"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <button
                  onClick={updateUserInfo}
                  disabled={isUpdating}
                  className="h-10 px-4 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition disabled:opacity-50"
                >
                  {isUpdating ? "Mise à jour..." : "Enregistrer"}
                </button>
              </div>
            </div>

            {/* Organisations */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <Building2 size={16} className="text-indigo-600" /> Accès Organisations
              </h3>
              
              <div className="space-y-2">
                {selectedUser.organizations.map((uo) => (
                  <div key={uo.organizationId} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                    <span className="text-sm font-medium text-zinc-700">{uo.organizationName || uo.organizationId}</span>
                    {selectedUser.role !== "SUPER_ADMIN" && (
                      <button 
                        onClick={() => removeOrgFromUser(uo.organizationId)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-500 transition"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {selectedUser.organizations.length === 0 && (
                  <div className="text-center py-4 text-zinc-400 italic text-xs border border-dashed border-zinc-200 rounded-xl">
                    Aucune organisation affectée
                  </div>
                )}
              </div>

              {selectedUser.role !== "SUPER_ADMIN" && availableOrgOptions.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <select
                      className="h-10 flex-1 rounded-xl border border-zinc-200 px-3 text-sm outline-none"
                      id="modal-add-org"
                    >
                      <option value="" disabled selected>Ajouter un accès...</option>
                      {availableOrgOptions.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                    <button
                      className="h-10 rounded-xl bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-sm"
                      onClick={() => {
                        const select = document.getElementById("modal-add-org") as HTMLSelectElement;
                        if (select.value) {
                          addOrgToUser(select.value);
                          select.value = "";
                        }
                      }}
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
