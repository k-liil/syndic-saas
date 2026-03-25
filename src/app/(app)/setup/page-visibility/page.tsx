"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Shield } from "lucide-react";
import { normalizeRole, type AppRole } from "@/lib/roles";

type PageVisibilityItem = {
  href: string;
  title: string;
  section: string;
  icon: string;
  isEnabled: boolean;
  roles: Record<AppRole, boolean>;
};

const roleColumns: AppRole[] = ["GUEST", "OWNER", "MANAGER", "SUPER_ADMIN"];

const roleLabels: Record<AppRole, string> = {
  GUEST: "Visiteur",
  OWNER: "Copro",
  MANAGER: "Manager",
  SUPER_ADMIN: "Super Admin",
};

const sectionLabels: Record<string, string> = {
  dashboard: "Tableau de bord",
  suivi: "Suivi",
  operations: "Operations",
  gestion: "Gestion",
  organisation: "Organisation",
  administration: "Administration",
};

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition",
        checked ? "bg-cyan-500" : "bg-slate-300",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-4 w-4 rounded-full bg-white transition",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}

export default function PageVisibilityPage() {
  const { data: session } = useSession();
  const role = normalizeRole(session?.user?.role);
  const [items, setItems] = useState<PageVisibilityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (role !== "SUPER_ADMIN") {
      setLoading(false);
      return;
    }

    fetch("/api/page-visibility", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .finally(() => setLoading(false));
  }, [role]);

  const rows = useMemo(() => {
    const map = new Map<string, PageVisibilityItem[]>();
    for (const item of items) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }

    return Array.from(map.entries()).flatMap(([section, sectionItems]) => [
      { type: "section" as const, section },
      ...sectionItems.map((item) => ({ type: "item" as const, item })),
    ]);
  }, [items]);

  function updateItem(href: string, updater: (item: PageVisibilityItem) => PageVisibilityItem) {
    setItems((current) => current.map((item) => (item.href === href ? updater(item) : item)));
  }

  async function saveAll() {
    setSaving(true);
    try {
      const response = await fetch("/api/page-visibility", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setToast(data?.error ?? "Enregistrement impossible");
        return;
      }
      setItems(Array.isArray(data?.items) ? data.items : items);
      setToast("Visibilites enregistrees");
    } finally {
      setSaving(false);
    }
  }

  if (role !== "SUPER_ADMIN") {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Shield size={20} />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Acces reserve</h1>
          <p className="mt-2 text-sm text-slate-500">Cette page est reservee au super admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="fixed right-6 top-20 z-[100] rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Visibilite des pages</h1>
            <p className="mt-1 text-sm text-slate-500">
              Active ou desactive les pages par profil. Pratique pour les pages en construction.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={saving || loading}
            className="btn-brand rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Chargement...
        </div>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-6 py-3 font-semibold">Page</th>
                  <th className="px-4 py-3 text-center font-semibold">Active</th>
                  {roleColumns.map((roleColumn) => (
                    <th key={roleColumn} className="px-4 py-3 text-center font-semibold">
                      {roleLabels[roleColumn]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) =>
                  row.type === "section" ? (
                    <tr key={`section-${row.section}`} className="border-b border-slate-100 bg-slate-100/70">
                      <td
                        colSpan={2 + roleColumns.length}
                        className="px-6 py-3 text-sm font-semibold uppercase tracking-[0.08em] text-slate-600"
                      >
                        {sectionLabels[row.section] ?? row.section}
                      </td>
                    </tr>
                  ) : (
                    <tr key={row.item.href} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900">{row.item.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.item.href}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center">
                          <Toggle
                            checked={row.item.isEnabled}
                            onChange={() =>
                              updateItem(row.item.href, (current) => ({
                                ...current,
                                isEnabled: !current.isEnabled,
                              }))
                            }
                          />
                        </div>
                      </td>
                      {roleColumns.map((roleColumn) => (
                        <td key={roleColumn} className="px-4 py-4 text-center">
                          <div className="flex justify-center">
                            <Toggle
                              checked={row.item.roles[roleColumn]}
                              onChange={() =>
                                updateItem(row.item.href, (current) => ({
                                  ...current,
                                  roles: {
                                    ...current.roles,
                                    [roleColumn]: !current.roles[roleColumn],
                                  },
                                }))
                              }
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
