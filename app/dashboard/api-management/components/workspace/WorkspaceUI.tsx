"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal, X, type LucideIcon } from "lucide-react";

/* ============================================================
   Modal shell
============================================================ */

export function Modal({
  title,
  description,
  onClose,
  size = "md",
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  size?: "md" | "lg";
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full rounded-2xl border border-slate-100 bg-white shadow-xl ${
          size === "lg" ? "max-w-4xl" : "max-w-md"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ============================================================
   Kebab (⋯) menu
============================================================ */

export type MenuItem = {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  danger?: boolean;
};

export function KebabMenu({
  items,
  label,
}: {
  items: MenuItem[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onMouseDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-lg border border-transparent p-2 text-slate-500 transition hover:border-slate-200 hover:bg-white hover:text-slate-700"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg"
        >
          {items.map(({ label: itemLabel, icon: Icon, onClick, danger }) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm transition ${
                danger
                  ? "text-red-600 hover:bg-red-50"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {Icon && <Icon className="h-4 w-4" aria-hidden />}
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Name (+ optional select) dialog, used for add / rename
============================================================ */

export function ResourceDialog({
  title,
  description,
  label,
  placeholder,
  initialValue = "",
  submitLabel,
  select,
  onSubmit,
  onClose,
}: {
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel: string;
  select?: {
    label: string;
    initial: string;
    options: { value: string; label: string }[];
  };
  onSubmit: (name: string, selected: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialValue);
  const [selected, setSelected] = useState(select?.initial ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError(`${label} is required.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(trimmed, selected);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <Modal title={title} description={description} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {select && (
          <div>
            <label
              htmlFor="dialog-select"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              {select.label}
            </label>
            <select
              id="dialog-select"
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            >
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor="dialog-name"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            {label}
          </label>
          <input
            id="dialog-name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(null);
            }}
            placeholder={placeholder}
            maxLength={100}
            autoFocus
            disabled={loading}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 disabled:bg-slate-50"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
