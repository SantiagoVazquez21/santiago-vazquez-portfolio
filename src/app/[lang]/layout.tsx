import type { ReactNode } from "react";
import { SUPPORTED_LANGS, langForSegment } from "@/lib/locale";
import "../globals.css";

type RootLayoutProps = {
  children: ReactNode;
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const { lang } = await params;
  return (
    <html lang={langForSegment(lang)} className="scheme-light">
      <body className="min-h-dvh bg-white text-neutral-900 font-sans">
        {children}
      </body>
    </html>
  );
}
