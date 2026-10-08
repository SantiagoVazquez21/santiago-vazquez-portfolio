import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { es } from "@/i18n/es";
import {
  applyOutcome,
  AUTOCOMPLETE,
  buildContactRequest,
  CLIENT_TIMEOUT_MS,
  CONTACT_ENDPOINT,
  editField,
  EMPTY_FORM,
  errorTextKey,
  FAILED_OUTCOME,
  firstInvalidField,
  focusAfterOutcome,
  isSending,
  LINKEDIN_LINK_KEY,
  parseContactResponse,
  readHoneypot,
  statusMessages,
  submitForm,
  type FormState,
  type FormStatus,
} from "@/lib/contact-form";
import {
  CONTACT_FIELDS,
  HONEYPOT_FIELD,
  type ContactValues,
} from "@/lib/contact-validation";
import { splitTemplate } from "@/lib/text-template";

const VALID: ContactValues = {
  name: "Ana Pérez",
  email: "ana@mail.com",
  message: "Hola,\nquiero proponerte una entrevista.",
};

function formWith(
  values: Partial<ContactValues>,
  status: FormStatus = "idle",
  errors: FormState["errors"] = {},
): FormState {
  return Object.freeze({
    values: Object.freeze({ ...EMPTY_FORM.values, ...values }),
    errors: Object.freeze(errors),
    status,
  });
}

describe("constants", () => {
  it("posts to the contact endpoint and waits 15 s (RF-8)", () => {
    expect(CONTACT_ENDPOINT).toBe("/api/contact");
    expect(CLIENT_TIMEOUT_MS).toBe(15_000);
  });

  it("autocompletes name and email, never the message or the honeypot (RF-10)", () => {
    expect(AUTOCOMPLETE).toEqual({
      name: "name",
      email: "email",
      message: "off",
      off: "off",
    });
  });
});

describe("EMPTY_FORM", () => {
  it("starts empty, without errors and idle (RF-1)", () => {
    expect(EMPTY_FORM).toEqual({
      values: { name: "", email: "", message: "" },
      errors: {},
      status: "idle",
    });
  });
});

describe("submitForm", () => {
  it("with everything empty shows three errors and focuses Name without sending (RF-3)", () => {
    const result = submitForm(EMPTY_FORM);
    expect(result.send).toBe(false);
    expect(result.focus).toBe("name");
    expect(result.state.errors).toEqual({
      name: "required",
      email: "required",
      message: "required",
    });
    expect(result.state.status).toBe("idle");
  });

  it("focuses the first invalid field in the form order (RF-3)", () => {
    const result = submitForm(formWith({ ...VALID, email: "ana@" }));
    expect(result.send).toBe(false);
    expect(result.focus).toBe("email");
    expect(result.state.errors).toEqual({ email: "invalid" });
    expect(result.state.values).toEqual({ ...VALID, email: "ana@" });
  });

  it("treats a message of only spaces as empty (RF-2)", () => {
    const result = submitForm(formWith({ ...VALID, message: "  \n  " }));
    expect(result.focus).toBe("message");
    expect(result.state.errors).toEqual({ message: "required" });
  });

  it("validates like the server, after collapsing the spaces of the name (RF-5)", () => {
    const name = `${"a".repeat(50)}${" ".repeat(60)}${"b".repeat(49)}`;
    const result = submitForm(formWith({ ...VALID, name }));
    expect(result.send).toBe(true);
  });

  it("with valid values starts sending without focus changes (RF-5, RF-6)", () => {
    const result = submitForm(formWith(VALID));
    expect(result).toEqual({
      state: { values: VALID, errors: {}, status: "sending" },
      send: true,
      focus: null,
    });
  });

  it("ignores a second submit while sending (RF-6)", () => {
    const sending = formWith(VALID, "sending");
    const result = submitForm(sending);
    expect(result.send).toBe(false);
    expect(result.focus).toBeNull();
    expect(result.state).toBe(sending);
  });

  it.each(["sent", "failed", "rateLimited"] as const)(
    "with errors after %s goes back to idle, never a message and errors at once (RF-7)",
    (status) => {
      const result = submitForm(formWith({}, status));
      expect(result.send).toBe(false);
      expect(result.state.status).toBe("idle");
      expect(Object.keys(result.state.errors)).toHaveLength(3);
    },
  );

  it("with valid values after a failure sends again (RF-8)", () => {
    const result = submitForm(formWith(VALID, "failed"));
    expect(result.send).toBe(true);
    expect(result.state.status).toBe("sending");
  });

  it("does not mutate the previous state", () => {
    const state = formWith({});
    submitForm(state);
    expect(state.errors).toEqual({});
  });
});

describe("editField", () => {
  it("updates the value without validating a field that had no error (RF-3)", () => {
    const next = editField(EMPTY_FORM, "email", "ana@");
    expect(next.values.email).toBe("ana@");
    expect(next.errors).toEqual({});
  });

  it("removes the error as soon as the field is valid (RF-4)", () => {
    const state = formWith({ email: "ana@" }, "idle", { email: "invalid" });
    const next = editField(state, "email", "ana@mail.com");
    expect(next.errors).toEqual({});
  });

  it("changes the error when the problem is another one (RF-4)", () => {
    const state = formWith({ name: "" }, "idle", { name: "required" });
    const next = editField(state, "name", "a".repeat(101));
    expect(next.errors).toEqual({ name: "tooLong" });
  });

  it("keeps the errors of the other fields (RF-4)", () => {
    const state = formWith({}, "idle", {
      name: "required",
      email: "required",
    });
    const next = editField(state, "name", "Ana");
    expect(next.errors).toEqual({ email: "required" });
  });

  it.each(["sent", "failed", "rateLimited"] as const)(
    "removes the %s message when the visitor types (RF-7, RF-8)",
    (status) => {
      expect(editField(formWith(VALID, status), "name", "Ana").status).toBe(
        "idle",
      );
    },
  );

  it("does not mutate the previous state", () => {
    const state = formWith({ email: "ana@" }, "idle", { email: "invalid" });
    editField(state, "email", "ana@mail.com");
    expect(state.values.email).toBe("ana@");
    expect(state.errors).toEqual({ email: "invalid" });
  });
});

describe("readHoneypot", () => {
  it("reads the trap value from the form data (RF-10)", () => {
    const data = new FormData();
    data.set(HONEYPOT_FIELD, "bot");
    expect(readHoneypot(data)).toBe("bot");
  });

  it("gives an empty string without the field", () => {
    expect(readHoneypot(new FormData())).toBe("");
  });

  it("gives an empty string for a file instead of text", () => {
    const data = new FormData();
    data.set(HONEYPOT_FIELD, new File(["x"], "x.txt"));
    expect(readHoneypot(data)).toBe("");
  });
});

describe("buildContactRequest", () => {
  it("posts the three values and the trap as JSON (RF-5, RF-10)", () => {
    const init = buildContactRequest(VALID, "bot");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Content-Type")).toBe(
      "application/json",
    );
    expect(typeof init.body).toBe("string");
    expect(JSON.parse(String(init.body))).toEqual({
      ...VALID,
      website: "bot",
    });
  });
});

describe("parseContactResponse", () => {
  it("reads a confirmed send (RF-7)", () => {
    expect(parseContactResponse(200, { result: "sent" })).toEqual({
      kind: "sent",
    });
  });

  it("reads the server field errors (RF-5)", () => {
    expect(
      parseContactResponse(400, {
        result: "invalid",
        errors: { email: "invalid", message: "tooLong" },
      }),
    ).toEqual({
      kind: "invalid",
      errors: { email: "invalid", message: "tooLong" },
    });
  });

  it("reads too many attempts (RF-11)", () => {
    expect(parseContactResponse(429, { result: "rateLimited" })).toEqual({
      kind: "rateLimited",
    });
  });

  it.each([
    [502, { result: "failed" }],
    [503, { result: "failed" }],
    [400, { result: "failed" }],
    [200, { result: "failed" }],
    [200, null],
    [200, "sent"],
    [200, ["sent"]],
    [200, { result: "unknown" }],
    [500, { result: "sent" }],
    [200, { result: "rateLimited" }],
    [429, { result: "sent" }],
    [400, { result: "invalid" }],
    [400, { result: "invalid", errors: {} }],
    [400, { result: "invalid", errors: null }],
    [400, { result: "invalid", errors: ["required"] }],
    [400, { result: "invalid", errors: { phone: "required" } }],
    [400, { result: "invalid", errors: { name: "weird" } }],
    [400, { result: "invalid", errors: { name: 1 } }],
    [400, { result: "invalid", errors: { name: "invalid" } }],
    [400, { result: "invalid", errors: { email: "tooLong" } }],
    [200, { result: "invalid", errors: { name: "required" } }],
  ])("treats %i with %j as a failed send (RF-8)", (status, body) => {
    expect(parseContactResponse(status, body)).toEqual({ kind: "failed" });
  });
});

describe("applyOutcome", () => {
  const typed = formWith(VALID, "sending");

  it("empties the form only on success (RF-7)", () => {
    expect(applyOutcome(typed, { kind: "sent" })).toEqual({
      ...EMPTY_FORM,
      status: "sent",
    });
  });

  it("shows the server errors and keeps the text (RF-5)", () => {
    expect(
      applyOutcome(typed, { kind: "invalid", errors: { email: "invalid" } }),
    ).toEqual({ values: VALID, errors: { email: "invalid" }, status: "idle" });
  });

  it.each(["failed", "rateLimited"] as const)(
    "keeps exactly what was written on %s (RF-8, RF-11)",
    (kind) => {
      expect(applyOutcome(typed, { kind })).toEqual({
        values: VALID,
        errors: {},
        status: kind,
      });
    },
  );
});

describe("firstInvalidField", () => {
  it("follows the form order, not the order of the errors (RF-3, RF-5)", () => {
    expect(firstInvalidField({ message: "required", email: "invalid" })).toBe(
      "email",
    );
  });

  it("gives null without errors", () => {
    expect(firstInvalidField({})).toBeNull();
  });
});

describe("errorTextKey", () => {
  it.each([
    ["name", "required", "nameRequired"],
    ["name", "tooLong", "nameTooLong"],
    ["email", "required", "emailRequired"],
    ["email", "invalid", "emailInvalid"],
    ["message", "required", "messageRequired"],
    ["message", "tooLong", "messageTooLong"],
  ] as const)("maps %s + %s to %s (RF-3, RF-15)", (field, error, key) => {
    expect(errorTextKey(field, error)).toBe(key);
    expect(es.contact[key]).toBeTruthy();
  });

  it.each([
    ["name", "invalid"],
    ["email", "tooLong"],
    ["message", "invalid"],
  ] as const)(
    "throws for %s + %s, which validation never produces",
    (field, error) => {
      expect(() => errorTextKey(field, error)).toThrow();
    },
  );

  it("covers every field", () => {
    for (const field of CONTACT_FIELDS) {
      expect(() => errorTextKey(field, "required")).not.toThrow();
    }
  });
});

describe("isSending", () => {
  it("is true only while sending (RF-6)", () => {
    expect(isSending(formWith(VALID, "sending"))).toBe(true);
    for (const status of ["idle", "sent", "failed", "rateLimited"] as const) {
      expect(isSending(formWith(VALID, status))).toBe(false);
    }
  });
});

describe("statusMessages", () => {
  it("announces success in the status region (RF-7)", () => {
    expect(statusMessages("sent")).toEqual({
      status: "sent",
      alert: null,
      offerLinkedin: false,
    });
  });

  it("offers LinkedIn after a failed send (RF-8)", () => {
    expect(statusMessages("failed")).toEqual({
      status: null,
      alert: "failed",
      offerLinkedin: true,
    });
  });

  it("does not offer LinkedIn for too many sends (RF-11)", () => {
    expect(statusMessages("rateLimited")).toEqual({
      status: null,
      alert: "rateLimited",
      offerLinkedin: false,
    });
  });

  it.each(["idle", "sending"] as const)("shows nothing while %s", (status) => {
    expect(statusMessages(status)).toEqual({
      status: null,
      alert: null,
      offerLinkedin: false,
    });
  });

  it("names texts that exist in the dictionary", () => {
    for (const status of ["sent", "failed", "rateLimited"] as const) {
      const { status: statusKey, alert } = statusMessages(status);
      for (const key of [statusKey, alert]) {
        if (key !== null) expect(es.contact[key]).toBeTruthy();
      }
    }
  });
});

describe("focusAfterOutcome", () => {
  it("focuses the first field the server rejected (RF-5)", () => {
    expect(
      focusAfterOutcome({
        kind: "invalid",
        errors: { message: "required", email: "invalid" },
      }),
    ).toBe("email");
  });

  it.each([
    { kind: "sent" },
    { kind: "failed" },
    { kind: "rateLimited" },
  ] as const)("leaves the focus where it is on $kind (RF-6)", (outcome) => {
    expect(focusAfterOutcome(outcome)).toBeNull();
  });
});

describe("LINKEDIN_LINK_KEY", () => {
  it.each([es, en])("splits failedAlternative once", (dictionary) => {
    const { before, after } = splitTemplate(
      dictionary.contact.failedAlternative,
      LINKEDIN_LINK_KEY,
    );
    expect(before + dictionary.contact.linkedinLink + after).not.toMatch(
      /[{}]/,
    );
  });
});

describe("FAILED_OUTCOME", () => {
  it("keeps the text and shows the send error (RF-8)", () => {
    const state = applyOutcome(formWith(VALID, "sending"), FAILED_OUTCOME);
    expect(state).toEqual({ values: VALID, errors: {}, status: "failed" });
  });
});
