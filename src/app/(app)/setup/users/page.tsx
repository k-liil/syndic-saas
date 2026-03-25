"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { canManageUsers, getRoleLabel } from "@/lib/roles";

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

  const load = useCallback(async () => {
    setLoading(true);

    const [usersRes, orgsRes] = await Promise.all([
      fetch("/api/users", { cache: "no-store" }),
      fetch("/api/organizations", { cache: "no-store" }),
    ]);

    const usersJson = await usersRes.json().catch(() => null);
    setUsers(Array.isArray(usersJson?.users) ? usersJson.users : []);

    const orgsJson = await orgsRes.json().catch(() => null);
    const nextOrganizations = Array.isArray(orgsJson) ? orgsJson : [];
    setOrganizations(nextOrganizations);
    if (!newOrgId && nextOrganizations.length > 0) {
      setNewOrgId(nextOrganizations[0].id);
    }

    setLoading(false);
  }, [newOrgId]);

  useEffect(() => {
    if (!allowed) return;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [allowed, load]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function createUser() {
    if (!email.trim() || !password.trim() || !newOrgId) {
      setToast("Nom, email, mot de passe et organisation sont obligatoires");
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
    setNewActive(true);
    setToast("Gestionnaire cree");
    await load();
  }

  async function saveUser(user: UserItem) {
    const passwordToReset = window.prompt(
      "Nouveau mot de passe (laisse vide pour ne pas le changer)",
    );

    setSavingId(user.id);
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: user.id,
        name: user.name,
        isActive: user.isActive,
        password: passwordToReset ?? "",
      }),
    });
    const json = await res.json().catch(() => null);
    setSavingId("");

    if (!res.ok) {
      setToast(json?.error ?? "Mise a jour impossible");
      return;
    }

    setToast("Utilisateur mis a jour");
    await load();
  }

  async function addOrgToUser(user: UserItem, orgId: string) {
    setSavingId(user.id);
    const res = await fetch(`/api/users/${user.id}/organizations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", organizationId: orgId, role: "MANAGER" }),
    });
    const json = await res.json().catch(() => null);
    setSavingId("");

    if (!res.ok) {
      setToast(json?.error ?? "Ajout impossible");
      return;
    }

    setToast("Organisation ajoutee");
    await load();
  }

  async function removeOrgFromUser(user: UserItem, orgId: string) {
    if (!window.confirm("Retirer l'acces a cette organisation ?")) return;

    setSavingId(user.id);
    const res = await fetch(`/api/users/${user.id}/organizations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", organizationId: orgId }),
    });
    const json = await res.json().catch(() => null);
    setSavingId("");

    if (!res.ok) {
      setToast(json?.error ?? "Suppression impossible");
      return;
    }

    setToast("Organisation retiree");
    await load();
  }

  if (!allowed) {
    return (
      <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Utilisateurs</h1>
        <p className="mt-3 text-sm text-zinc-500">
          Cette page est reservee au super admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
          {toast}
        </div>
      ) : null}

      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-900">Utilisateurs</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Le super admin cree et affecte les gestionnaires aux organisations. Les coproprietaires sont egalement affiches ici.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Nom</span>
            <input
              className="h-11 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom complet"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Email</span>
            <input
              className="h-11 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gestionnaire@example.com"
              type="email"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Mot de passe</span>
            <input
              className="h-11 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe initial"
              type="password"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-700">Organisation</span>
            <select
              className="h-11 w-full rounded-2xl border border-zinc-200 px-4 text-sm outline-none"
              value={newOrgId}
              onChange={(e) => setNewOrgId(e.target.value)}
            >
              <option value="">Selectionner...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
            Profil Gestionnaire
          </span>

          <label className="flex items-center gap-3 text-sm text-zinc-600">
            <input
              checked={newActive}
              onChange={(e) => setNewActive(e.target.checked)}
              type="checkbox"
              className="h-5 w-5 rounded border-zinc-300"
            />
            Compte actif
          </label>
        </div>

        <button
          className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          disabled={creating}
          onClick={createUser}
          type="button"
        >
          {creating ? "Creation..." : "Ajouter un gestionnaire"}
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Liste des comptes</h2>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-sm text-zinc-500">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-8 text-sm text-zinc-500">Aucun compte.</div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {users.map((user) => {
              const availableOrgOptions = organizations.filter(
                (org) => !user.organizations.some((uo) => uo.organizationId === org.id),
              );

              return (
                <div key={user.id} className="px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold text-zinc-900">
                          {user.name || "-"}
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            user.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-zinc-100 text-zinc-500"
                          }`}
                        >
                          {user.isActive ? "Actif" : "Inactif"}
                        </span>
                        <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700">
                          {getRoleLabel(user.role)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-zinc-500">{user.email}</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        Cree le {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {user.organizations.map((uo) => (
                          <div
                            key={uo.organizationId}
                            className="flex items-center gap-2 rounded-lg bg-blue-50 px-2 py-1"
                          >
                            <span className="text-xs text-blue-700">
                              {uo.organizationName || uo.organizationId}
                            </span>
                            {user.role !== "SUPER_ADMIN" ? (
                              <button
                                className="h-5 w-5 rounded-full text-blue-400 hover:bg-blue-100 hover:text-blue-600"
                                onClick={() => void removeOrgFromUser(user, uo.organizationId)}
                                title="Retirer"
                                type="button"
                              >
                                x
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      {user.role !== "SUPER_ADMIN" && availableOrgOptions.length > 0 ? (
                        <div className="mt-3 flex items-center gap-2">
                          <select
                            className="h-8 rounded-lg border border-zinc-200 px-2 text-xs"
                            id={`add-org-${user.id}`}
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Ajouter organisation...
                            </option>
                            {availableOrgOptions.map((org) => (
                              <option key={org.id} value={org.id}>
                                {org.name}
                              </option>
                            ))}
                          </select>
                          <button
                            className="h-8 rounded-lg bg-slate-950 px-3 text-xs font-medium text-white"
                            onClick={() => {
                              const orgSelect = document.getElementById(
                                `add-org-${user.id}`,
                              ) as HTMLSelectElement | null;
                              if (orgSelect?.value) {
                                void addOrgToUser(user, orgSelect.value);
                                orgSelect.value = "";
                              }
                            }}
                            type="button"
                          >
                            +
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {user.role !== "SUPER_ADMIN" ? (
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            checked={user.isActive}
                            onChange={(e) => {
                              setUsers((prev) =>
                                prev.map((item) =>
                                  item.id === user.id
                                    ? { ...item, isActive: e.target.checked }
                                    : item,
                                ),
                              );
                            }}
                            type="checkbox"
                            className="h-4 w-4 rounded border-zinc-300"
                          />
                          <span className="text-xs text-zinc-500">Actif</span>
                        </label>

                        <button
                          className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                          disabled={savingId === user.id}
                          onClick={() => void saveUser(user)}
                          type="button"
                        >
                          {savingId === user.id ? "Enregistrement..." : "Enregistrer"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
