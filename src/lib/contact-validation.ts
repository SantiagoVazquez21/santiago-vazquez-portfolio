// Shared by the client and the server, so both report the same errors (spec 005, RF-5).
export const CONTACT_FIELDS = ["name", "email", "message"] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];
export type ContactValues = Record<ContactField, string>;

export const MAX_LENGTH = { name: 100, email: 254, message: 2000 } as const;

export type FieldError = "required" | "tooLong" | "invalid";
export type FieldErrors = Partial<Record<ContactField, FieldError>>;

export const HONEYPOT_FIELD = "website";

// One address only: commas and semicolons would let a visitor smuggle extra recipients.
const EMAIL_PATTERN = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
const NAME_WHITESPACE = /\s+/g;

export function normalizeValues(values: ContactValues): ContactValues {
  return {
    name: values.name.trim().replace(NAME_WHITESPACE, " "),
    email: values.email.trim(),
    message: values.message.trim(),
  };
}

// Code points, not UTF-16 units: an emoji counts as one character (RF-2).
function codePointLength(text: string): number {
  return Array.from(text).length;
}

export function validateField(
  field: ContactField,
  value: string,
): FieldError | null {
  const text = value.trim();
  if (text === "") {
    return "required";
  }
  if (codePointLength(text) > MAX_LENGTH[field]) {
    // The email has no "too long" text in annex A: an over-long address is just invalid.
    return field === "email" ? "invalid" : "tooLong";
  }
  if (field === "email" && !EMAIL_PATTERN.test(text)) {
    return "invalid";
  }
  return null;
}

export function validateContact(values: ContactValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of CONTACT_FIELDS) {
    const error = validateField(field, values[field]);
    if (error !== null) {
      errors[field] = error;
    }
  }
  return errors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseContactBody(
  body: unknown,
): { values: ContactValues; honeypot: string } | null {
  if (!isRecord(body)) {
    return null;
  }
  const { name, email, message } = body;
  const rawHoneypot = body[HONEYPOT_FIELD];
  const honeypot = rawHoneypot === undefined ? "" : rawHoneypot;
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string" ||
    typeof honeypot !== "string"
  ) {
    return null;
  }
  return { values: { name, email, message }, honeypot };
}
