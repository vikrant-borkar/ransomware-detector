export function getApiUrl(path: string): string {
  // In production browser environments, connect directly to Render to bypass Vercel serverless 10s gateway timeout
  let publicBase = (process.env.NEXT_PUBLIC_DETECTOR_URL || "").trim().replace(/\/api\/?$/i, "").replace(/\/+$/, "");
  if (!publicBase && typeof window !== "undefined") {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.") ||
      window.location.hostname.endsWith(".local");
    if (!isLocal) {
      publicBase = "https://ransomware-detector-rl65.onrender.com";
    }
  }

  if (publicBase && typeof window !== "undefined") {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${publicBase}${cleanPath}`;
  }
  return path;
}

function getOfflineErrorMessage(status?: number): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.endsWith(".local");

    if (isLocal) {
      return "Local backend is offline. Please start the backend by running 'start_backend.bat' or 'run.bat' and keep its window open.";
    }
  }

  if (status === 502 || status === 503 || status === 504) {
    return "Render backend is waking up from free-tier sleep (takes ~35–45s). Please wait a moment and try again.";
  }
  return "Cannot reach the backend server. Please verify your Render service is active and DETECTOR_URL is configured in Vercel.";
}

export async function api<T>(
  path: string,
  init?: RequestInit,
  retries = 3,
  delayMs = 2500
): Promise<T> {
  const targetUrl = getApiUrl(path);

  try {
    const response = await fetch(targetUrl, {
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

      let detail = getOfflineErrorMessage(response.status);
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
    if (retries > 0 && err instanceof Error && !err.message.includes("is not running locally")) {
      await new Promise((res) => setTimeout(res, delayMs));
      return api<T>(path, init, retries - 1, delayMs * 1.5);
    }
    if (err instanceof TypeError && err.message.includes("fetch")) {
      throw new Error(getOfflineErrorMessage());
    }
    throw err;
  }
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
