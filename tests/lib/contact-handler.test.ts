import { describe, expect, it, vi } from "vitest";
import {
  MAX_BODY_CHARS,
  handleContactRequest,
  type ContactDeps,
} from "@/lib/contact-handler";
import { createRateLimiter } from "@/lib/rate-limit";

const RESEND_URL = "https://api.resend.com/emails";
const ENV = {
  RESEND_API_KEY: "re_test_key",
  CONTACT_TO_EMAIL: "owner@example.com",
};
const NOW = 1_700_000_000_000;
const VALID_BODY = {
  name: "  Ana \n Pérez  ",
  email: " ana@mail.com ",
  message: "  Hola,\nquiero proponerte una entrevista.  ",
  website: "",
};

function fetchResponding(status: number) {
  return vi.fn<typeof fetch>(async () => new Response(null, { status }));
}

function makeDeps(overrides: Partial<ContactDeps> = {}): ContactDeps {
  return {
    fetchFn: fetchResponding(200),
    env: ENV,
    now: NOW,
    limiter: createRateLimiter(),
    ...overrides,
  };
}

function makeRequest(body: string): Request {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
    },
    body,
  });
}

function jsonRequest(body: unknown): Request {
  return makeRequest(JSON.stringify(body));
}

async function readResult(response: Response): Promise<unknown> {
  return response.json();
}

describe("handleContactRequest", () => {
  it("sends the normalized values once and answers 200 sent", async () => {
    const deps = makeDeps();
    const response = await handleContactRequest(jsonRequest(VALID_BODY), deps);

    expect(response.status).toBe(200);
    expect(await readResult(response)).toEqual({ result: "sent" });
    expect(deps.fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(deps.fetchFn).mock.calls[0] ?? [];
    expect(url).toBe(RESEND_URL);
    const sent: unknown = JSON.parse(String(init?.body));
    expect(sent).toMatchObject({
      to: ["owner@example.com"],
      reply_to: "ana@mail.com",
      subject: "Portafolio: mensaje de Ana Pérez",
      text: "Nombre: Ana Pérez\nEmail: ana@mail.com\n\nHola,\nquiero proponerte una entrevista.",
    });
  });

  it("answers JSON", async () => {
    const response = await handleContactRequest(
      jsonRequest(VALID_BODY),
      makeDeps(),
    );
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("answers 502 failed when Resend rejects the email", async () => {
    const deps = makeDeps({ fetchFn: fetchResponding(500) });
    const response = await handleContactRequest(jsonRequest(VALID_BODY), deps);

    expect(response.status).toBe(502);
    expect(await readResult(response)).toEqual({ result: "failed" });
    expect(deps.fetchFn).toHaveBeenCalledTimes(1);
  });

  it("answers 502 failed when the network fails", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new TypeError("network");
    });
    const response = await handleContactRequest(
      jsonRequest(VALID_BODY),
      makeDeps({ fetchFn }),
    );

    expect(response.status).toBe(502);
    expect(await readResult(response)).toEqual({ result: "failed" });
  });

  it("answers 503 failed without calling Resend when the key is missing", async () => {
    const deps = makeDeps({ env: { CONTACT_TO_EMAIL: "owner@example.com" } });
    const response = await handleContactRequest(jsonRequest(VALID_BODY), deps);

    expect(response.status).toBe(503);
    expect(await readResult(response)).toEqual({ result: "failed" });
    expect(deps.fetchFn).not.toHaveBeenCalled();
  });

  it("counts an attempt without configuration toward the limit", async () => {
    const deps = makeDeps({ env: {} });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await handleContactRequest(
        jsonRequest(VALID_BODY),
        deps,
      );
      expect(response.status).toBe(503);
    }
    const sixth = await handleContactRequest(jsonRequest(VALID_BODY), deps);
    expect(sixth.status).toBe(429);
  });

  it("fakes success for a filled honeypot without sending or counting", async () => {
    const deps = makeDeps();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await handleContactRequest(
        jsonRequest({ ...VALID_BODY, website: "http://spam.example" }),
        deps,
      );
      expect(response.status).toBe(200);
      expect(await readResult(response)).toEqual({ result: "sent" });
    }

    expect(deps.fetchFn).not.toHaveBeenCalled();
    expect(deps.limiter.attempts.size).toBe(0);
  });

  it("treats a honeypot with only spaces as empty", async () => {
    const deps = makeDeps();
    await handleContactRequest(
      jsonRequest({ ...VALID_BODY, website: "   " }),
      deps,
    );
    expect(deps.fetchFn).toHaveBeenCalledTimes(1);
  });

  it("answers 400 invalid with the errors and does not count", async () => {
    const deps = makeDeps();
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await handleContactRequest(
        jsonRequest({ name: " ", email: "ana@", message: "Hola" }),
        deps,
      );
      expect(response.status).toBe(400);
      expect(await readResult(response)).toEqual({
        result: "invalid",
        errors: { name: "required", email: "invalid" },
      });
    }

    expect(deps.fetchFn).not.toHaveBeenCalled();
    expect(deps.limiter.attempts.size).toBe(0);
  });

  it("reports a too long name and message", async () => {
    const response = await handleContactRequest(
      jsonRequest({
        name: "a".repeat(101),
        email: "ana@mail.com",
        message: "b".repeat(2001),
      }),
      makeDeps(),
    );
    expect(await readResult(response)).toEqual({
      result: "invalid",
      errors: { name: "tooLong", message: "tooLong" },
    });
  });

  it("answers 429 on the sixth valid attempt after five sends", async () => {
    const deps = makeDeps();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await handleContactRequest(
        jsonRequest(VALID_BODY),
        deps,
      );
      expect(response.status).toBe(200);
    }
    const sixth = await handleContactRequest(jsonRequest(VALID_BODY), deps);

    expect(sixth.status).toBe(429);
    expect(await readResult(sixth)).toEqual({ result: "rateLimited" });
    expect(deps.fetchFn).toHaveBeenCalledTimes(5);
  });

  it("allows again ten minutes after the first attempt", async () => {
    const limiter = createRateLimiter();
    const fetchFn = fetchResponding(200);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await handleContactRequest(
        jsonRequest(VALID_BODY),
        makeDeps({ limiter, fetchFn }),
      );
    }
    const later = await handleContactRequest(
      jsonRequest(VALID_BODY),
      makeDeps({ limiter, fetchFn, now: NOW + 10 * 60_000 }),
    );
    expect(later.status).toBe(200);
  });

  it("keeps separate limits per client address", async () => {
    const deps = makeDeps();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await handleContactRequest(jsonRequest(VALID_BODY), deps);
    }
    const other = new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "x-forwarded-for": "5.6.7.8" },
      body: JSON.stringify(VALID_BODY),
    });
    const response = await handleContactRequest(other, deps);
    expect(response.status).toBe(200);
  });

  it.each([
    ["not JSON", "{name:"],
    ["empty", ""],
    ["null", "null"],
    ["an array", "[]"],
    ["a string", '"hola"'],
    ["a number field", JSON.stringify({ ...VALID_BODY, name: 42 })],
    ["a missing field", JSON.stringify({ name: "Ana", email: "ana@mail.com" })],
    ["a non-string honeypot", JSON.stringify({ ...VALID_BODY, website: 1 })],
  ])("answers 400 failed for a body that is %s", async (_label, body) => {
    const deps = makeDeps();
    const response = await handleContactRequest(makeRequest(body), deps);

    expect(response.status).toBe(400);
    expect(await readResult(response)).toEqual({ result: "failed" });
    expect(deps.fetchFn).not.toHaveBeenCalled();
    expect(deps.limiter.attempts.size).toBe(0);
  });

  it("answers 400 failed for a body longer than the limit", async () => {
    const padding = "x".repeat(MAX_BODY_CHARS);
    const deps = makeDeps();
    const response = await handleContactRequest(
      jsonRequest({ ...VALID_BODY, extra: padding }),
      deps,
    );

    expect(response.status).toBe(400);
    expect(await readResult(response)).toEqual({ result: "failed" });
    expect(deps.fetchFn).not.toHaveBeenCalled();
  });

  it("accepts a body of exactly the limit", async () => {
    const base = JSON.stringify({ ...VALID_BODY, extra: "" });
    const body = JSON.stringify({
      ...VALID_BODY,
      extra: "x".repeat(MAX_BODY_CHARS - base.length),
    });
    expect(body.length).toBe(MAX_BODY_CHARS);
    const response = await handleContactRequest(makeRequest(body), makeDeps());
    expect(response.status).toBe(200);
  });

  it("never writes to the console", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (method) => vi.spyOn(console, method).mockImplementation(() => {}),
    );
    await handleContactRequest(jsonRequest(VALID_BODY), makeDeps());
    await handleContactRequest(
      jsonRequest(VALID_BODY),
      makeDeps({ fetchFn: fetchResponding(500) }),
    );
    await handleContactRequest(makeRequest("{"), makeDeps());
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
  });
});
