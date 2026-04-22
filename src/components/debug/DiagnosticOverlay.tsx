"use client";

import { useState, useEffect, useCallback } from "react";

export type LogEntry = {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
};

// Global singleton to capture logs even before hydration completes
const globalLogs: LogEntry[] = [];
let logListeners: ((entry: LogEntry) => void)[] = [];

export const addDiagnosticLog = (message: string, level: LogEntry["level"] = "info") => {
  const entry: LogEntry = {
    id: Math.random().toString(36).substring(7),
    timestamp: new Date().toLocaleTimeString(),
    level,
    message,
  };
  globalLogs.push(entry);
  logListeners.forEach(l => l(entry));
  console[level](`[DIAGNOSTIC] ${message}`);
};

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    addDiagnosticLog(`Uncaught Error: ${event.message} at ${event.filename}:${event.lineno}`, "error");
  });
  window.addEventListener("unhandledrejection", (event) => {
    addDiagnosticLog(`Unhandled Promise Rejection: ${event.reason}`, "error");
  });
  addDiagnosticLog("Client window listeners attached.");
}

export default function DiagnosticOverlay() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setLogs([...globalLogs]);
    const listener = (entry: LogEntry) => setLogs(prev => [...prev, entry]);
    logListeners.push(listener);

    // Auto-show if an error occurs or after a timeout
    const timeout = setTimeout(() => setVisible(true), 5000);

    return () => {
      logListeners = logListeners.filter(l => l !== listener);
      clearTimeout(timeout);
    };
  }, []);

  if (!visible) {
    return (
      <div 
        onClick={() => setVisible(true)}
        className="fixed bottom-4 right-4 z-[9999] cursor-pointer rounded-full bg-slate-900 px-3 py-1 text-[10px] text-white opacity-50 hover:opacity-100"
      >
        Debug Logs ({logs.length})
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] flex h-48 flex-col border-t border-slate-200 bg-white/95 text-[11px] shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
        <div className="font-bold uppercase tracking-wider text-slate-500">Diagnostic Console</div>
        <div className="flex gap-2">
          <button onClick={() => setLogs([])} className="text-slate-400 hover:text-slate-600">Clear</button>
          <button onClick={() => setVisible(false)} className="font-bold text-slate-800">Close</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 font-mono">
        {logs.length === 0 ? (
          <div className="text-slate-400 italic">No logs captured...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`mb-1 ${log.level === 'error' ? 'text-red-600 font-bold' : log.level === 'warn' ? 'text-amber-600' : 'text-slate-700'}`}>
              <span className="opacity-50">[{log.id}] {log.timestamp}</span> {log.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
