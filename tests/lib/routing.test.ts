import { describe, expect, it } from "vitest";
import type { Lang } from "@/lib/locale";
import {
  homePath,
  langForPath,
  resolveRequest,
  type RouteDecision,
  routeLangOrDefault,
} from "@/lib/routing";

function redirect(status: 307 | 308, location: string): RouteDecision {
  return { kind: "redirect", status, location };
}

function render(lang: Lang): RouteDecision {
  return { kind: "render", lang };
}

// Splits a request URL the way the proxy receives it: pathname plus search ("" or "?...").
function splitUrl(url: string): readonly [string, string] {
  const queryStart = url.indexOf("?");
  return queryStart === -1
    ? [url, ""]
    : [url.slice(0, queryStart), url.slice(queryStart)];
}

// RF-41 (c): the 22 required routes, each with its single next hop (decision 54).
const ROUTE_CASES: ReadonlyArray<readonly [string, RouteDecision]> = [
  ["/", redirect(307, "/es")],
  ["/?utm_source=linkedin", redirect(307, "/es?utm_source=linkedin")],
  ["/es", render("es")],
  ["/en", render("en")],
  ["/es/", redirect(308, "/es")],
  ["/en/?a=1", redirect(308, "/en?a=1")],
  ["/EN", redirect(307, "/en")],
  ["/en-US?utm_source=x", redirect(307, "/en?utm_source=x")],
  ["/EN/algo", redirect(307, "/en/algo")],
  ["/es-CL/x/?a=1", redirect(308, "/es-CL/x?a=1")],
  ["/es-CL/x?a=1", redirect(307, "/es/x?a=1")],
  ["/EN/", redirect(308, "/EN")],
  ["/fr", render("es")],
  ["/fr/", redirect(308, "/fr")],
  ["/pt-BR/algo", render("es")],
  ["/proyectos", render("es")],
  ["/proyectos/", redirect(308, "/proyectos")],
  ["/en_US", render("es")],
  ["/es-419", render("es")],
  ["/favicon.ico", render("es")],
  ["/es/loquesea", render("es")],
  ["/en/loquesea", render("en")],
];

describe("resolveRequest", () => {
  it("covers exactly the 22 routes of RF-41 (c)", () => {
    expect(ROUTE_CASES).toHaveLength(22);
  });

  it.each(ROUTE_CASES)("%s", (url, expected) => {
    const [pathname, search] = splitUrl(url);
    expect(resolveRequest(pathname, search)).toEqual(expected);
  });

  // Spec 005: the proxy must let the contact POST through untouched.
  it("/api/contact renders without a redirect", () => {
    expect(resolveRequest("/api/contact", "")).toEqual(render("es"));
  });

  // Spec 009: the certificate PDF is a public file, served like any other without a language hop.
  it("/certificates/analitico-tecnico.pdf renders without a redirect (RF-7)", () => {
    expect(resolveRequest("/certificates/analitico-tecnico.pdf", "")).toEqual(
      render("es"),
    );
  });

  // Spec 010: About's photo is a public file too, so it must not get a language hop (RF-2).
  it("/about/photo.webp renders without a redirect (spec 010, RF-2)", () => {
    expect(resolveRequest("/about/photo.webp", "")).toEqual(render("es"));
  });
});

describe("langForPath", () => {
  it.each([
    ["/es", "es"],
    ["/en", "en"],
    ["/es/loquesea", "es"],
    ["/en/loquesea", "en"],
    ["/EN", "es"],
    ["/fr", "es"],
    ["/proyectos", "es"],
    ["/", "es"],
  ] as const)("%s -> %s", (pathname, expected) => {
    expect(langForPath(pathname)).toBe(expected);
  });
});

// RF-41 (d): error page language from the error path, or Spanish when the path is unavailable.
describe("routeLangOrDefault", () => {
  it.each([
    ["/es/loquesea", "es"],
    ["/en/loquesea", "en"],
    ["/fr", "es"],
    ["/proyectos", "es"],
    ["/", "es"],
    [null, "es"],
  ] as const)("%s -> %s", (pathname, expected) => {
    expect(routeLangOrDefault(pathname)).toBe(expected);
  });
});

describe("homePath", () => {
  it.each([
    ["es", "/es"],
    ["en", "/en"],
  ] as const)("%s -> %s", (lang, expected) => {
    expect(homePath(lang)).toBe(expected);
  });
});
