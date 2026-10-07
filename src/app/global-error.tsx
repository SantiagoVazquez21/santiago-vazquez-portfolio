"use client";

import { ErrorView } from "@/components/ErrorView";
import { useBrowserPathname } from "@/components/useBrowserPathname";
import { routeLangOrDefault } from "@/lib/routing";
import "./globals.css";

// The global error replaces the root layout, so it brings its own document, styles and the
// layout's classes (plan, section 5). usePathname() may be empty outside the layout, so the
// language comes from the browser path (plan, D19). The error details are never shown (RF-57).
export default function GlobalError() {
  const lang = routeLangOrDefault(useBrowserPathname());
  return (
    <html lang={lang} className="scheme-light">
      <body className="min-h-dvh bg-white text-neutral-900 font-sans">
        <ErrorView lang={lang} />
      </body>
    </html>
  );
}
