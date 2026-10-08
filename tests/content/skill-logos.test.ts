import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LOGO_FALLBACK, logoFill } from "@/lib/color-contrast";

const SKILLS_DIR = join(process.cwd(), "public", "skills");

// Simple Icons 16.34.0 entries: 12 CC0 logos (plan 004, section 6) and 3 with an
// attribution license (plan 004, section 10; docs/logos.md).
const LOGOS: readonly { slug: string; title: string; brandHex: string }[] = [
  { slug: "html5", title: "HTML5", brandHex: "#E34F26" },
  { slug: "css", title: "CSS", brandHex: "#663399" },
  { slug: "react", title: "React", brandHex: "#61DAFB" },
  { slug: "tailwindcss", title: "Tailwind CSS", brandHex: "#06B6D4" },
  { slug: "python", title: "Python", brandHex: "#3776AB" },
  { slug: "mysql", title: "MySQL", brandHex: "#4479A1" },
  { slug: "postgresql", title: "PostgreSQL", brandHex: "#4169E1" },
  { slug: "github", title: "GitHub", brandHex: "#181717" },
  { slug: "figma", title: "Figma", brandHex: "#F24E1E" },
  { slug: "vite", title: "Vite", brandHex: "#9135FF" },
  { slug: "arduino", title: "Arduino", brandHex: "#00878F" },
  { slug: "linux", title: "Linux", brandHex: "#FCC624" },
  { slug: "javascript", title: "JavaScript", brandHex: "#F7DF1E" },
  { slug: "php", title: "PHP", brandHex: "#777BB4" },
  { slug: "git", title: "Git", brandHex: "#F03C2E" },
];

const BLACK_LOGOS = ["react", "tailwindcss", "linux", "javascript"];

const JAVASCRIPT_LICENSE_URL =
  "https://github.com/voodootikigod/logo.js/blob/1544bdeed6d618a6cfe4f0650d04ab8d9cfa76d9/LICENSE";

const JAVASCRIPT_COPYRIGHT =
  "Copyright (c) 2011 Christopher Williams <chris@iterativedesigns.com>";

function readLogo(slug: string): string {
  return readFileSync(join(SKILLS_DIR, `${slug}.svg`), "utf8");
}

function rootFill(svg: string): string | undefined {
  return /^<svg\b[^>]*\sfill="([^"]*)"/.exec(svg)?.[1];
}

// The part of LICENSES.md that talks about one file: from its heading to the next one.
function noticeFor(notices: string, file: string): string {
  const start = notices.indexOf(`## \`${file}\``);
  if (start === -1) return "";
  const next = notices.indexOf("\n## ", start + 1);
  return next === -1 ? notices.slice(start) : notices.slice(start, next);
}

describe("public/skills logos", () => {
  it("holds exactly the 15 logos besides the own glyphs", () => {
    const logos = readdirSync(SKILLS_DIR)
      .filter((file) => file.endsWith(".svg") && !file.startsWith("own-"))
      .sort();
    expect(logos).toEqual(LOGOS.map(({ slug }) => `${slug}.svg`).sort());
  });

  it.each(LOGOS)(
    "$slug keeps the title of its entry ($title)",
    ({ slug, title }) => {
      const titles = [...readLogo(slug).matchAll(/<title>([^<]*)<\/title>/g)];
      expect(titles.map((match) => match[1])).toEqual([title]);
    },
  );

  it.each(LOGOS)(
    "$slug is filled with logoFill of its brand color",
    ({ slug, brandHex }) => {
      expect(rootFill(readLogo(slug))).toBe(logoFill(brandHex));
    },
  );

  it("draws React, Tailwind CSS, Linux and JavaScript in black and the rest in their brand color", () => {
    for (const { slug, brandHex } of LOGOS) {
      const expected = BLACK_LOGOS.includes(slug) ? LOGO_FALLBACK : brandHex;
      expect(rootFill(readLogo(slug)), slug).toBe(expected);
    }
  });

  it.each(LOGOS)(
    "$slug is a single svg without scripts, links or event handlers",
    ({ slug }) => {
      const svg = readLogo(slug);
      expect(svg.match(/<svg\b/g)).toHaveLength(1);
      expect(svg).not.toMatch(/<script/i);
      expect(svg).not.toMatch(/href/i);
      expect(svg).not.toMatch(/<foreignObject/i);
      expect(svg).not.toMatch(/\son[a-z]+\s*=/i);
    },
  );
});

// The notice travels next to the files the visitors get (plan 004, D11; RNF-5).
describe("public/skills/LICENSES.md", () => {
  const notices = readFileSync(join(SKILLS_DIR, "LICENSES.md"), "utf8");

  it("carries the MIT notice of javascript.svg word for word", () => {
    const javascript = noticeFor(notices, "javascript.svg");
    expect(javascript).toContain("The MIT License (MIT)");
    expect(javascript).toContain(JAVASCRIPT_COPYRIGHT);
    expect(javascript).toContain(JAVASCRIPT_LICENSE_URL);
    expect(javascript).toContain(
      "Permission is hereby granted, free of charge",
    );
    expect(javascript).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
  });

  it("attributes php.svg under CC BY-SA 4.0", () => {
    const php = noticeFor(notices, "php.svg");
    expect(php).toContain("CC BY-SA 4.0");
    expect(php).toContain("https://creativecommons.org/licenses/by-sa/4.0/");
    expect(php).toContain("Colin Viebrock");
  });

  it("attributes git.svg under CC BY 3.0", () => {
    const git = noticeFor(notices, "git.svg");
    expect(git).toContain("CC BY 3.0");
    expect(git).toContain("https://creativecommons.org/licenses/by/3.0/");
    expect(git).toContain("Jason Long");
  });
});
