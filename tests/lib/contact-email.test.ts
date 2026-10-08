import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RESEND_TIMEOUT_MS,
  buildResendRequest,
  readContactConfig,
  sendContactEmail,
} from "@/lib/contact-email";
import type { ContactValues } from "@/lib/contact-validation";

const RESEND_URL = "https://api.resend.com/emails";
const CONFIG = { apiKey: "re_test_key", to: "owner@example.com" };
const VALUES: ContactValues = {
  name: "Ana Pérez",
  email: "ana@mail.com",
  message: "Hola,\nquiero proponerte una entrevista.",
};

function readBody(init: RequestInit): Record<string, unknown> {
  expect(typeof init.body).toBe("string");
  const parsed: unknown = JSON.parse(String(init.body));
  expect(typeof parsed).toBe("object");
  return parsed as Record<string, unknown>;
}

function fetchResponding(status: number) {
  return vi.fn<typeof fetch>(async () => new Response(null, { status }));
}

describe("readContactConfig", () => {
  it("reads the key and the destination", () => {
    expect(
      readContactConfig({
        RESEND_API_KEY: "re_test_key",
        CONTACT_TO_EMAIL: "owner@example.com",
      }),
    ).toEqual(CONFIG);
  });

  it("trims surrounding spaces of both values", () => {
    expect(
      readContactConfig({
        RESEND_API_KEY: " re_test_key ",
        CONTACT_TO_EMAIL: " owner@example.com\n",
      }),
    ).toEqual(CONFIG);
  });

  it("gives null without the key", () => {
    expect(
      readContactConfig({ CONTACT_TO_EMAIL: "owner@example.com" }),
    ).toBeNull();
    expect(
      readContactConfig({
        RESEND_API_KEY: "  ",
        CONTACT_TO_EMAIL: "owner@example.com",
      }),
    ).toBeNull();
  });

  it("gives null without the destination", () => {
    expect(readContactConfig({ RESEND_API_KEY: "re_test_key" })).toBeNull();
    expect(
      readContactConfig({
        RESEND_API_KEY: "re_test_key",
        CONTACT_TO_EMAIL: "",
      }),
    ).toBeNull();
  });

  it("gives null with an invalid destination", () => {
    for (const to of ["owner@", "owner@example", "a@b.com,c@d.com"]) {
      expect(
        readContactConfig({
          RESEND_API_KEY: "re_test_key",
          CONTACT_TO_EMAIL: to,
        }),
      ).toBeNull();
    }
  });
});

describe("buildResendRequest", () => {
  it("posts to the Resend emails endpoint with the key as bearer", () => {
    const { url, init } = buildResendRequest(CONFIG, VALUES);
    expect(url).toBe(RESEND_URL);
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer re_test_key");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("sends from the test sender to the owner, replying to the visitor (RF-9)", () => {
    const body = readBody(buildResendRequest(CONFIG, VALUES).init);
    expect(body.from).toBe("Portafolio <onboarding@resend.dev>");
    expect(body.to).toEqual(["owner@example.com"]);
    expect(body.reply_to).toBe("ana@mail.com");
    expect(body.subject).toBe("Portafolio: mensaje de Ana Pérez");
  });

  it("carries the three fields as plain text, without HTML (RF-9)", () => {
    const body = readBody(buildResendRequest(CONFIG, VALUES).init);
    expect(body.text).toBe(
      "Nombre: Ana Pérez\nEmail: ana@mail.com\n\nHola,\nquiero proponerte una entrevista.",
    );
    expect(body).not.toHaveProperty("html");
    expect(Object.keys(body).sort()).toEqual(
      ["from", "reply_to", "subject", "text", "to"].sort(),
    );
  });

  it("keeps markup typed by the visitor as literal text", () => {
    const values = { ...VALUES, message: "<b>hola</b>" };
    const body = readBody(buildResendRequest(CONFIG, values).init);
    expect(body.text).toBe(
      "Nombre: Ana Pérez\nEmail: ana@mail.com\n\n<b>hola</b>",
    );
  });
});

describe("RESEND_TIMEOUT_MS", () => {
  it("waits 10 seconds for Resend", () => {
    expect(RESEND_TIMEOUT_MS).toBe(10_000);
  });
});

describe("sendContactEmail", () => {
  const consoleMethods = ["log", "info", "warn", "error", "debug"] as const;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function spyConsole() {
    return consoleMethods.map((method) =>
      vi.spyOn(console, method).mockImplementation(() => undefined),
    );
  }

  it("gives true with a 2xx response and calls fetch once", async () => {
    const fetchFn = fetchResponding(200);
    await expect(sendContactEmail(fetchFn, CONFIG, VALUES)).resolves.toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe(RESEND_URL);
    expect(init?.method).toBe("POST");
    expect(readBody(init ?? {}).reply_to).toBe("ana@mail.com");
  });

  it("gives true with any 2xx status", async () => {
    await expect(
      sendContactEmail(fetchResponding(202), CONFIG, VALUES),
    ).resolves.toBe(true);
  });

  it("limits the wait with a timeout signal", async () => {
    const fetchFn = fetchResponding(200);
    await sendContactEmail(fetchFn, CONFIG, VALUES);
    const init = fetchFn.mock.calls[0][1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.signal?.aborted).toBe(false);
  });

  it.each([400, 401, 422, 429, 500, 503])(
    "gives false with status %i",
    async (status) => {
      await expect(
        sendContactEmail(fetchResponding(status), CONFIG, VALUES),
      ).resolves.toBe(false);
    },
  );

  it("gives false on a network error", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(sendContactEmail(fetchFn, CONFIG, VALUES)).resolves.toBe(
      false,
    );
  });

  it("gives false on a timeout", async () => {
    const fetchFn = vi.fn<typeof fetch>(async () => {
      throw new DOMException("The operation timed out.", "TimeoutError");
    });
    await expect(sendContactEmail(fetchFn, CONFIG, VALUES)).resolves.toBe(
      false,
    );
  });

  it("writes nothing to the console on success or failure (RF-12)", async () => {
    const spies = spyConsole();
    await sendContactEmail(fetchResponding(200), CONFIG, VALUES);
    await sendContactEmail(fetchResponding(500), CONFIG, VALUES);
    await sendContactEmail(
      vi.fn<typeof fetch>(async () => {
        throw new TypeError("fetch failed");
      }),
      CONFIG,
      VALUES,
    );
    for (const spy of spies) {
      expect(spy).not.toHaveBeenCalled();
    }
  });
});
