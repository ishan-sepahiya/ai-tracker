"use client";

import {
  ArrowRight,
  Clock,
  KeyRound,
  Pencil,
  Server,
  Trash2,
  Wallet,
  Zap,
} from "lucide-react";

import type {
  EnvironmentWithResources,
  ProjectWithResources,
} from "@/lib/api-management/service";
import {
  formatRelativeTime,
  formatShortDate,
  formatUsd,
  getEnvironmentInsights,
} from "@/lib/api-management/insights";

import { KebabMenu } from "./WorkspaceUI";

// Purely cosmetic: each card gets an accent color by position.
const ACCENTS = [
  {
    tile: "bg-emerald-50 text-emerald-600",
    button:
      "border-emerald-200 bg-emerald-50/40 text-emerald-700 hover:bg-emerald-50",
  },
  {
    tile: "bg-violet-50 text-violet-600",
    button:
      "border-violet-200 bg-violet-50/40 text-violet-700 hover:bg-violet-50",
  },
  {
    tile: "bg-sky-50 text-sky-600",
    button: "border-sky-200 bg-sky-50/40 text-sky-700 hover:bg-sky-50",
  },
  {
    tile: "bg-amber-50 text-amber-600",
    button:
      "border-amber-200 bg-amber-50/40 text-amber-700 hover:bg-amber-50",
  },
];

export default function EnvironmentSummaryCard({
  environment,
  project,
  index,
  now,
  highlighted,
  onViewDetails,
  onRename,
  onDelete,
}: {
  environment: EnvironmentWithResources;
  project: ProjectWithResources;
  index: number;
  now: number;
  highlighted: boolean;
  onViewDetails: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const accent = ACCENTS[index % ACCENTS.length];
  const insights = getEnvironmentInsights(environment, project, now);
  const isActive = insights.status === "active";

  const providerLabel =
    insights.providers.length === 0
      ? "None"
      : insights.providers.length === 1
        ? insights.providers[0]
        : `${insights.providers[0]} +${insights.providers.length - 1}`;

  return (
    <article
      id={`env-${environment.id}`}
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        highlighted
          ? "border-blue-300 ring-4 ring-blue-50"
          : "border-slate-100"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent.tile}`}
        >
          <Zap className="h-5 w-5" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-900">
            {environment.name}
          </h3>
          <p className="truncate text-sm text-slate-500">
            Environment in {project.name}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            isActive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          <span className="relative flex h-2 w-2">
            {isActive && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isActive ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
          {isActive ? "Active" : "No active keys"}
        </span>

        <KebabMenu
          label={`Actions for ${environment.name}`}
          items={[
            { label: "View details", icon: ArrowRight, onClick: onViewDetails },
            { label: "Rename", icon: Pencil, onClick: onRename },
            {
              label: "Delete environment",
              icon: Trash2,
              onClick: onDelete,
              danger: true,
            },
          ]}
        />
      </div>

      {/* Facts */}
      <dl className="mx-4 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 py-3 text-sm">
        <div className="pr-3">
          <dt className="flex items-center gap-1.5 text-xs text-slate-500">
            <Server className="h-3.5 w-3.5" aria-hidden />
            Provider
          </dt>
          <dd
            className="mt-1 truncate font-medium text-slate-900"
            title={insights.providers.join(", ") || undefined}
          >
            {providerLabel}
          </dd>
        </div>

        <div className="px-3">
          <dt className="flex items-center gap-1.5 text-xs text-slate-500">
            <KeyRound className="h-3.5 w-3.5" aria-hidden />
            Keys
          </dt>
          <dd className="mt-1 font-medium text-slate-900">
            {insights.activeKeys} Active
            {insights.totalKeys > insights.activeKeys && (
              <span className="font-normal text-slate-400">
                {" "}
                / {insights.totalKeys}
              </span>
            )}
          </dd>
        </div>

        <div className="pl-3">
          <dt className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Last used
          </dt>
          <dd className="mt-1 truncate font-medium text-slate-900">
            {formatRelativeTime(insights.lastUsed, now)}
          </dd>
        </div>
      </dl>

      {/* Budget band */}
      <div className="grid grid-cols-2 gap-4 bg-slate-50/70 px-4 py-3.5">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Wallet className="h-3.5 w-3.5" aria-hidden />
            Daily budget
          </p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {insights.dailyBudget === null
              ? "—"
              : formatUsd(insights.dailyBudget)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Created</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatShortDate(environment.created_at)}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="p-4">
        <button
          type="button"
          onClick={onViewDetails}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${accent.button}`}
        >
          View Details
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </article>
  );
}
