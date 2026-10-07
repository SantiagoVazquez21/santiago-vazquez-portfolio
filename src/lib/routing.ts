import {
  classifySegment,
  DEFAULT_LANG,
  type Lang,
  langForSegment,
} from "@/lib/locale";

export type RouteDecision =
  | { kind: "redirect"; status: 307 | 308; location: string }
  | { kind: "render"; lang: Lang };

function pathSegments(pathname: string): string[] {
  return pathname.slice(1).split("/");
}

// Returns only the next hop: a trailing-slash 308 and a language 307 are never merged,
// so each keeps its own status (spec decision 54).
export function resolveRequest(
  pathname: string,
  search: string,
): RouteDecision {
  if (pathname === "/") {
    // Temporary, so the default language can change later without stale browser caches.
    return {
      kind: "redirect",
      status: 307,
      location: homePath(DEFAULT_LANG) + search,
    };
  }
  if (pathname.endsWith("/")) {
    return {
      kind: "redirect",
      status: 308,
      location: pathname.slice(0, -1) + search,
    };
  }
  const [first = "", ...rest] = pathSegments(pathname);
  const segmentClass = classifySegment(first);
  if (segmentClass.kind === "normalizable") {
    const location = "/" + [segmentClass.lang, ...rest].join("/") + search;
    return { kind: "redirect", status: 307, location };
  }
  return { kind: "render", lang: langForSegment(first) };
}

export function langForPath(pathname: string): Lang {
  const [first = ""] = pathSegments(pathname);
  return langForSegment(first);
}

// The error page may not know its path (e.g. a global error); Spanish is the fallback.
export function routeLangOrDefault(pathname: string | null): Lang {
  return pathname === null ? DEFAULT_LANG : langForPath(pathname);
}

export function homePath(lang: Lang): string {
  return `/${lang}`;
}
