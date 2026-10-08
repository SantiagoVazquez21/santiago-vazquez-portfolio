import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/contact/route";

const RESEND_URL = "https://api.resend.com/emails";

// The module keeps one limiter for its lifetime: each test uses its own IP.
function contactRequest(ip: string): Request {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({
      name: "Ana Pérez",
      email: "ana@mail.com",
      message: "Hola, quiero proponerte una entrevista.",
      website: "",
    }),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/contact", () => {
  it("wires the global fetch and the environment into the handler", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("CONTACT_TO_EMAIL", "owner@example.com");
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(null, { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(contactRequest("10.0.0.1"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ result: "sent" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(RESEND_URL);
  });

  it("answers 503 failed without calling fetch when the key is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CONTACT_TO_EMAIL", "owner@example.com");
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(contactRequest("10.0.0.2"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ result: "failed" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
