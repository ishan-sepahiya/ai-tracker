/**
 * Small fetch helper for the /api/team/* endpoints.
 * Throws an Error whose message is the API's `error` field when the
 * request fails, so callers can show it directly in the UI.
 */
export async function teamRequest<T = Record<string, unknown>>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>,
  fallbackMessage: string,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let result: unknown = null;
  try {
    result = await response.json();
  } catch {
    // Non-JSON response; fall through to the generic message below.
  }

  if (!response.ok) {
    const apiError =
      result &&
      typeof result === "object" &&
      "error" in result &&
      typeof (result as { error: unknown }).error === "string"
        ? (result as { error: string }).error
        : null;

    throw new Error(apiError ?? fallbackMessage);
  }

  return (result ?? {}) as T;
}
