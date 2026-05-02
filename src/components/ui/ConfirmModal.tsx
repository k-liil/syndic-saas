import { Modal } from "./Modal";
import React from "react";

export function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  confirmColor = "bg-red-600 hover:bg-red-700",
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} containerClassName="max-w-md" zIndex={100}>
      <div className="space-y-4">
        <div className="text-sm text-slate-600">{message}</div>
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onCancel}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${confirmColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
