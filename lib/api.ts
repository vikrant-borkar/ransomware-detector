export async function api<T>(
  path: string,
  init?: RequestInit,
  retries = 2,
  delayMs = 2000
): Promise<T> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if ((response.status === 502 || response.status === 503 || response.status === 504) && retries > 0) {
        await new Promise((res) => setTimeout(res, delayMs));
        return api<T>(path, init, retries - 1, delayMs * 1.5);
      }

      let detail = `Request failed (${response.status})`;
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        detail = "Backend is waking up from free-tier sleep (takes ~30s). Please wait a moment and try again.";
      }
      try {
        const body = (await response.json()) as { detail?: string };
        if (typeof body.detail === "string") detail = body.detail;
      } catch {
        /* keep detail */
      }
      throw new Error(detail);
    }
    return response.json() as Promise<T>;
  } catch (err: unknown) {
    if (retries > 0 && err instanceof Error && !err.message.includes("is waking up")) {
      await new Promise((res) => setTimeout(res, delayMs));
      return api<T>(path, init, retries - 1, delayMs * 1.5);
    }
    throw err;
  }
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
