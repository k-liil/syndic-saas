"use client";

import type { DragEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  FileSpreadsheet,
  FileText,
  Folder,
  Grid2X2,
  ImageIcon,
  List,
  Paperclip,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  Vault,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useApiUrl, useOrganization } from "@/lib/org-context";
import { canManage } from "@/lib/roles";
import {
  DIGITAL_VAULT_CATEGORIES,
  formatBytes,
  formatDigitalVaultDate,
} from "@/lib/digital-vault";

type DigitalVaultDocument = {
  id: string;
  name: string;
  category: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  tags: string[];
  isVisibleToOwners: boolean;
  documentDate: string | null;
  createdAt: string;
};

type ViewMode = "grid" | "list";

function documentIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv")) {
    return FileSpreadsheet;
  }
  return FileText;
}

function getDocumentTypeLabel(fileName: string, mimeType: string) {
  const extension = fileName.split(".").pop()?.trim().toUpperCase();
  if (extension) {
    return extension;
  }

  if (mimeType.startsWith("image/")) {
    return mimeType.replace("image/", "").toUpperCase();
  }

  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("word")) return "DOC";
  if (mimeType.includes("excel") || mimeType.includes("sheet")) return "XLS";
  return "DOC";
}

function readFileAsDataUrl(file: File) {
  return new Promise<{
    fileUrl: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("FILE_READ_FAILED"));
        return;
      }

      resolve({
        fileUrl: reader.result,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });
    };

    reader.onerror = () => reject(new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

async function openDocumentInNewTab(fileUrl: string) {
  try {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch {
    const anchor = document.createElement("a");
    anchor.href = fileUrl;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }
}

export default function DigitalVaultPage() {
  const apiUrl = useApiUrl();
  const { org } = useOrganization();
  const { data: session } = useSession();
  const canEdit = canManage(session?.user?.role);

  const [documents, setDocuments] = useState<DigitalVaultDocument[]>([]);
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [storageLimitBytes, setStorageLimitBytes] = useState(100 * 1024 * 1024);
  const [maxFileBytes, setMaxFileBytes] = useState(25 * 1024 * 1024);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Tous les documents");
  const [visibleOnly, setVisibleOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const [openCreate, setOpenCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const [selectedFile, setSelectedFile] = useState<null | {
    fileUrl: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }>(null);
  const [documentName, setDocumentName] = useState("");
  const [documentCategory, setDocumentCategory] = useState("Divers");
  const [documentDate, setDocumentDate] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [visibleToOwners, setVisibleToOwners] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl("/api/digital-vault"));
      const data = await response.json();
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      setStorageUsedBytes(Number(data.storageUsedBytes ?? 0));
      setStorageLimitBytes(Number(data.storageLimitBytes ?? 100 * 1024 * 1024));
      setMaxFileBytes(Number(data.maxFileBytes ?? 25 * 1024 * 1024));
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timeout);
  }, [toast]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      if (category !== "Tous les documents" && document.category !== category) {
        return false;
      }

      if (visibleOnly && !document.isVisibleToOwners) {
        return false;
      }

      const haystack = [
        document.name,
        document.fileName,
        document.category,
        ...(document.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search.trim().toLowerCase());
    });
  }, [category, documents, search, visibleOnly]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set("Tous les documents", documents.length);
    for (const item of DIGITAL_VAULT_CATEGORIES) {
      counts.set(item, documents.filter((document) => document.category === item).length);
    }
    return counts;
  }, [documents]);

  const progress = storageLimitBytes > 0
    ? Math.min((storageUsedBytes / storageLimitBytes) * 100, 100)
    : 0;

  function resetCreateModal() {
    setSelectedFile(null);
    setDocumentName("");
    setDocumentCategory("Divers");
    setDocumentDate("");
    setTagInput("");
    setVisibleToOwners(false);
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;

    if (file.size > maxFileBytes) {
      setToast("Fichier trop volumineux");
      return;
    }

    const payload = await readFileAsDataUrl(file);
    setSelectedFile(payload);

    if (!documentName.trim()) {
      setDocumentName(file.name.replace(/\.[^.]+$/, ""));
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) {
      void handleFileChange(file);
    }
  }

  async function handleCreateDocument() {
    if (!selectedFile || !documentName.trim()) {
      setToast("Nom et fichier obligatoires");
      return;
    }

    setSubmitting(true);

    const response = await fetch(apiUrl("/api/digital-vault"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: documentName.trim(),
        category: documentCategory,
        fileName: selectedFile.fileName,
        fileUrl: selectedFile.fileUrl,
        mimeType: selectedFile.mimeType,
        documentDate: documentDate.trim() || null,
        tags: tagInput
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        isVisibleToOwners: visibleToOwners,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setToast(data?.error ?? "Impossible de televerser");
      setSubmitting(false);
      return;
    }

    setOpenCreate(false);
    resetCreateModal();
    setSubmitting(false);
    setToast("Document ajoute");
    await loadDocuments();
  }

  async function handleDeleteDocument(id: string) {
    const response = await fetch(apiUrl("/api/digital-vault"), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!response.ok) {
      setToast("Suppression impossible");
      return;
    }

    setToast("Document supprime");
    await loadDocuments();
  }

  async function handleToggleVisibility(id: string, nextValue: boolean) {
    setDocuments((current) =>
      current.map((document) =>
        document.id === id ? { ...document, isVisibleToOwners: nextValue } : document,
      ),
    );

    const response = await fetch(apiUrl("/api/digital-vault"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isVisibleToOwners: nextValue }),
    });

    if (!response.ok) {
      setDocuments((current) =>
        current.map((document) =>
          document.id === id ? { ...document, isVisibleToOwners: !nextValue } : document,
        ),
      );
      setToast("Mise a jour impossible");
      return;
    }

    setToast(nextValue ? "Visible pour les coproprietaires" : "Masque pour les coproprietaires");
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-9.5rem)] min-h-0 w-full min-w-0 flex-col gap-4 max-lg:max-w-[90%] xl:max-w-[80%] 2xl:max-w-[65%]">
      {toast ? (
        <div className="fixed right-6 top-6 z-[100] rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}

      <div className="shrink-0 rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
              <Vault className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Coffre-Fort Numerique
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Gestion electronique de vos documents
              </p>
            </div>
          </div>

          {canEdit ? (
            <button
              type="button"
              onClick={() => {
                resetCreateModal();
                setOpenCreate(true);
              }}
              className="btn-brand inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-4 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </button>
          ) : null}
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Stockage utilise</span>
            <span className="font-semibold text-emerald-600">
              {formatBytes(storageUsedBytes)} / {formatBytes(storageLimitBytes)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="rounded-[24px] border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              Categories
            </div>

            <div className="space-y-1">
              {["Tous les documents", ...DIGITAL_VAULT_CATEGORIES].map((item) => {
                const active = category === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={[
                      "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-xs transition",
                      active
                        ? "bg-sky-50 text-sky-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      {item}
                    </span>
                    <span className="text-[11px] font-semibold">
                      {categoryCounts.get(item) ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="flex min-h-0 flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher un document..."
                  className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-xs outline-none transition focus:border-slate-900"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <label className="inline-flex h-10 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={visibleOnly}
                  onChange={(e) => setVisibleOnly(e.target.checked)}
                />
                Visibles copro.
              </label>

              <div className="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={[
                    "inline-flex h-8 w-8 items-center justify-center rounded-xl transition",
                    viewMode === "grid" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <Grid2X2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={[
                    "inline-flex h-8 w-8 items-center justify-center rounded-xl transition",
                    viewMode === "list" ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto pr-1">
              {loading ? (
                <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                  Chargement des documents...
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="flex h-56 flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-white p-8 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                    <Paperclip className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">Aucun document</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Ajoute tes premiers documents pour remplir le coffre-fort.
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredDocuments.map((document) => {
                    const Icon = documentIcon(document.mimeType);
                    const typeLabel = getDocumentTypeLabel(document.fileName, document.mimeType);

                    return (
                      <div
                        key={document.id}
                        className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-rose-500">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold text-slate-900">
                                {document.name}
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-400">
                                {formatBytes(document.sizeBytes)} •{" "}
                                {formatDigitalVaultDate(document.documentDate || document.createdAt)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void openDocumentInNewTab(document.fileUrl)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                              title="Visualiser"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => void handleDeleteDocument(document.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                            {typeLabel}
                          </span>
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                            {document.category}
                          </span>
                          {org ? (
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                              {org.name}
                            </span>
                          ) : null}
                          {document.isVisibleToOwners ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                              Visible par les coproprietaires
                            </span>
                          ) : null}
                        </div>

                        {canEdit ? (
                          <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                            <span className="text-[11px] font-medium text-slate-600">
                              Visible copro.
                            </span>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={document.isVisibleToOwners}
                              onClick={() => void handleToggleVisibility(document.id, !document.isVisibleToOwners)}
                              className={[
                                "relative inline-flex h-6 w-11 items-center rounded-full transition",
                                document.isVisibleToOwners ? "bg-emerald-500" : "bg-slate-300",
                              ].join(" ")}
                              title={document.isVisibleToOwners ? "Rendre non visible" : "Rendre visible"}
                            >
                              <span
                                className={[
                                  "inline-block h-4 w-4 rounded-full bg-white transition",
                                  document.isVisibleToOwners ? "translate-x-6" : "translate-x-1",
                                ].join(" ")}
                              />
                            </button>
                          </div>
                        ) : null}

                        {document.tags.length > 0 ? (
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {document.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex rounded-full bg-sky-50 px-2 py-1 text-[10px] font-medium text-sky-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
                  <div className="grid grid-cols-[minmax(0,1.7fr)_72px_82px_130px_84px_110px_96px] gap-3 border-b border-slate-200 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <div>Document</div>
                    <div>Type</div>
                    <div>Taille</div>
                    <div>Categorie</div>
                    <div>Date</div>
                    <div>Visible</div>
                    <div>Action</div>
                  </div>

                  {filteredDocuments.map((document) => (
                    <div
                      key={document.id}
                      className="grid grid-cols-[minmax(0,1.7fr)_72px_82px_130px_84px_110px_96px] gap-3 border-b border-slate-100 px-4 py-3 text-xs last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{document.name}</div>
                        <div className="mt-0.5 truncate text-[11px] text-slate-400">{document.fileName}</div>
                      </div>
                      <div className="text-slate-600">
                        <span className="inline-flex rounded-full bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700">
                          {getDocumentTypeLabel(document.fileName, document.mimeType)}
                        </span>
                      </div>
                      <div className="text-slate-600">{formatBytes(document.sizeBytes)}</div>
                      <div className="text-slate-600">{document.category}</div>
                      <div className="text-slate-600">
                        {formatDigitalVaultDate(document.documentDate || document.createdAt)}
                      </div>
                      <div className="flex items-center">
                        {canEdit ? (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={document.isVisibleToOwners}
                            onClick={() => void handleToggleVisibility(document.id, !document.isVisibleToOwners)}
                            className={[
                              "relative inline-flex h-6 w-11 items-center rounded-full transition",
                              document.isVisibleToOwners ? "bg-emerald-500" : "bg-slate-300",
                            ].join(" ")}
                            title={document.isVisibleToOwners ? "Rendre non visible" : "Rendre visible"}
                          >
                            <span
                              className={[
                                "inline-block h-4 w-4 rounded-full bg-white transition",
                                document.isVisibleToOwners ? "translate-x-6" : "translate-x-1",
                              ].join(" ")}
                            />
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            {document.isVisibleToOwners ? "Oui" : "Non"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void openDocumentInNewTab(document.fileUrl)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => void handleDeleteDocument(document.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 text-center text-xs text-slate-500">
              {filteredDocuments.length} document(s) affiche(s)
            </div>
          </section>
        </div>
      </div>

      {canEdit && openCreate ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onClick={() => setOpenCreate(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[28px] bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h2 className="text-2xl font-semibold text-slate-900">Ajouter un document</h2>
              <button
                type="button"
                onClick={() => setOpenCreate(false)}
                className="text-2xl leading-none text-slate-400"
              >
                ×
              </button>
            </div>

            <div className="max-h-[80vh] space-y-4 overflow-auto px-6 py-5">
              <div>
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <span>Stockage utilise</span>
                  <span className="font-semibold text-emerald-600">
                    {formatBytes(storageUsedBytes)} / {formatBytes(storageLimitBytes)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div
                className={[
                  "rounded-[24px] border-2 border-dashed p-5 text-center transition",
                  isDragActive ? "border-cyan-400 bg-cyan-50/60" : "border-slate-200",
                ].join(" ")}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div className="mt-3 text-lg font-medium text-slate-700">
                  Glissez-deposez un fichier ici
                </div>
                <div className="mt-1.5 text-sm text-slate-400">ou</div>
                <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                  Parcourir
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                    className="hidden"
                    onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
                  />
                </label>
                <div className="mt-3 text-xs text-slate-400">
                  PDF, Images, Word, Excel • Max {formatBytes(maxFileBytes)}
                </div>
                {selectedFile ? (
                  <div className="mt-3 text-xs font-medium text-slate-700">
                    {selectedFile.fileName} • {formatBytes(selectedFile.sizeBytes)}
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Nom du document</label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Ex: Reglement de copropriete 2024"
                  className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-xs outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Categorie</label>
                <select
                  value={documentCategory}
                  onChange={(e) => setDocumentCategory(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-xs outline-none focus:border-slate-900"
                >
                  {DIGITAL_VAULT_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Copropriete (optionnel)
                </label>
                <div className="flex h-11 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-600">
                  {org?.name ?? "Organisation actuelle"}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Date du document (optionnel)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/yyyy"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-xs outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">Tags (optionnel)</label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Ex: urgent, 2024, residence A"
                  className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-xs outline-none focus:border-slate-900"
                />
                <div className="mt-1.5 text-[11px] text-slate-400">Separez les tags par des virgules</div>
              </div>

              <label className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={visibleToOwners}
                  onChange={(e) => setVisibleToOwners(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-xs font-semibold text-slate-800">
                    Visible par les coproprietaires
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-500">
                    Cochez pour permettre aux coproprietaires de voir ce document
                  </span>
                </span>
              </label>

              <div className="border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => void handleCreateDocument()}
                  disabled={submitting}
                  className="btn-brand h-11 w-full rounded-2xl text-xs font-semibold disabled:opacity-50"
                >
                  {submitting ? "Televersement..." : "Televerser"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
