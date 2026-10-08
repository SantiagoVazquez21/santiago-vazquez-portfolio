import { readContactConfig, sendContactEmail } from "@/lib/contact-email";
import {
  normalizeValues,
  parseContactBody,
  validateContact,
  type FieldErrors,
} from "@/lib/contact-validation";
import { clientKey, tryConsume, type RateLimiter } from "@/lib/rate-limit";

export type ContactResult = "sent" | "invalid" | "rateLimited" | "failed";

export type ContactDeps = {
  fetchFn: typeof fetch;
  env: Readonly<Record<string, string | undefined>>;
  now: number;
  limiter: RateLimiter;
};

// Far above the largest valid body: rejects junk before parsing it.
export const MAX_BODY_CHARS = 16_000;

type ContactPayload =
  | { result: Exclude<ContactResult, "invalid"> }
  | { result: "invalid"; errors: FieldErrors };

// Codes only, never text: the client picks the words from its dictionary.
function reply(status: number, payload: ContactPayload): Response {
  return Response.json(payload, { status });
}

async function readJson(request: Request): Promise<{ json: unknown } | null> {
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) {
      return null;
    }
    const json: unknown = JSON.parse(text);
    return { json };
  } catch {
    return null;
  }
}

// Order matters (plan 005, section 5): the honeypot and invalid bodies never
// count toward the limit, and the limit comes before the configuration so an
// attempt without a key still counts. Nothing is logged at any step (RF-12).
export async function handleContactRequest(
  request: Request,
  deps: ContactDeps,
): Promise<Response> {
  const body = await readJson(request);
  const parsed = body === null ? null : parseContactBody(body.json);
  if (parsed === null) {
    return reply(400, { result: "failed" });
  }

  // A bot that sees an error retries; one that sees success moves on (D5).
  if (parsed.honeypot.trim() !== "") {
    return reply(200, { result: "sent" });
  }

  const values = normalizeValues(parsed.values);
  const errors = validateContact(values);
  if (Object.keys(errors).length > 0) {
    return reply(400, { result: "invalid", errors });
  }

  if (!tryConsume(deps.limiter, clientKey(request.headers), deps.now)) {
    return reply(429, { result: "rateLimited" });
  }

  const config = readContactConfig(deps.env);
  if (config === null) {
    return reply(503, { result: "failed" });
  }

  const sent = await sendContactEmail(deps.fetchFn, config, values);
  return sent
    ? reply(200, { result: "sent" })
    : reply(502, { result: "failed" });
}
