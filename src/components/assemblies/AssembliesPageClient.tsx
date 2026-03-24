"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useApiUrl, useOrganization } from "@/lib/org-context";
import { canManage } from "@/lib/roles";
import { getMeetingStatusTone, meetingStatusLabels, meetingTypeOptions } from "@/lib/meetings";

type MeetingItem = {
  id: string;
  title: string;
  date: string;
  type: "ORDINARY" | "EXTRAORDINARY";
  status: keyof typeof meetingStatusLabels;
  organization: { id: string; name: string };
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("fr-FR").format(date);
}

function parseDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export default function AssembliesPageClient() {
  const api = useApiUrl();
  const { org, orgs, switchOrg } = useOrganization();
  const { data: session } = useSession();
  const canEdit = canManage(session?.user?.role);

  const [items, setItems] = useState<MeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [toast, setToast] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState<"ORDINARY" | "EXTRAORDINARY">("ORDINARY");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (status !== "ALL") params.set("status", status);
      const response = await fetch(api(`/api/meetings${params.size ? `?${params.toString()}` : ""}`), { cache: "no-store" });
      const data = await response.json().catch(() => []);
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [api, query, status]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    setSelectedOrgId(org?.id ?? "");
  }, [org?.id]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timeout);
  }, [toast]);

  async function handleCreate() {
    if (!selectedOrgId || !title.trim() || !date.trim()) {
      setToast("Copropriete, titre et date obligatoires");
      return;
    }

    const apiDate = parseDate(date);
    if (!apiDate) {
      setToast("Date invalide (dd/mm/yyyy)");
      return;
    }

    const response = await fetch(`/api/meetings?orgId=${selectedOrgId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        type: meetingType,
        date: apiDate,
        location: location.trim(),
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setToast(data?.error ?? "Creation impossible");
      return;
    }

    const nextOrg = orgs.find((item) => item.id === selectedOrgId);
    if (nextOrg && nextOrg.id !== org?.id) switchOrg(nextOrg);

    setOpenCreate(false);
    setTitle("");
    setMeetingType("ORDINARY");
    setDate("");
    setLocation("");
    setToast("Assemblee planifiee");
    await loadItems();
  }

  return (
    <div className="flex flex-col gap-6">
      {toast ? <div className="fixed right-6 top-6 z-[100] rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">{toast}</div> : null}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Assemblees Generales</h1>
          <p className="mt-1 text-sm text-slate-500">{org?.name ?? "Organisation actuelle"}</p>
        </div>
        {canEdit ? (
          <button type="button" onClick={() => setOpenCreate(true)} className="btn-brand inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold">
            <Plus className="h-4 w-4" />
            Planifier une AG
          </button>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher par titre..." className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-slate-900" />
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-900">
            <option value="ALL">Tous les statuts</option>
            {Object.entries(meetingStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_180px_160px_180px_100px] gap-4 border-b border-slate-200 px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          <div>Titre de l&apos;assemblee</div>
          <div>Copropriete</div>
          <div>Date de tenue</div>
          <div>Type</div>
          <div>Statut</div>
          <div>Action</div>
        </div>
        {loading ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-slate-400">Aucune assemblee trouvee.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_180px_160px_180px_100px] gap-4 border-b border-slate-100 px-6 py-5 text-sm last:border-b-0">
              <div className="font-semibold text-slate-900">{item.title}</div>
              <div className="text-slate-600">{item.organization.name}</div>
              <div className="text-slate-600">{formatDate(item.date)}</div>
              <div><span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{item.type === "EXTRAORDINARY" ? "Extraordinaire" : "Ordinaire"}</span></div>
              <div><span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getMeetingStatusTone(item.status)}`}>{meetingStatusLabels[item.status]}</span></div>
              <div><Link href={`/organisation/assemblies/${item.id}`} className="font-semibold text-slate-700 hover:text-slate-900">Gerer</Link></div>
            </div>
          ))
        )}
      </div>

      {openCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={() => setOpenCreate(false)}>
          <div className="w-full max-w-xl rounded-[28px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-semibold text-slate-900">Planifier une Assemblee Generale</h2>
              <button type="button" onClick={() => setOpenCreate(false)} className="text-2xl leading-none text-slate-400 transition hover:text-slate-700">×</button>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Copropriete</label>
                <select value={selectedOrgId} onChange={(event) => setSelectedOrgId(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-900">
                  <option value="">Selectionner une copropriete</option>
                  {orgs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Titre / Ordre du jour principal</label>
                <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-900" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Type d&apos;assemblee</label>
                  <select value={meetingType} onChange={(event) => setMeetingType(event.target.value as "ORDINARY" | "EXTRAORDINARY")} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-900">
                    {meetingTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Date de tenue</label>
                  <input type="text" value={date} onChange={(event) => setDate(event.target.value)} placeholder="dd/mm/yyyy" className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-900" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Lieu (optionnel)</label>
                <input type="text" value={location} onChange={(event) => setLocation(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-900" />
              </div>
              <button type="button" onClick={() => void handleCreate()} className="btn-brand h-11 w-full rounded-2xl text-sm font-semibold">Planifier l&apos;AG</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
