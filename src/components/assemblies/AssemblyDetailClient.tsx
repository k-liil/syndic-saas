"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, FileText, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { MeetingResolutionStatus, MeetingVoteRule } from "@prisma/client";
import { useApiUrl } from "@/lib/org-context";
import { canManage } from "@/lib/roles";
import {
  getMeetingStatusTone,
  getResolutionStatusTone,
  meetingResolutionStatusLabels,
  meetingStatusLabels,
  meetingVoteRuleLabels,
  standardMeetingDocumentLabels,
} from "@/lib/meetings";

type Resolution = {
  id: string;
  title: string;
  description: string | null;
  voteRule: MeetingVoteRule;
  status: MeetingResolutionStatus;
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  orderIndex: number;
};

type MeetingDocument = {
  id: string;
  title: string;
  type: "ATTENDANCE_SHEET" | "MINUTES" | "OTHER";
  fileName: string | null;
  fileUrl: string | null;
};

type MeetingDetail = {
  id: string;
  title: string;
  location: string | null;
  type: "ORDINARY" | "EXTRAORDINARY";
  status: keyof typeof meetingStatusLabels;
  date: string;
  resolutions: Resolution[];
  documents: MeetingDocument[];
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("fr-FR").format(date);
}

function readFileAsDataUrl(file: File) {
  return new Promise<{ fileName: string; fileUrl: string; mimeType: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("FILE_READ_FAILED"));
        return;
      }
      resolve({ fileName: file.name, fileUrl: reader.result, mimeType: file.type || "application/octet-stream" });
    };
    reader.onerror = () => reject(new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

export default function AssemblyDetailClient({ meetingId }: { meetingId: string }) {
  const apiUrl = useApiUrl();
  const { data: session } = useSession();
  const canEdit = canManage(session?.user?.role);

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [openResolution, setOpenResolution] = useState(false);
  const [resolutionTitle, setResolutionTitle] = useState("");
  const [resolutionDescription, setResolutionDescription] = useState("");
  const [resolutionVoteRule, setResolutionVoteRule] = useState<MeetingVoteRule>(MeetingVoteRule.SIMPLE);
  const [voteTarget, setVoteTarget] = useState<Resolution | null>(null);
  const [voteStatus, setVoteStatus] = useState<MeetingResolutionStatus>(MeetingResolutionStatus.PENDING);
  const [votesFor, setVotesFor] = useState("0");
  const [votesAgainst, setVotesAgainst] = useState("0");
  const [abstentions, setAbstentions] = useState("0");
  const [openDocuments, setOpenDocuments] = useState(false);
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
  const [minutesFile, setMinutesFile] = useState<File | null>(null);
  const [otherFiles, setOtherFiles] = useState<File[]>([]);

  const loadMeeting = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/meetings/${meetingId}`), { cache: "no-store" });
      const data = await response.json().catch(() => null);
      setMeeting(response.ok ? data : null);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, meetingId]);

  useEffect(() => {
    void loadMeeting();
  }, [loadMeeting]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timeout);
  }, [toast]);

  const standardDocs = useMemo(() => ({
    attendance: meeting?.documents.find((item) => item.type === "ATTENDANCE_SHEET") ?? null,
    minutes: meeting?.documents.find((item) => item.type === "MINUTES") ?? null,
    others: meeting?.documents.filter((item) => item.type === "OTHER") ?? [],
  }), [meeting?.documents]);

  async function handleSendConvocations() {
    const response = await fetch(apiUrl(`/api/meetings/${meetingId}/send-convocations`), { method: "POST" });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setToast(data?.error ?? "Envoi impossible");
      return;
    }
    setToast("Convocations preparees");
    await loadMeeting();
  }

  async function handleGenerateMinutes() {
    const response = await fetch(apiUrl(`/api/meetings/${meetingId}/generate-minutes`), { method: "POST" });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setToast(data?.error ?? "Generation impossible");
      return;
    }
    setToast("Proces-verbal genere");
    await loadMeeting();
  }

  async function handleAddResolution() {
    if (!resolutionTitle.trim()) {
      setToast("Titre obligatoire");
      return;
    }
    const response = await fetch(apiUrl(`/api/meetings/${meetingId}/resolutions`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: resolutionTitle.trim(),
        description: resolutionDescription.trim(),
        voteRule: resolutionVoteRule,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setToast(data?.error ?? "Ajout impossible");
      return;
    }
    setOpenResolution(false);
    setResolutionTitle("");
    setResolutionDescription("");
    setResolutionVoteRule(MeetingVoteRule.SIMPLE);
    setToast("Resolution ajoutee");
    await loadMeeting();
  }

  function openVoteModal(resolution: Resolution) {
    setVoteTarget(resolution);
    setVoteStatus(resolution.status);
    setVotesFor(String(resolution.votesFor));
    setVotesAgainst(String(resolution.votesAgainst));
    setAbstentions(String(resolution.abstentions));
  }

  async function handleSaveVote() {
    if (!voteTarget) return;
    const response = await fetch(apiUrl(`/api/meetings/${meetingId}/resolutions/${voteTarget.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: voteStatus,
        votesFor: Number(votesFor) || 0,
        votesAgainst: Number(votesAgainst) || 0,
        abstentions: Number(abstentions) || 0,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setToast(data?.error ?? "Vote impossible");
      return;
    }
    setVoteTarget(null);
    setToast("Vote enregistre");
    await loadMeeting();
  }

  async function uploadDocument(type: "ATTENDANCE_SHEET" | "MINUTES" | "OTHER", file: File) {
    const payload = await readFileAsDataUrl(file);
    await fetch(apiUrl(`/api/meetings/${meetingId}/documents`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title: type === "ATTENDANCE_SHEET" ? "Feuille de presence" : type === "MINUTES" ? "Proces-verbal" : file.name.replace(/\.[^.]+$/, ""),
        fileName: payload.fileName,
        fileUrl: payload.fileUrl,
        mimeType: payload.mimeType,
      }),
    });
  }

  async function handleSaveDocuments() {
    if (minutesFile) await uploadDocument("MINUTES", minutesFile);
    if (attendanceFile) await uploadDocument("ATTENDANCE_SHEET", attendanceFile);
    for (const file of otherFiles) {
      await uploadDocument("OTHER", file);
    }
    setOpenDocuments(false);
    setAttendanceFile(null);
    setMinutesFile(null);
    setOtherFiles([]);
    setToast("Documents mis a jour");
    await loadMeeting();
  }

  async function handleDeleteDocument(id: string) {
    const response = await fetch(apiUrl(`/api/meetings/${meetingId}/documents`), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      setToast("Suppression impossible");
      return;
    }
    setToast("Document supprime");
    await loadMeeting();
  }

  if (loading) return <div className="px-6 py-16 text-center text-sm text-slate-400">Chargement...</div>;
  if (!meeting) return <div className="px-6 py-16 text-center text-sm text-slate-400">Assemblee introuvable.</div>;

  return (
    <div className="flex flex-col gap-5">
      {toast ? <div className="fixed right-6 top-6 z-[100] rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">{toast}</div> : null}

      <Link href="/organisation/assemblies" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" />
        Retour a la liste des assemblees
      </Link>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{meeting.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {meeting.type === "EXTRAORDINARY" ? "Extraordinaire" : "Ordinaire"} — Tenue le {formatDate(meeting.date)}
              {meeting.location ? ` a ${meeting.location}` : ""}
            </p>
          </div>
          <span className={`inline-flex rounded-full border px-4 py-1.5 text-sm font-semibold ${getMeetingStatusTone(meeting.status)}`}>
            {meetingStatusLabels[meeting.status]}
          </span>
        </div>

        {canEdit ? (
          <>
            <div className="mt-5 border-t border-slate-200" />
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={() => void handleSendConvocations()} className="btn-brand inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold">
                <Send className="h-4 w-4" />
                Envoyer les convocations
              </button>
              <button type="button" onClick={() => void handleGenerateMinutes()} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
                <FileText className="h-4 w-4" />
                Generer le Proces-Verbal
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-900">Ordre du Jour &amp; Resolutions</h2>
            {canEdit ? (
              <button type="button" onClick={() => setOpenResolution(true)} className="btn-brand inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold">
                <Plus className="h-4 w-4" />
                Ajouter
              </button>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {meeting.resolutions.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-400">Aucune resolution pour le moment.</div>
            ) : (
              meeting.resolutions.map((resolution) => (
                <div key={resolution.id} className="rounded-[24px] border border-slate-200 bg-slate-50/50 px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{resolution.orderIndex}. {resolution.title}</div>
                      <div className="mt-1 text-sm text-slate-500">{meetingVoteRuleLabels[resolution.voteRule]}</div>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getResolutionStatusTone(resolution.status)}`}>
                      {meetingResolutionStatusLabels[resolution.status]}
                    </span>
                  </div>
                  {resolution.description ? <div className="mt-3 text-sm text-slate-700">{resolution.description}</div> : null}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-sm text-slate-600">
                      <span className="font-medium text-emerald-600">Pour: {resolution.votesFor}</span>
                      <span className="ml-4 font-medium text-rose-600">Contre: {resolution.votesAgainst}</span>
                      <span className="ml-4 font-medium text-slate-500">Abstention: {resolution.abstentions}</span>
                    </div>
                    {canEdit ? <button type="button" onClick={() => openVoteModal(resolution)} className="text-sm font-semibold text-sky-600 hover:text-sky-800">Enregistrer le vote</button> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-900">Documents</h2>
            {canEdit ? <button type="button" onClick={() => setOpenDocuments(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"><Pencil className="h-4 w-4" /></button> : null}
          </div>

          <div className="mt-5 space-y-4">
            {(["ATTENDANCE_SHEET", "MINUTES"] as const).map((type) => {
              const document = meeting.documents.find((item) => item.type === type);
              return (
                <div key={type} className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-3 text-sm text-slate-700">
                    <FileText className="h-4 w-4 text-slate-400" />
                    {standardMeetingDocumentLabels[type]}
                  </div>
                  {document?.fileUrl ? <button type="button" onClick={() => void openDocumentInNewTab(document.fileUrl)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"><Eye className="h-3.5 w-3.5" /></button> : null}
                </div>
              );
            })}

            <div className="border-t border-slate-200 pt-4">
              <h3 className="mb-3 text-base font-semibold text-slate-900">Documents associes ({standardDocs.others.length})</h3>
              {standardDocs.others.length === 0 ? (
                <div className="text-sm italic text-slate-400">Aucun document associe</div>
              ) : (
                <div className="space-y-3">
                  {standardDocs.others.map((document) => (
                    <div key={document.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-800">{document.title}</div>
                        <div className="mt-1 text-xs text-slate-500">{document.fileName ?? "Document associe"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {document.fileUrl ? <button type="button" onClick={() => void openDocumentInNewTab(document.fileUrl)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"><Eye className="h-3.5 w-3.5" /></button> : null}
                        {canEdit ? <button type="button" onClick={() => void handleDeleteDocument(document.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"><Trash2 className="h-3.5 w-3.5" /></button> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {openResolution ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={() => setOpenResolution(false)}>
          <div className="w-full max-w-xl rounded-[28px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-semibold text-slate-900">Ajouter une Resolution</h2>
              <button type="button" onClick={() => setOpenResolution(false)} className="text-2xl leading-none text-slate-400 transition hover:text-slate-700">×</button>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Titre de la resolution</label>
                <input type="text" value={resolutionTitle} onChange={(event) => setResolutionTitle(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-900" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description (optionnel)</label>
                <textarea rows={4} value={resolutionDescription} onChange={(event) => setResolutionDescription(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-900" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Type de vote requis</label>
                <select value={resolutionVoteRule} onChange={(event) => setResolutionVoteRule(event.target.value as MeetingVoteRule)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-900">
                  {Object.entries(meetingVoteRuleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => void handleAddResolution()} className="btn-brand h-11 w-full rounded-2xl text-sm font-semibold">Ajouter a l&apos;ordre du jour</button>
            </div>
          </div>
        </div>
      ) : null}

      {voteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={() => setVoteTarget(null)}>
          <div className="w-full max-w-xl rounded-[28px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-semibold text-slate-900">Vote: {voteTarget.title}</h2>
              <button type="button" onClick={() => setVoteTarget(null)} className="text-2xl leading-none text-slate-400 transition hover:text-slate-700">×</button>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Resultat du vote</label>
                <select value={voteStatus} onChange={(event) => setVoteStatus(event.target.value as MeetingResolutionStatus)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-900">
                  {Object.entries(meetingResolutionStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-4 text-sm font-semibold text-slate-700">Details du vote (tantemes)</div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Pour</label><input type="number" min="0" value={votesFor} onChange={(event) => setVotesFor(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-900" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Contre</label><input type="number" min="0" value={votesAgainst} onChange={(event) => setVotesAgainst(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-900" /></div>
                  <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Abstention</label><input type="number" min="0" value={abstentions} onChange={(event) => setAbstentions(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-900" /></div>
                </div>
              </div>
              <button type="button" onClick={() => void handleSaveVote()} className="btn-brand h-11 w-full rounded-2xl text-sm font-semibold">Enregistrer le resultat</button>
            </div>
          </div>
        </div>
      ) : null}

      {openDocuments ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" onClick={() => setOpenDocuments(false)}>
          <div className="w-full max-w-2xl rounded-[28px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-semibold text-slate-900">Gerer les Documents de l&apos;AG</h2>
              <button type="button" onClick={() => setOpenDocuments(false)} className="text-2xl leading-none text-slate-400 transition hover:text-slate-700">×</button>
            </div>
            <div className="space-y-6 px-6 py-5">
              <div><label className="mb-2 block text-sm font-semibold text-slate-800">Proces-verbal (PV)</label><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx" onChange={(event) => setMinutesFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200" /></div>
              <div><label className="mb-2 block text-sm font-semibold text-slate-800">Feuille de presence</label><input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx" onChange={(event) => setAttendanceFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200" /></div>
              <div><label className="mb-2 block text-sm font-semibold text-slate-800">Ajouter d&apos;autres documents</label><input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx" onChange={(event) => setOtherFiles(Array.from(event.target.files ?? []))} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200" /></div>
              <button type="button" onClick={() => void handleSaveDocuments()} className="btn-brand h-11 w-full rounded-2xl text-sm font-semibold">Enregistrer les modifications</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

async function openDocumentInNewTab(fileUrl: string | null) {
  if (!fileUrl) return;
  const anchor = document.createElement("a");
  anchor.href = fileUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}
