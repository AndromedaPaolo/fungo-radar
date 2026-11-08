import { Agent, fetch as undiciFetch } from "undici";

const CONNECT_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_ATTEMPTS = 5;
const BACKOFF_BASE_MS = 1_000;

const dispatcher = new Agent({
  connectTimeout: CONNECT_TIMEOUT_MS,
  headersTimeout: REQUEST_TIMEOUT_MS,
  bodyTimeout: REQUEST_TIMEOUT_MS,
  connect: { timeout: CONNECT_TIMEOUT_MS },
});

export async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function causeCode(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const withCause = error as { code?: string; cause?: { code?: string } };
  return withCause.code ?? withCause.cause?.code ?? "";
}

export function openMeteoBackoffMs(attempt: number, retryAfter?: string | null): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 30_000);
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.min(Math.max(date - Date.now(), 0), 30_000);
  }
  return BACKOFF_BASE_MS * 2 ** attempt;
}

export function isRetryableOpenMeteoFailure(error: unknown, status?: number): boolean {
  if (status === 429 || (status !== undefined && status >= 500)) return true;
  const code = causeCode(error);
  if (
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "UND_ERR_HEADERS_TIMEOUT" ||
    code === "UND_ERR_BODY_TIMEOUT" ||
    code === "UND_ERR_SOCKET" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN"
  ) {
    return true;
  }
  const name = error instanceof Error ? error.name : "";
  if (name === "AbortError" || name === "TimeoutError" || name === "ConnectTimeoutError") {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|Connect Timeout|other side closed|network|socket/i.test(message);
}

function describeError(error: unknown): string {
  const code = causeCode(error);
  const message = error instanceof Error ? error.message : String(error);
  return code ? `${message} [${code}]` : message;
}

export async function fetchOpenMeteoJson(url: string): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await undiciFetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        dispatcher,
      });
      if (!response.ok) {
        if (isRetryableOpenMeteoFailure(undefined, response.status) && attempt < MAX_ATTEMPTS - 1) {
          const delay = openMeteoBackoffMs(attempt, response.headers.get("retry-after"));
          console.warn(
            `Open-Meteo ${response.status}, tentativo ${attempt + 1}/${MAX_ATTEMPTS} — nuovo tentativo tra ${delay}ms`,
          );
          await sleep(delay);
          continue;
        }
        throw new Error(`Open-Meteo ${response.status}`);
      }
      return response.json();
    } catch (error) {
      lastError = error;
      if (error instanceof Error && error.message.startsWith("Open-Meteo ")) throw error;
      if (!isRetryableOpenMeteoFailure(error) || attempt >= MAX_ATTEMPTS - 1) throw error;
      const delay = openMeteoBackoffMs(attempt);
      console.warn(
        `Open-Meteo fetch fallita (${describeError(error)}), tentativo ${attempt + 1}/${MAX_ATTEMPTS} — nuovo tentativo tra ${delay}ms`,
      );
      await sleep(delay);
    }
  }
  throw lastError;
}
