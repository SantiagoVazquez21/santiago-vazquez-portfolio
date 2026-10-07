import { NextResponse, type NextRequest } from "next/server";
import { resolveRequest } from "@/lib/routing";

export function proxy(request: NextRequest) {
  const decision = resolveRequest(
    request.nextUrl.pathname,
    request.nextUrl.search,
  );
  if (decision.kind === "redirect") {
    return NextResponse.redirect(
      new URL(decision.location, request.url),
      decision.status,
    );
  }
  return NextResponse.next();
}

// Framework assets must load untouched (RF-65); the matcher has to be a literal for Next.
export const config = { matcher: ["/((?!_next/).*)"] };
