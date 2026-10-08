import type { Dictionary } from "@/i18n/types";
import {
  CONTACT_FIELDS,
  HONEYPOT_FIELD,
  normalizeValues,
  validateContact,
  validateField,
  type ContactField,
  type ContactValues,
  type FieldError,
  type FieldErrors,
} from "@/lib/contact-validation";

export const CONTACT_ENDPOINT = "/api/contact";
// Longer than the server's 10 s wait on Resend, so the server's answer wins (plan 005, section 8).
export const CLIENT_TIMEOUT_MS = 15_000;
// The marker in failedAlternative where the component places the LinkedIn link (plan, D12).
export const LINKEDIN_LINK_KEY = "link";

// The message and the honeypot stay "off": a password manager must never fill the trap (RF-10).
export const AUTOCOMPLETE: Readonly<Record<ContactField | "off", string>> =
  Object.freeze({ name: "name", email: "email", message: "off", off: "off" });

export type FormStatus = "idle" | "sending" | "sent" | "failed" | "rateLimited";
export type FormState = {
  values: ContactValues;
  errors: FieldErrors;
  status: FormStatus;
};

export const EMPTY_FORM: FormState = Object.freeze({
  values: Object.freeze({ name: "", email: "", message: "" }),
  errors: Object.freeze({}),
  status: "idle",
});

export type ContactOutcome =
  | { kind: "sent" }
  | { kind: "invalid"; errors: FieldErrors }
  | { kind: "rateLimited" }
  | { kind: "failed" };

// What the client uses when there is no readable answer: network error or timeout (RF-8).
export const FAILED_OUTCOME: ContactOutcome = Object.freeze({ kind: "failed" });

type ContactTextKey = keyof Dictionary["contact"];

// Only the pairs validateField can produce; anything else from the server is not trusted.
const ERROR_TEXT_KEYS: Readonly<
  Record<ContactField, Partial<Record<FieldError, ContactTextKey>>>
> = {
  name: { required: "nameRequired", tooLong: "nameTooLong" },
  email: { required: "emailRequired", invalid: "emailInvalid" },
  message: { required: "messageRequired", tooLong: "messageTooLong" },
};

// A message from the last send must not survive a new edit or submit (RF-7, RF-8).
function clearedStatus(status: FormStatus): FormStatus {
  return status === "sending" ? status : "idle";
}

export function firstInvalidField(errors: FieldErrors): ContactField | null {
  return CONTACT_FIELDS.find((field) => errors[field] !== undefined) ?? null;
}

export function editField(
  state: FormState,
  field: ContactField,
  value: string,
): FormState {
  const values = { ...state.values, [field]: value };
  const errors = { ...state.errors };
  if (errors[field] !== undefined) {
    // Same normalization as the server, so the client never disagrees with it (RF-5).
    const error = validateField(field, normalizeValues(values)[field]);
    if (error === null) {
      delete errors[field];
    } else {
      errors[field] = error;
    }
  }
  return { values, errors, status: clearedStatus(state.status) };
}

export function submitForm(state: FormState): {
  state: FormState;
  send: boolean;
  focus: ContactField | null;
} {
  if (state.status === "sending") {
    return { state, send: false, focus: null };
  }
  const errors = validateContact(normalizeValues(state.values));
  const focus = firstInvalidField(errors);
  if (focus !== null) {
    return {
      state: { values: state.values, errors, status: "idle" },
      send: false,
      focus,
    };
  }
  return {
    state: { values: state.values, errors: {}, status: "sending" },
    send: true,
    focus: null,
  };
}

export function readHoneypot(data: FormData): string {
  const value = data.get(HONEYPOT_FIELD);
  return typeof value === "string" ? value : "";
}

export function buildContactRequest(
  values: ContactValues,
  honeypot: string,
): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...values, [HONEYPOT_FIELD]: honeypot }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isContactField(key: string): key is ContactField {
  return (CONTACT_FIELDS as readonly string[]).includes(key);
}

const FIELD_ERRORS: readonly string[] = [
  "required",
  "tooLong",
  "invalid",
] satisfies FieldError[];

function isFieldError(code: unknown): code is FieldError {
  return typeof code === "string" && FIELD_ERRORS.includes(code);
}

function parseFieldErrors(raw: unknown): FieldErrors | null {
  if (!isRecord(raw)) {
    return null;
  }
  const errors: FieldErrors = {};
  for (const [key, code] of Object.entries(raw)) {
    if (
      !isContactField(key) ||
      !isFieldError(code) ||
      ERROR_TEXT_KEYS[key][code] === undefined
    ) {
      return null;
    }
    errors[key] = code;
  }
  return firstInvalidField(errors) === null ? null : errors;
}

// The response is external input: anything unexpected counts as a failed send (RF-8).
export function parseContactResponse(
  status: number,
  body: unknown,
): ContactOutcome {
  if (!isRecord(body)) {
    return { kind: "failed" };
  }
  if (status === 200 && body.result === "sent") {
    return { kind: "sent" };
  }
  if (status === 429 && body.result === "rateLimited") {
    return { kind: "rateLimited" };
  }
  if (status === 400 && body.result === "invalid") {
    const errors = parseFieldErrors(body.errors);
    if (errors !== null) {
      return { kind: "invalid", errors };
    }
  }
  return { kind: "failed" };
}

// After a server rejection the focus goes to the first invalid field; otherwise it stays (RF-5, RF-6).
export function focusAfterOutcome(
  outcome: ContactOutcome,
): ContactField | null {
  return outcome.kind === "invalid" ? firstInvalidField(outcome.errors) : null;
}

export function isSending(state: FormState): boolean {
  return state.status === "sending";
}

export type StatusMessages = {
  status: ContactTextKey | null;
  alert: ContactTextKey | null;
  offerLinkedin: boolean;
};

// Which text goes in each live region; only a failed send offers LinkedIn (RF-7, RF-8, RF-11).
export function statusMessages(status: FormStatus): StatusMessages {
  switch (status) {
    case "sent":
      return { status: "sent", alert: null, offerLinkedin: false };
    case "failed":
      return { status: null, alert: "failed", offerLinkedin: true };
    case "rateLimited":
      return { status: null, alert: "rateLimited", offerLinkedin: false };
    default:
      return { status: null, alert: null, offerLinkedin: false };
  }
}

export function applyOutcome(
  state: FormState,
  outcome: ContactOutcome,
): FormState {
  switch (outcome.kind) {
    case "sent":
      return { ...EMPTY_FORM, status: "sent" };
    case "invalid":
      return { values: state.values, errors: outcome.errors, status: "idle" };
    default:
      return { ...state, status: outcome.kind };
  }
}

// Throws like fillTemplate: reading a missing text aloud is worse than a failing test.
export function errorTextKey(
  field: ContactField,
  error: FieldError,
): ContactTextKey {
  const key = ERROR_TEXT_KEYS[field][error];
  if (key === undefined) {
    throw new Error(`No text for "${field}" with "${error}"`);
  }
  return key;
}
