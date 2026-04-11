"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Terminal, X, ChevronDown, ChevronUp } from "lucide-react";
import { useSession } from "next-auth/react";

export type LogMessage = {
  id: string;
  timestamp: Date;
  message: string;
  type?: "info" | "success" | "error" | "warning";
};

export function usePageLogger() {
  const [isLogActive, setIsLogActive] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);

  const addLog = useCallback(
    (message: string, type: LogMessage["type"] = "info") => {
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          timestamp: new Date(),
          message,
          type,
        },
      ]);
    },
    [],
  );

  const addLogs = useCallback(
    (messages: string[], type: LogMessage["type"] = "info") => {
      const newLogs = messages.map((message) => ({
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        message,
        type,
      }));
      setLogs((prev) => [...prev, ...newLogs]);
    },
    [],
  );

  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    isLogActive,
    setIsLogActive,
    logs,
    addLog,
    addLogs,
    clearLogs,
  };
}

export function PageLoggerToggle({
  isLogActive,
  setIsLogActive,
}: {
  isLogActive: boolean;
  setIsLogActive: (v: boolean) => void;
}) {
  const { data: session } = useSession();
  if (session?.user?.role !== "SUPER_ADMIN") return null;

  return (
    <div className="flex items-center gap-2" title="Mode Débogage">
      <button
        onClick={() => setIsLogActive(!isLogActive)}
        role="switch"
        aria-checked={isLogActive}
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
          isLogActive ? "bg-red-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            isLogActive ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export function PageLoggerPanel({
  logs,
  isLogActive,
  clearLogs,
}: {
  logs: LogMessage[];
  isLogActive: boolean;
  clearLogs: () => void;
}) {
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, expanded]);

  if (!isLogActive) return null;
  if (session?.user?.role !== "SUPER_ADMIN") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none">
      <div className="w-full max-w-5xl pointer-events-auto bg-slate-900 border-t border-x border-slate-700 rounded-t-xl shadow-2xl overflow-hidden transition-all duration-300 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
          <div className="flex items-center gap-2 text-slate-300">
            <Terminal className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Console de Débogage
            </span>
            <span className="ml-2 bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px]">
              {logs.length} logs
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={clearLogs}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 transition"
            >
              Effacer
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="p-4 overflow-y-auto font-mono text-[11px] leading-relaxed max-h-64 min-h-32 text-slate-300 space-y-1">
            {logs.length === 0 ? (
              <p className="text-slate-600 italic">
                En attente d'événements...
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-3 py-0.5 ${
                    log.type === "error"
                      ? "text-red-400"
                      : log.type === "success"
                        ? "text-emerald-400"
                        : ""
                  }`}
                >
                  <span className="text-slate-600 shrink-0 select-none">
                    [
                    {log.timestamp.toLocaleTimeString("fr-FR", {
                      hour12: false,
                    })}
                    ]
                  </span>
                  <span className="break-words break-all">{log.message}</span>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  );
}
