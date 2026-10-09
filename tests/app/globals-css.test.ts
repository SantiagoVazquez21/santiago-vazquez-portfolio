import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLOUD_LOOP_SECONDS,
  CLOUD_SPEED_MAX,
  CLOUD_TILE_WIDTH,
} from "@/lib/wallpaper";
import {
  CURSOR_ARROW_HOTSPOT,
  CURSOR_ARROW_SRC,
  CURSOR_HAND_HOTSPOT,
  CURSOR_HAND_SRC,
} from "@/lib/cursors";

const GLOBALS_CSS = readFileSync(
  join(process.cwd(), "src", "app", "globals.css"),
  "utf8",
);

// Returns the body of the first `{ ... }` block whose header matches, following
// nested braces so inner blocks stay inside it.
function blockBody(css: string, header: RegExp): string | undefined {
  const match = new RegExp(`(?:^|[\\s;{}])${header.source}\\s*\\{`).exec(css);
  if (!match) return undefined;
  const open = match.index + match[0].length - 1;
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") depth--;
    if (depth === 0) return css.slice(open + 1, i);
  }
  return undefined;
}

function normalizeSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

describe("globals.css: cloud loop (RF-4, RNF-1)", () => {
  const theme = blockBody(GLOBALS_CSS, /@theme/);
  const keyframes = theme && blockBody(theme, /@keyframes\s+clouds-drift/);

  it("declares the animation inside @theme so Tailwind builds animate-clouds", () => {
    expect(theme).toBeDefined();
    const declaration = /--animate-clouds\s*:\s*([^;]+);/.exec(theme ?? "");
    expect(declaration).not.toBeNull();
    expect(normalizeSpaces(declaration?.[1] ?? "")).toBe(
      `clouds-drift ${CLOUD_LOOP_SECONDS}s linear infinite`,
    );
  });

  it("moves exactly one tile per loop, starting from the tile's origin", () => {
    expect(keyframes).toBeDefined();
    const from = normalizeSpaces(blockBody(keyframes ?? "", /from/) ?? "");
    const to = normalizeSpaces(blockBody(keyframes ?? "", /to/) ?? "");
    expect(from).toBe("transform: translateX(0);");
    expect(to).toBe(`transform: translateX(-${CLOUD_TILE_WIDTH}px);`);
  });

  it("only animates transform, so nothing else is laid out again per frame", () => {
    const properties = [...(keyframes ?? "").matchAll(/([a-z-]+)\s*:/g)].map(
      (match) => match[1],
    );
    expect(properties.length).toBeGreaterThan(0);
    expect(new Set(properties)).toEqual(new Set(["transform"]));
  });

  it("keeps the clouds slow: one tile per loop is 8 px/s", () => {
    expect(CLOUD_TILE_WIDTH / CLOUD_LOOP_SECONDS).toBe(8);
    expect(CLOUD_TILE_WIDTH / CLOUD_LOOP_SECONDS).toBeLessThanOrEqual(
      CLOUD_SPEED_MAX,
    );
  });
});

// Splits a block into its top-level rules: selector list -> declarations.
function rulesOf(block: string): Map<string, string> {
  const rules = new Map<string, string>();
  for (const match of block.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    rules.set(normalizeSpaces(match[1]), normalizeSpaces(match[2]));
  }
  return rules;
}

describe("globals.css: retro cursors (RF-13, RF-14)", () => {
  const base = blockBody(GLOBALS_CSS, /@layer\s+base/);
  const rules = rulesOf(base ?? "");
  const arrow = `url("${CURSOR_ARROW_SRC}") ${CURSOR_ARROW_HOTSPOT.x} ${CURSOR_ARROW_HOTSPOT.y}, auto`;
  const hand = `url("${CURSOR_HAND_SRC}") ${CURSOR_HAND_HOTSPOT.x} ${CURSOR_HAND_HOTSPOT.y}, pointer`;

  it("puts the cursor rules in the base layer, so Tailwind's cursor utilities still win", () => {
    expect(base).toBeDefined();
    expect(GLOBALS_CSS.indexOf("@layer base")).toBeGreaterThan(
      GLOBALS_CSS.indexOf('@import "tailwindcss"'),
    );
  });

  it("shows the arrow on the whole document, with the system arrow as fallback", () => {
    expect(rules.get("html")).toBe(`cursor: ${arrow};`);
  });

  it("shows the hand on links and enabled buttons, with the system hand as fallback", () => {
    expect(rules.get("a[href], button:not(:disabled)")).toBe(
      `cursor: ${hand};`,
    );
  });

  it("keeps the system text cursor on text fields", () => {
    expect(rules.get("input, textarea")).toBe("cursor: text;");
  });

  it("declares only those three rules, each with only the cursor", () => {
    expect([...rules.keys()]).toEqual([
      "html",
      "a[href], button:not(:disabled)",
      "input, textarea",
    ]);
    for (const declarations of rules.values()) {
      expect(declarations.match(/[a-z-]+\s*:/g)).toEqual(["cursor:"]);
    }
  });

  it.each([
    ["src/app/[lang]/layout.tsx", "../globals.css"],
    ["src/app/global-error.tsx", "./globals.css"],
  ])(
    "%s imports globals.css, so the 404 and the error pages get the cursors",
    (file, specifier) => {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      const imports = source
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("import "));
      expect(imports).toContain(`import "${specifier}";`);
    },
  );
});
