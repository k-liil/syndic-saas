"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Pencil, Plus, Power, PowerOff } from "lucide-react";
import { canManage } from "@/lib/roles";
import { useApiUrl, useOrgId } from "@/lib/org-context";

type AccountingPost = {
  id: string;
  code: string;
  name: string;
  postType: "CHARGE" | "PRODUCT";
  note: string | null;
  isActive: boolean;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Erreur";
}

function ActivationSwitch({
  checked,
  disabled,
  onToggle,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
        checked ? "bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-[0_2px_10px_rgba(16,185,129,0.2)]" : "bg-zinc-300"
      } ${disabled ? "cursor-not-allowed opacity-60" : "hover:scale-105 active:scale-95"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-all duration-300 ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function PostsSection({
  title,
  badgeClassName,
  badgeLabel,
  accentClassName,
  posts,
  canEdit,
  busyIds,
  onEdit,
  onToggle,
}: {
  title: string;
  badgeClassName: string;
  badgeLabel: string;
  accentClassName: string;
  posts: AccountingPost[];
  canEdit: boolean;
  busyIds: Set<string>;
  onEdit: (post: AccountingPost) => void;
  onToggle: (post: AccountingPost) => void;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900">
          {title} ({posts.length})
        </h2>
        <span className={`rounded-md px-3 py-1 text-xs font-medium ${badgeClassName}`}>
          {badgeLabel}
        </span>
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun poste.</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const busy = busyIds.has(post.id);

            return (
              <div
                key={post.id}
                className={`flex items-center justify-between gap-4 rounded-md border px-4 py-3 transition ${
                  post.isActive
                    ? "border-zinc-200 bg-white"
                    : "border-zinc-100 bg-zinc-50"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-sm font-semibold ${accentClassName}`}>
                      {post.code}
                    </span>
                    <span className="truncate text-sm text-zinc-800">{post.name}</span>
                  </div>
                  {post.note ? (
                    <div className="mt-1 text-xs text-zinc-500">{post.note}</div>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={
                      post.isActive
                        ? "inline-flex gap-3 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
                        : "inline-flex gap-3 rounded-md bg-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600"
                    }
                  >
                    {post.isActive ? "Actif" : "Inactif"}
                  </span>

                  {canEdit ? (
                    <>
                      <ActivationSwitch
                        checked={post.isActive}
                        disabled={busy}
                        onToggle={() => onToggle(post)}
                      />
                      <button
                        type="button"
                        onClick={() => onEdit(post)}
                        className="inline-flex gap-3 h-10 w-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100"
                        aria-label={`Modifier ${post.code}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AccountingPostsPage() {
  const { data: session } = useSession();
  const canEdit = canManage(session?.user?.role);
  const apiUrl = useApiUrl();
  const orgId = useOrgId();

  const [posts, setPosts] = useState<AccountingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editPost, setEditPost] = useState<AccountingPost | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [postType, setPostType] = useState<"CHARGE" | "PRODUCT">("CHARGE");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => setToast(""), 2500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(apiUrl("/api/accounting-posts"), { cache: "no-store" });
    const json = await res.json();
    setPosts(Array.isArray(json.posts) ? json.posts : []);
    setLoading(false);
  }, [apiUrl]);

  useEffect(() => {
    if (orgId) {
      void load();
    }
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [load, orgId]);

  function resetForm() {
    setCode("");
    setName("");
    setPostType("CHARGE");
    setNote("");
    setEditPost(null);
  }

  function openCreate() {
    resetForm();
    setShowCreate(true);
  }

  function openEdit(post: AccountingPost) {
    setCode(post.code);
    setName(post.name);
    setPostType(post.postType);
    setNote(post.note ?? "");
    setEditPost(post);
    setShowCreate(true);
  }

  function closeModal() {
    setShowCreate(false);
    resetForm();
  }

  async function savePost() {
    if (!code.trim() || !name.trim()) {
      showToast("Code et nom sont obligatoires");
      return;
    }

    setSubmitting(true);

    try {
      const body: {
        id?: string;
        code: string;
        name: string;
        postType: "CHARGE" | "PRODUCT";
        note: string | null;
      } = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        postType,
        note: note.trim() || null,
      };

      if (editPost) {
        body.id = editPost.id;
      }

      const res = await fetch(apiUrl("/api/accounting-posts"), {
        method: editPost ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(typeof err?.error === "string" ? err.error : "Erreur");
        return;
      }

      await load();
      closeModal();
      showToast(editPost ? "Poste modifie" : "Poste cree et desactive");
    } finally {
      setSubmitting(false);
    }
  }


  async function updateActivation(post: AccountingPost, nextActive: boolean) {
    setBusyIds((current) => [...current, post.id]);

    try {
      const res = await fetch(apiUrl("/api/accounting-posts"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, isActive: nextActive }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(typeof err?.error === "string" ? err.error : "Erreur");
        return;
      }

      setPosts((current) =>
        current.map((item) =>
          item.id === post.id ? { ...item, isActive: nextActive } : item
        )
      );
      showToast(nextActive ? "Poste active" : "Poste desactive");
    } finally {
      setBusyIds((current) => current.filter((id) => id !== post.id));
    }
  }

  async function setAllPostsActive(nextActive: boolean) {
    if (posts.length === 0) return;

    setBulkBusy(true);
    const previousPosts = posts;
    setPosts((current) =>
      current.map((post) => ({ ...post, isActive: nextActive }))
    );

    try {
      const res = await fetch(apiUrl("/api/accounting-posts"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setPosts(previousPosts);
        showToast(typeof err?.error === "string" ? err.error : "Erreur");
        return;
      }

      showToast(nextActive ? "Tous les postes sont actifs" : "Tous les postes sont inactifs");
    } catch (error) {
      setPosts(previousPosts);
      showToast(getErrorMessage(error));
    } finally {
      setBulkBusy(false);
    }
  }

  const charges = posts.filter((post) => post.postType === "CHARGE");
  const products = posts.filter((post) => post.postType === "PRODUCT");
  const busyIdSet = new Set(busyIds);
  const isDangerToast =
    toast === "Tous les postes sont inactifs" || toast === "Poste desactive";

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={`fixed right-6 top-6 z-[100] rounded-md px-4 py-3 text-sm font-semibold text-white shadow-lg ${
            isDangerToast ? "bg-red-500" : "bg-emerald-500"
          }`}
        >
          {toast}
        </div>
      ) : null}

      <div className="page-section-inline">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Postes comptables
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Active ou desactive les postes utilises dans le budget et les paiements.
            </p>
          </div>

          {canEdit ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void setAllPostsActive(true)}
                disabled={bulkBusy}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Power className="h-4 w-4" />
                Tout activer
              </button>
              <button
                type="button"
                onClick={() => void setAllPostsActive(false)}
                disabled={bulkBusy}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-50 hover:shadow-sm active:scale-95 disabled:opacity-50"
              >
                <PowerOff className="h-4 w-4" />
                Tout désactiver
              </button>
              <button type="button"
                onClick={openCreate}
                className="btn-brand inline-flex gap-3 h-10 items-center gap-2 rounded-md px-5 text-sm font-semibold"
              ><Plus className="h-4 w-4" /> Nouveau poste</button>
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          Chargement...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <PostsSection
            title="Charges"
            badgeClassName="bg-red-100 text-red-700"
            badgeLabel="6xxx"
            accentClassName="text-indigo-600"
            posts={charges}
            canEdit={canEdit}
            busyIds={busyIdSet}
            onEdit={openEdit}
            onToggle={(post) => void updateActivation(post, !post.isActive)}
          />
          <PostsSection
            title="Produits"
            badgeClassName="bg-green-100 text-green-700"
            badgeLabel="7xxx"
            accentClassName="text-green-600"
            posts={products}
            canEdit={canEdit}
            busyIds={busyIdSet}
            onEdit={openEdit}
            onToggle={(post) => void updateActivation(post, !post.isActive)}
          />
        </div>
      )}

      {canEdit && showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={closeModal}>
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-zinc-900">
                {editPost ? "Modifier le poste" : "Nouveau poste comptable"}
              </h2>
              <button onClick={closeModal} className="flex items-center gap-2 text-2xl text-zinc-400">
                &times;
              </button>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Type
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPostType("CHARGE")}
                    className={`flex-1 rounded-md border py-3 text-sm font-medium transition ${
                      postType === "CHARGE"
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    Charge (6xxx)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostType("PRODUCT")}
                    className={`flex-1 rounded-md border py-3 text-sm font-medium transition ${
                      postType === "PRODUCT"
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    Produit (7xxx)
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Code
                </label>
                <input
                  className="h-12 w-full rounded-md border border-zinc-200 px-4 text-sm outline-none"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="6111"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Nom
                </label>
                <input
                  className="h-12 w-full rounded-md border border-zinc-200 px-4 text-sm outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Eau"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700">
                  Note (optionnel)
                </label>
                <input
                  className="h-12 w-full rounded-md border border-zinc-200 px-4 text-sm outline-none"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Consommation mensuelle"
                />
              </div>

              {!editPost ? (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                  Le poste sera cree comme inactif par defaut.
                </div>
              ) : null}

              <button
                onClick={() => void savePost()}
                disabled={submitting}
                className="btn-brand h-12 w-full rounded-md text-sm font-semibold disabled:opacity-50"
              >
                {submitting ? "Enregistrement..." : editPost ? "Enregistrer" : "Creer le poste"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
