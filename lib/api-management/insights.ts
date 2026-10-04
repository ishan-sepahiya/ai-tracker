import type {
  EnvironmentWithResources,
  ProjectWithResources,
} from "@/lib/api-management/service";
import type { ApiKey } from "@/lib/api-management/types";

/** An API key counts as active if it is not revoked and not expired. */
export function isKeyActive(key: ApiKey, now: number): boolean {
  if (key.revoked) return false;
  if (key.expires_at && new Date(key.expires_at).getTime() <= now) {
    return false;
  }
  return true;
}

export type EnvironmentInsights = {
  activeKeys: number;
  totalKeys: number;
  providers: string[];
  lastUsed: string | null;
  dailyBudget: number | null;
  status: "active" | "no-keys";
};

export function getEnvironmentInsights(
  environment: EnvironmentWithResources,
  project: ProjectWithResources,
  now: number,
): EnvironmentInsights {
  const activeKeyList = environment.apiKeys.filter((k) =>
    isKeyActive(k, now),
  );

  // Providers connected to this environment, plus project-wide ones.
  const providers = new Set<string>();
  for (const credential of [
    ...environment.providerCredentials,
    ...project.providerCredentials,
  ]) {
    if (credential.status.toUpperCase() === "ACTIVE") {
      providers.add(credential.display_name || credential.provider_name);
    }
  }

  let lastUsed: string | null = null;
  for (const key of environment.apiKeys) {
    if (
      key.last_used &&
      (!lastUsed ||
        new Date(key.last_used).getTime() > new Date(lastUsed).getTime())
    ) {
      lastUsed = key.last_used;
    }
  }

  const budgets = activeKeyList
    .map((k) => k.daily_budget)
    .filter((b): b is number => typeof b === "number");

  return {
    activeKeys: activeKeyList.length,
    totalKeys: environment.apiKeys.length,
    providers: [...providers],
    lastUsed,
    dailyBudget:
      budgets.length > 0 ? budgets.reduce((sum, b) => sum + b, 0) : null,
    status: activeKeyList.length > 0 ? "active" : "no-keys",
  };
}

export type ProjectInsights = {
  environments: number;
  activeKeys: number;
  providers: string[];
};

export function getProjectInsights(
  project: ProjectWithResources,
  now: number,
): ProjectInsights {
  const providers = new Set<string>();
  let activeKeys = 0;

  for (const credential of project.providerCredentials) {
    if (credential.status.toUpperCase() === "ACTIVE") {
      providers.add(credential.display_name || credential.provider_name);
    }
  }

  for (const environment of project.environments) {
    const insights = getEnvironmentInsights(environment, project, now);
    activeKeys += insights.activeKeys;
    insights.providers.forEach((p) => providers.add(p));
  }

  return {
    environments: project.environments.length,
    activeKeys,
    providers: [...providers],
  };
}

export function formatRelativeTime(
  value: string | null,
  now: number,
): string {
  if (!value) return "Never";

  const diff = now - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatShortDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
