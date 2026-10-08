import { validateField, type ContactValues } from "@/lib/contact-validation";

export type ContactConfig = { apiKey: string; to: string };

const RESEND_URL = "https://api.resend.com/emails";
// Resend's test sender only delivers to the account owner's address (plan, section 8).
const SENDER = "Portafolio <onboarding@resend.dev>";
const API_KEY_VAR = "RESEND_API_KEY";
const TO_VAR = "CONTACT_TO_EMAIL";

export const RESEND_TIMEOUT_MS = 10_000;

export function readContactConfig(
  env: Readonly<Record<string, string | undefined>>,
): ContactConfig | null {
  const apiKey = (env[API_KEY_VAR] ?? "").trim();
  const to = (env[TO_VAR] ?? "").trim();
  if (apiKey === "" || validateField("email", to) !== null) {
    return null;
  }
  return { apiKey, to };
}

// Only the owner reads these, so they are not interface text (plan, section 8).
function buildSubject(values: ContactValues): string {
  return `Portafolio: mensaje de ${values.name}`;
}

function buildText(values: ContactValues): string {
  return `Nombre: ${values.name}\nEmail: ${values.email}\n\n${values.message}`;
}

export function buildResendRequest(
  config: ContactConfig,
  values: ContactValues,
): { url: string; init: RequestInit } {
  return {
    url: RESEND_URL,
    init: {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      // Plain text only: an html field would render whatever markup the visitor typed.
      body: JSON.stringify({
        from: SENDER,
        to: [config.to],
        reply_to: values.email,
        subject: buildSubject(values),
        text: buildText(values),
      }),
    },
  };
}

// Never logs: the error could carry the visitor's message (RF-12).
export async function sendContactEmail(
  fetchFn: typeof fetch,
  config: ContactConfig,
  values: ContactValues,
): Promise<boolean> {
  const { url, init } = buildResendRequest(config, values);
  try {
    const response = await fetchFn(url, {
      ...init,
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}
