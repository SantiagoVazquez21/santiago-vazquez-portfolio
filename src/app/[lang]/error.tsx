"use client";

import { usePathname } from "next/navigation";
import { ErrorView } from "@/components/ErrorView";
import { routeLangOrDefault } from "@/lib/routing";

// The error details are never shown (RF-57), so the boundary props are not read.
export default function PageError() {
  return <ErrorView lang={routeLangOrDefault(usePathname())} />;
}
