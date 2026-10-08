import { describe, expect, it } from "vitest";
import {
  CONTACT_FIELDS,
  HONEYPOT_FIELD,
  MAX_LENGTH,
  normalizeValues,
  parseContactBody,
  validateContact,
  validateField,
  type ContactValues,
} from "@/lib/contact-validation";

const VALID: ContactValues = {
  name: "Ana",
  email: "ana@mail.com",
  message: "Hola",
};

// An emoji is one code point but two UTF-16 units: lengths count code points (RF-2).
const EMOJI = "😀";

function emailOfLength(length: number): string {
  const domain = "@mail.com";
  return `${"a".repeat(length - domain.length)}${domain}`;
}

describe("contact validation constants", () => {
  it("keeps the focus and error order name, email, message", () => {
    expect(CONTACT_FIELDS).toEqual(["name", "email", "message"]);
  });

  it("uses the limits of RF-2", () => {
    expect(MAX_LENGTH).toEqual({ name: 100, email: 254, message: 2000 });
  });

  it("names the honeypot field website", () => {
    expect(HONEYPOT_FIELD).toBe("website");
  });
});

describe("validateField: required (RF-2)", () => {
  it.each(CONTACT_FIELDS)("an empty %s is required", (field) => {
    expect(validateField(field, "")).toBe("required");
  });

  it.each(CONTACT_FIELDS)("a %s with only spaces is required", (field) => {
    expect(validateField(field, "   \n\t ")).toBe("required");
  });

  it("accepts a valid value of each field", () => {
    expect(validateField("name", "Ana")).toBeNull();
    expect(validateField("email", "ana@mail.com")).toBeNull();
    expect(validateField("message", "Hola")).toBeNull();
  });
});

describe("validateField: lengths in code points (RF-2)", () => {
  it("accepts a name of 100 and rejects one of 101", () => {
    expect(validateField("name", "a".repeat(100))).toBeNull();
    expect(validateField("name", "a".repeat(101))).toBe("tooLong");
  });

  it("counts an emoji as one character in the name", () => {
    expect(validateField("name", `${"a".repeat(99)}${EMOJI}`)).toBeNull();
    expect(validateField("name", `${"a".repeat(100)}${EMOJI}`)).toBe("tooLong");
  });

  it("accepts a message of 2000 and rejects one of 2001", () => {
    expect(validateField("message", "a".repeat(2000))).toBeNull();
    expect(validateField("message", "a".repeat(2001))).toBe("tooLong");
  });

  it("counts an emoji as one character in the message", () => {
    expect(validateField("message", `${"a".repeat(1999)}${EMOJI}`)).toBeNull();
    expect(validateField("message", `${"a".repeat(2000)}${EMOJI}`)).toBe(
      "tooLong",
    );
  });

  it("accepts an email of 254 and rejects one of 255 as invalid", () => {
    expect(validateField("email", emailOfLength(254))).toBeNull();
    expect(validateField("email", emailOfLength(255))).toBe("invalid");
  });

  it("counts an emoji as one character in the email", () => {
    const local = `${"a".repeat(244)}${EMOJI}`;
    expect(validateField("email", `${local}@mail.com`)).toBeNull();
    expect(validateField("email", `a${local}@mail.com`)).toBe("invalid");
  });

  it("measures the length without the outer spaces", () => {
    expect(validateField("name", `  ${"a".repeat(100)}  `)).toBeNull();
  });
});

describe("validateField: email shape (RF-2)", () => {
  it.each(["ana@mail.com", "a.b+c@sub.dominio.ar"])("accepts %s", (email) => {
    expect(validateField("email", email)).toBeNull();
  });

  it.each(["ana@", "ana @mail.com", "a@b", "a@b.com,c@d.com", "a@b.com;x"])(
    "rejects %s",
    (email) => {
      expect(validateField("email", email)).toBe("invalid");
    },
  );

  it("accepts an email with outer spaces", () => {
    expect(validateField("email", "  ana@mail.com ")).toBeNull();
  });
});

describe("validateContact", () => {
  it("returns no errors for valid values", () => {
    expect(validateContact(VALID)).toEqual({});
  });

  it("returns the three required errors when everything is empty", () => {
    expect(validateContact({ name: "", email: "", message: " " })).toEqual({
      name: "required",
      email: "required",
      message: "required",
    });
  });

  it("returns only the fields that fail", () => {
    expect(
      validateContact({ ...VALID, email: "ana@", message: "a".repeat(2001) }),
    ).toEqual({ email: "invalid", message: "tooLong" });
  });
});

describe("normalizeValues", () => {
  it("trims the three fields", () => {
    expect(
      normalizeValues({
        name: "  Ana ",
        email: " ana@mail.com\n",
        message: "\n Hola \t",
      }),
    ).toEqual({ name: "Ana", email: "ana@mail.com", message: "Hola" });
  });

  it("collapses spaces and line breaks of the name into one space", () => {
    expect(
      normalizeValues({ ...VALID, name: "Ana \n\n  María\tPaz" }).name,
    ).toBe("Ana María Paz");
  });

  it("keeps the inner line breaks of the message", () => {
    expect(
      normalizeValues({ ...VALID, message: "  Hola\n\nChau  \n" }).message,
    ).toBe("Hola\n\nChau");
  });

  it("does not change the values it receives", () => {
    const values = { ...VALID, name: " Ana " };
    normalizeValues(values);
    expect(values.name).toBe(" Ana ");
  });
});

describe("parseContactBody", () => {
  it("reads a valid body with the honeypot", () => {
    expect(parseContactBody({ ...VALID, [HONEYPOT_FIELD]: "bot" })).toEqual({
      values: VALID,
      honeypot: "bot",
    });
  });

  it("takes a missing honeypot as empty", () => {
    expect(parseContactBody({ ...VALID })).toEqual({
      values: VALID,
      honeypot: "",
    });
  });

  it("ignores extra keys", () => {
    expect(parseContactBody({ ...VALID, website: "", extra: 1 })).toEqual({
      values: VALID,
      honeypot: "",
    });
  });

  it("keeps the values as they came (validation is separate)", () => {
    const raw = { name: " ", email: "x", message: "" };
    expect(parseContactBody(raw)).toEqual({ values: raw, honeypot: "" });
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an array", [VALID]],
    ["a string", JSON.stringify(VALID)],
    ["a number", 42],
    ["an empty object", {}],
    ["a numeric name", { ...VALID, name: 1 }],
    ["a numeric email", { ...VALID, email: 1 }],
    ["a missing message", { name: "Ana", email: "ana@mail.com" }],
    ["a null message", { ...VALID, message: null }],
    ["a numeric honeypot", { ...VALID, [HONEYPOT_FIELD]: 1 }],
    ["a null honeypot", { ...VALID, [HONEYPOT_FIELD]: null }],
  ])("returns null for %s", (_label, body) => {
    expect(parseContactBody(body)).toBeNull();
  });
});
