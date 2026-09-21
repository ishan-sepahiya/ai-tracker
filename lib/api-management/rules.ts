/**
 * Business rules for API Management.
 *
 * Shared by the frontend (to decide which buttons to show) and the
 * backend (to reject requests that break the rule).
 */

/** Each user may own exactly one organization. */
export const MAX_ORGANIZATIONS_PER_USER = 1;

export const ORGANIZATION_LIMIT_MESSAGE =
  "You can only have one organization. Edit or delete your existing organization instead.";

export function canCreateOrganization(currentCount: number): boolean {
  return currentCount < MAX_ORGANIZATIONS_PER_USER;
}