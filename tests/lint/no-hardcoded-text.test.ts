import type { Linter } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";
import { ESLINT_WARM_UP_TIMEOUT_MS, lintBoth, warmUpEslint } from "./lint-both";

const HARDCODED_TEXT_RULE = "local/no-hardcoded-text";

// A component under src/components/ and a page under src/app/ (spec, "Componente").
const COMPONENT_PATHS = ["src/components/X.tsx", "src/app/[lang]/page.tsx"];
// Same code outside the components: the rule does not apply (RF-34 reviews it instead).
const NON_COMPONENT_PATH = "src/lib/x.tsx";

// Each snippet has exactly one literal with visible characters, the one named in
// `text`, and nothing that any other rule reports.
const REPORTED = [
  [
    "text in the markup",
    "export function A() {\n  return <p>Hola</p>;\n}\n",
    "Hola",
  ],
  [
    "a literal in a constant used in the markup",
    'const label = "Hola";\n\nexport function A() {\n  return <p>{label}</p>;\n}\n',
    '"Hola"',
  ],
  [
    "a literal as a function argument",
    'export function A({ f }: { f: (s: string) => string }) {\n  return <p>{f("Hola")}</p>;\n}\n',
    '"Hola"',
  ],
  [
    "a literal passed to an own prop",
    'function Card({ text }: { text: string }) {\n  return <p>{text}</p>;\n}\n\nexport function A() {\n  return <Card text="Hola" />;\n}\n',
    '"Hola"',
  ],
  [
    "a literal in an expression passed to an own prop",
    'function Card({ text }: { text: string }) {\n  return <p>{text}</p>;\n}\n\nexport function A() {\n  return <Card text={"Hola"} />;\n}\n',
    '"Hola"',
  ],
  [
    "a comparison with a literal",
    'export function isSpanish(lang: string): boolean {\n  return lang === "es";\n}\n',
    '"es"',
  ],
  [
    "a literal concatenated with + in the markup",
    'export function A({ b }: { b: string }) {\n  return <p>{"a " + b}</p>;\n}\n',
    '"a "',
  ],
  [
    "a literal concatenated with + in className",
    'export function A({ b }: { b: string }) {\n  return <div className={"a " + b} />;\n}\n',
    '"a "',
  ],
  [
    "a template literal with visible text",
    "export function A({ name }: { name: string }) {\n  return <p>{`Hola ${name}`}</p>;\n}\n",
    "`Hola ${name}`",
  ],
] as const;

// Whitespace only is never visible text (technical exception 6).
const NOT_REPORTED = [
  [
    'the {" "} that Prettier inserts',
    'export function A({ a, b }: { a: string; b: string }) {\n  return (\n    <p>\n      {a}{" "}\n      {b}\n    </p>\n  );\n}\n',
  ],
  ["a blank string constant", 'export const gap = "   ";\n'],
  ["an empty string constant", 'export const empty = "";\n'],
  // The plan's /\S/ check: JavaScript's \s includes U+00A0, so it is blank too.
  ["a non-breaking space", 'export const nbsp = "\\u00a0";\n'],
  [
    "a template literal with blank fixed parts",
    "export function join(a: string, b: string): string {\n  return `${a} ${b}`;\n}\n",
  ],
] as const;

// Attributes (technical exception 4, plan section 4.7, D18). Own components render
// whatever they receive, so the lint cannot tell that a prop value is not visible.
function ownComponent(name: string): string {
  return `function ${name}(props: Record<string, unknown>) {\n  return <div {...props} />;\n}\n\n`;
}

function render(jsx: string, props = ""): string {
  return `export function A(${props}) {\n  return ${jsx};\n}\n`;
}

const FLAG = "{ a }: { a: boolean }";
const LANG = "{ lang }: { lang: string }";

// Every attribute of the closed native-only list, on a native element of its kind.
const NATIVE_ONLY_ATTRIBUTES = [
  ["className", "div"],
  ["href", "a"],
  ["lang", "html"],
  ["id", "div"],
  ["type", "button"],
  ["rel", "a"],
  ["target", "a"],
  ["role", "div"],
  ["htmlFor", "label"],
  ["aria-current", "a"],
  ["aria-hidden", "span"],
  ["aria-labelledby", "div"],
  ["aria-describedby", "div"],
] as const;

// Accessible names are visible text: never exempt, not even on a native element.
const VISIBLE_ATTRIBUTES = [
  ["aria-label", "button"],
  ["alt", "img"],
  ["title", "span"],
  ["placeholder", "input"],
] as const;

// [name, code, every reported literal in source order]. Nothing else is reported.
type ReportedCase = readonly [string, string, readonly string[]];

const ATTRIBUTE_REPORTED: readonly ReportedCase[] = [
  ...VISIBLE_ATTRIBUTES.flatMap(([attr, el]): ReportedCase[] => [
    [`${attr} on <${el}>`, render(`<${el} ${attr}="Hola" />`), ['"Hola"']],
    [
      `${attr} as a conditional on <${el}>`,
      render(`<${el} ${attr}={a ? "Hola" : "Chao"} />`, FLAG),
      ['"Hola"', '"Chao"'],
    ],
    [
      `${attr} as a template on <${el}>`,
      render(`<${el} ${attr}={\`Hola \${lang}\`} />`, LANG),
      ["`Hola ${lang}`"],
    ],
  ]),
  ...NATIVE_ONLY_ATTRIBUTES.map(([attr]): ReportedCase => [
    `${attr} on an own component`,
    ownComponent("Tarjeta") + render(`<Tarjeta ${attr}="x" />`),
    ['"x"'],
  ]),
  [
    'className={clsx("x")}',
    render(
      '<div className={clsx("x")} />',
      "{ clsx }: { clsx: (s: string) => string }",
    ),
    ['"x"'],
  ],
  [
    'className={pick("x")}',
    render(
      '<div className={pick("x")} />',
      "{ pick }: { pick: (s: string) => string }",
    ),
    ['"x"'],
  ],
  [
    "a conditional inside a function call in className",
    render(
      '<div className={pick(a ? "x" : "y")} />',
      "{ a, pick }: { a: boolean; pick: (s: string) => string }",
    ),
    ['"x"', '"y"'],
  ],
  // Only the literal in ${} fails: the fixed part "/" reaches href (form iii).
  ['href={`/${"x"}`} on <a>', render('<a href={`/${"x"}`} />'), ['"x"']],
  [
    "a literal in an array in className",
    render('<div className={["x"].join(" ")} />'),
    ['"x"'],
  ],
  [
    "a literal in an object in className",
    render('<div className={{ c: "x" }.c} />'),
    ['"x"'],
  ],
  [
    "a literal in a spread object on a native element",
    render('<div {...{ id: "x" }} />'),
    ['"x"'],
  ],
  [
    "a className kept in a constant",
    'const c = "x";\n\nexport function A() {\n  return <div className={c} />;\n}\n',
    ['"x"'],
  ],
  [
    "a literal in the condition of a className conditional",
    render('<div className={lang === "es" ? "x" : "y"} />', LANG),
    ['"es"'],
  ],
  [
    "a literal with a type assertion in className",
    render('<div className={"x" as string} />'),
    ['"x"'],
  ],
  [
    "a conditional between literals in the markup",
    render('<p>{a ? "Hola" : "Chao"}</p>', FLAG),
    ['"Hola"', '"Chao"'],
  ],
  [
    "an attribute outside the list on a native element",
    render('<div data-x="x" />'),
    ['"x"'],
  ],
  [
    "a namespaced attribute on a native element",
    render('<html xml:lang="es" />'),
    ['"es"'],
  ],
  [
    "a hand-written meta content",
    render('<meta name="description" content="Hola" />'),
    ['"Hola"'],
  ],
  ['<div name="texto">', render('<div name="texto" />'), ['"texto"']],
  ['<div property="texto">', render('<div property="texto" />'), ['"texto"']],
  [
    '<Meta name="texto" />',
    ownComponent("Meta") + render('<Meta name="texto" />'),
    ['"texto"'],
  ],
  [
    '<Componente name="texto" />',
    ownComponent("Componente") + render('<Componente name="texto" />'),
    ['"texto"'],
  ],
  [
    '<Componente property="texto" />',
    ownComponent("Componente") + render('<Componente property="texto" />'),
    ['"texto"'],
  ],
  [
    '<Tarjeta type="Desarrollador" />',
    ownComponent("Tarjeta") + render('<Tarjeta type="Desarrollador" />'),
    ['"Desarrollador"'],
  ],
  [
    '<Tarjeta className={a ? "x" : "y"} />',
    ownComponent("Tarjeta") +
      render('<Tarjeta className={a ? "x" : "y"} />', FLAG),
    ['"x"', '"y"'],
  ],
  [
    '<Tarjeta className={a && "x"} />',
    ownComponent("Tarjeta") + render('<Tarjeta className={a && "x"} />', FLAG),
    ['"x"'],
  ],
  [
    "<Tarjeta href={`/${lang}`} />",
    ownComponent("Tarjeta") + render("<Tarjeta href={`/${lang}`} />", LANG),
    ["`/${lang}`"],
  ],
  [
    '<x.div id="x" />',
    render(
      '<x.div id="x" />',
      "{ x }: { x: { div: (p: { id: string }) => null } }",
    ),
    ['"x"'],
  ],
  ['<svg:rect id="x" />', render('<svg:rect id="x" />'), ['"x"']],
  ['<my-card type="x" />', render('<my-card type="x" />'), ['"x"']],
];

const ATTRIBUTE_NOT_REPORTED: ReadonlyArray<readonly [string, string]> = [
  ...NATIVE_ONLY_ATTRIBUTES.map(
    ([attr, el]) =>
      [`${attr} on <${el}>`, render(`<${el} ${attr}="x" />`)] as const,
  ),
  ['className={"x"} on a native element', render('<div className={"x"} />')],
  [
    'className={a ? "x" : "y"} on a native element',
    render('<div className={a ? "x" : "y"} />', FLAG),
  ],
  [
    'className={a && "x"} on a native element',
    render('<div className={a && "x"} />', FLAG),
  ],
  [
    'className={a || "x"} on a native element',
    render('<div className={a || "x"} />', FLAG),
  ],
  [
    "a nested conditional in className on a native element",
    render(
      '<div className={a ? "x" : b ? "y" : "z"} />',
      "{ a, b }: { a: boolean; b: boolean }",
    ),
  ],
  [
    "a logical expression inside a conditional in className",
    render(
      '<div className={a ? b && "x" : "y"} />',
      "{ a, b }: { a: boolean; b: boolean }",
    ),
  ],
  [
    "a template in a branch of a conditional in className",
    render(
      '<div className={a ? `x ${b}` : "y"} />',
      "{ a, b }: { a: boolean; b: string }",
    ),
  ],
  ["href={`/${lang}`} on <a>", render("<a href={`/${lang}`} />", LANG)],
  ['<div id="main">', render('<div id="main" />')],
  ['<h1 id="x">', render('<h1 id="x" />')],
  ['<button type="button">', render('<button type="button" />')],
  ['<span aria-hidden="true">', render('<span aria-hidden="true" />')],
  [
    '<Tarjeta key="a" />',
    ownComponent("Tarjeta") + render('<Tarjeta key="a" />'),
  ],
  [
    '<Tarjeta key={a ? "x" : "y"} />',
    ownComponent("Tarjeta") + render('<Tarjeta key={a ? "x" : "y"} />', FLAG),
  ],
  ['<li key="a">', render('<li key="a" />')],
  ['<my-card key="a" />', render('<my-card key="a" />')],
  [
    '<meta name="description" content={d} />',
    render('<meta name="description" content={d} />', "{ d }: { d: string }"),
  ],
  [
    '<meta property="og:title" content={t} />',
    render('<meta property="og:title" content={t} />', "{ t }: { t: string }"),
  ],
];

// Technical exceptions 1 (modules and directives), 2 (types) and 3 (keys), plan
// section 4.7. Each one covers its own position only, never a runtime value.
const EXCEPTION_NOT_REPORTED: ReadonlyArray<readonly [string, string]> = [
  ['"use client"', '"use client";\n\nexport const a = 1;\n'],
  ['"use server"', '"use server";\n\nexport const a = 1;\n'],
  [
    '"use server" in a function',
    'export async function act(): Promise<number> {\n  "use server";\n  return 1;\n}\n',
  ],
  ['import "../globals.css"', 'import "../globals.css";\n'],
  ["an import source", 'import { b } from "./b";\n\nexport const a = b;\n'],
  [
    "an import type source",
    'import type { B } from "./b";\n\nexport type A = B;\n',
  ],
  ["an export source", 'export { b } from "./b";\n'],
  ["an export * source", 'export * from "./b";\n'],
  ["an export * as source", 'export * as b from "./b";\n'],
  [
    "a dynamic import source",
    'export async function load(): Promise<unknown> {\n  return import("./b");\n}\n',
  ],
  ["a literal type alias", 'export type Lang = "es" | "en";\n'],
  [
    "a literal type in an interface",
    'export interface P {\n  kind: "a" | "b";\n}\n',
  ],
  [
    "literal types in annotations",
    'export function f(k: "a" | "b"): "a" | "b" {\n  return k;\n}\n',
  ],
  [
    "a literal type argument",
    'export function f(g: <T>() => T): string {\n  return g<"x">();\n}\n',
  ],
  [
    "a literal type parameter default",
    'export type Box<T extends string = "x"> = { v: T };\n',
  ],
  ["an indexed access type", 'export type V = { home: string }["home"];\n'],
  ["an import type", 'export type T = typeof import("./b");\n'],
  ["a template literal type", "export type Path = `/${string}`;\n"],
  [
    "{ lang } as a key",
    "export function f(lang: string) {\n  return { lang };\n}\n",
  ],
  ["a literal object key", 'export const m = { "home-page": 1 };\n'],
  ["a computed literal object key", 'export const m = { ["x"]: 1 };\n'],
  [
    "a literal key in a destructuring pattern",
    'export function f({ "a-b": x }: Record<string, number>): number {\n  return x;\n}\n',
  ],
  [
    "a computed literal member access",
    'export function f(d: Record<string, string>): string | undefined {\n  return d["home"];\n}\n',
  ],
  [
    "literal class member keys",
    'export class C {\n  "x" = 1;\n  "m"(): number {\n    return this.x;\n  }\n}\n',
  ],
  // Only text literals are visible outside the markup (RF-16).
  ["a number in a constant", "export const n = 42;\n"],
  ["a number in an attribute", render("<input maxLength={10} />")],
  [
    "a number as an index in the markup",
    render("<p>{a[0]}</p>", "{ a }: { a: string[] }"),
  ],
  [
    "a number in arithmetic in the markup",
    render("<p>{n + 1}</p>", "{ n }: { n: number }"),
  ],
];

const EXCEPTION_REPORTED: readonly ReportedCase[] = [
  ["an object value", 'export const m = { home: "Hola" };\n', ['"Hola"']],
  [
    "an object value next to a literal key",
    'export const m = { "home": "Hola" };\n',
    ['"Hola"'],
  ],
  [
    "a conditional as a member key",
    'export function f(d: Record<string, string>, k: boolean): string | undefined {\n  return d[k ? "a" : "b"];\n}\n',
    ['"a"', '"b"'],
  ],
  [
    "a concatenation as a member key",
    'export function f(d: Record<string, string>, k: string): string | undefined {\n  return d["a" + k];\n}\n',
    ['"a"'],
  ],
  [
    "a concatenation as a computed object key",
    'export function f(k: string) {\n  return { ["a" + k]: 1 };\n}\n',
    ['"a"'],
  ],
  [
    "a value with a literal type annotation",
    'export const k: "a" | "b" = "a";\n',
    ['"a"'],
  ],
  [
    "a value with a literal type assertion",
    'export const k = "x" as "x" | "y";\n',
    ['"x"'],
  ],
  [
    "a value with satisfies",
    'export const k = "x" satisfies string;\n',
    ['"x"'],
  ],
  // A number used as the content of the markup is visible text (RF-16).
  ["<p>{42}</p>", render("<p>{42}</p>"), ["42"]],
  [
    "<p>{c ? 1 : 2}</p>",
    render("<p>{c ? 1 : 2}</p>", "{ c }: { c: boolean }"),
    ["1", "2"],
  ],
  [
    "<p>{c && 1}</p>",
    render("<p>{c && 1}</p>", "{ c }: { c: boolean }"),
    ["1"],
  ],
  ["a number in a fragment", render("<>{42}</>"), ["42"]],
];

// Technical exception 5: route configuration values, only under src/app/ and only for
// the exports of ROUTE_CONFIG_EXPORTS (plan section 4.7). [name, code, literals].
const ROUTE_CONFIG: readonly ReportedCase[] = [
  [
    'export const dynamic = "force-static"',
    'export const dynamic = "force-static";\n',
    ['"force-static"'],
  ],
  [
    'export const fetchCache = "default-cache"',
    'export const fetchCache = "default-cache";\n',
    ['"default-cache"'],
  ],
  [
    'export const runtime = "nodejs"',
    'export const runtime = "nodejs";\n',
    ['"nodejs"'],
  ],
  [
    'export const preferredRegion = "auto"',
    'export const preferredRegion = "auto";\n',
    ['"auto"'],
  ],
  [
    'export const preferredRegion = ["iad1", "sfo1"]',
    'export const preferredRegion = ["iad1", "sfo1"];\n',
    ['"iad1"', '"sfo1"'],
  ],
];

// Fail in src/app/ too: not an exported const of the list, initialised with the literal
// or with an array of literals.
const ROUTE_CONFIG_REPORTED_IN_APP: readonly ReportedCase[] = [
  [
    "an export outside the list",
    'export const other = "force-static";\n',
    ['"force-static"'],
  ],
  [
    "a hand-written metadata export",
    'export const metadata = { title: "Hola" };\n',
    ['"Hola"'],
  ],
  [
    "a route config name that is not exported",
    'export function f(): string {\n  const dynamic = "force-static";\n  return dynamic;\n}\n',
    ['"force-static"'],
  ],
  [
    "a route config exported apart",
    'const dynamic = "force-static";\n\nexport { dynamic };\n',
    ['"force-static"'],
  ],
  [
    "a route config exported with let",
    'export let dynamic = "force-static";\n\nexport function reset(): void {\n  dynamic = "auto";\n}\n',
    ['"force-static"', '"auto"'],
  ],
  [
    "a conditional route config",
    'const c = Math.random() > 0.5;\n\nexport const dynamic = c ? "force-static" : "auto";\n',
    ['"force-static"', '"auto"'],
  ],
  [
    "a route config with a type assertion",
    'export const dynamic = "force-static" as const;\n',
    ['"force-static"'],
  ],
  [
    "a nested array in a route config",
    'export const preferredRegion = [["iad1"]];\n',
    ['"iad1"'],
  ],
];

// The rule accepts every component extension of the plan (section 4.7).
const EXTENSIONS = ["ts", "tsx", "mts", "cts", "js", "jsx", "mjs", "cjs"];
const PLAIN_SNIPPET = 'const label = "Hola";\nlabel.trim();\n';

function ruleReports(messages: Linter.LintMessage[]): Linter.LintMessage[] {
  return messages.filter((m) => m.ruleId === HARDCODED_TEXT_RULE);
}

async function expectReported(
  code: string,
  filePath: string,
  texts: readonly string[],
): Promise<void> {
  const { exitCode, pass1 } = await lintBoth(code, filePath);
  expect(pass1.fatalErrorCount).toBe(0);
  const reports = ruleReports(pass1.messages);
  expect(reports.map((r) => r.severity)).toEqual(texts.map(() => 2));
  texts.forEach((text, i) => {
    expect(reports[i]?.message).toContain(`text ${text} in`);
  });
  expect(pass1.messages).toHaveLength(texts.length);
  expect(exitCode).toBe(1);
}

async function expectNotReported(
  code: string,
  filePath: string,
): Promise<void> {
  const { exitCode, pass1 } = await lintBoth(code, filePath);
  expect(pass1.messages).toEqual([]);
  expect(exitCode).toBe(0);
}

// ESLint loads its config, parser and plugins here, not in the first test (plan, D33).
beforeAll(() => warmUpEslint(), ESLINT_WARM_UP_TIMEOUT_MS);

describe.each(COMPONENT_PATHS)(
  "local/no-hardcoded-text in %s (RF-16)",
  (filePath) => {
    it.each(REPORTED)("reports %s", async (_name, code, text) => {
      const { exitCode, pass1 } = await lintBoth(code, filePath);
      expect(pass1.fatalErrorCount).toBe(0);
      const reports = ruleReports(pass1.messages);
      expect(reports).toHaveLength(1);
      expect(reports[0]?.severity).toBe(2);
      expect(reports[0]?.message).toContain(text);
      expect(pass1.messages).toHaveLength(1);
      expect(exitCode).toBe(1);
    });

    it.each(NOT_REPORTED)("does not report %s", async (_name, code) => {
      const { exitCode, pass1 } = await lintBoth(code, filePath);
      expect(pass1.messages).toEqual([]);
      expect(exitCode).toBe(0);
    });

    it.each([
      ...ATTRIBUTE_REPORTED,
      ...EXCEPTION_REPORTED,
      ...ROUTE_CONFIG_REPORTED_IN_APP,
    ])("reports %s", async (_name, code, texts) => {
      await expectReported(code, filePath, texts);
    });

    it.each([...ATTRIBUTE_NOT_REPORTED, ...EXCEPTION_NOT_REPORTED])(
      "does not report %s",
      async (_name, code) => {
        await expectNotReported(code, filePath);
      },
    );
  },
);

describe("local/no-hardcoded-text route configuration (RF-16, technical exception 5)", () => {
  it.each(ROUTE_CONFIG)(
    "does not report %s in src/app/",
    async (_name, code) => {
      await expectNotReported(code, "src/app/[lang]/page.tsx");
      await expectNotReported(code, "src/app/layout.tsx");
    },
  );

  it.each(ROUTE_CONFIG)(
    "reports %s in src/components/",
    async (_name, code, texts) => {
      await expectReported(code, "src/components/X.tsx", texts);
    },
  );

  // Only the path inside the project counts: a src/app/ folder elsewhere is not the app.
  it.each(ROUTE_CONFIG)(
    "reports %s in src/components/src/app/",
    async (_name, code, texts) => {
      await expectReported(code, "src/components/src/app/X.tsx", texts);
    },
  );
});

describe("local/no-hardcoded-text outside the components (RF-16, RF-34)", () => {
  it.each(
    [
      ...REPORTED,
      ...NOT_REPORTED,
      ...ATTRIBUTE_REPORTED,
      ...ATTRIBUTE_NOT_REPORTED,
      ...EXCEPTION_REPORTED,
      ...EXCEPTION_NOT_REPORTED,
      ...ROUTE_CONFIG,
      ...ROUTE_CONFIG_REPORTED_IN_APP,
    ].map(([name, code]) => [name, code]),
  )("does not report %s in src/lib/", async (_name, code) => {
    const { exitCode, pass1 } = await lintBoth(code, NON_COMPONENT_PATH);
    expect(pass1.messages).toEqual([]);
    expect(exitCode).toBe(0);
  });
});

describe("local/no-hardcoded-text file patterns (plan, section 4.7)", () => {
  it.each(
    EXTENSIONS.flatMap((ext) => [
      `src/components/x.${ext}`,
      `src/app/x.${ext}`,
    ]),
  )("reports a literal in %s", async (filePath) => {
    const { pass1 } = await lintBoth(PLAIN_SNIPPET, filePath);
    expect(pass1.fatalErrorCount).toBe(0);
    expect(ruleReports(pass1.messages)).toHaveLength(1);
  });

  it.each(["src/lib/x.ts", "src/i18n/x.ts", "src/x.ts", "tests/x.ts"])(
    "does not report a literal in %s",
    async (filePath) => {
      const { pass1 } = await lintBoth(PLAIN_SNIPPET, filePath);
      expect(ruleReports(pass1.messages)).toEqual([]);
    },
  );
});

// T21: no directive or inline config can hide the rule, because pass 2 ignores them
// and pass 1 reports the comment itself (RF-15, RF-16; plan, section 6.4).
const RESTRICTED_DISABLE_RULE =
  "@eslint-community/eslint-comments/no-restricted-disable";
const INLINE_CONFIG_RULE = "local/no-unsuppressible-inline-config";

// [name, code, rule reporting the comment in pass 1, its line, line of the text]
const SUPPRESSION_ATTEMPTS = [
  [
    "eslint-disable-next-line",
    `export function A() {\n  // eslint-disable-next-line ${HARDCODED_TEXT_RULE} -- x\n  return <p>Hola</p>;\n}\n`,
    RESTRICTED_DISABLE_RULE,
    2,
    3,
  ],
  [
    "eslint-disable",
    `/* eslint-disable ${HARDCODED_TEXT_RULE} -- x */\nexport function A() {\n  return <p>Hola</p>;\n}\n`,
    RESTRICTED_DISABLE_RULE,
    1,
    3,
  ],
  [
    "eslint-disable-line",
    `export function A() {\n  return <p>Hola</p>; // eslint-disable-line ${HARDCODED_TEXT_RULE} -- x\n}\n`,
    RESTRICTED_DISABLE_RULE,
    2,
    2,
  ],
  [
    'an inline config set to "off"',
    `/* eslint ${HARDCODED_TEXT_RULE}: "off" -- x */\nexport function A() {\n  return <p>Hola</p>;\n}\n`,
    INLINE_CONFIG_RULE,
    1,
    3,
  ],
  [
    'an inline config set to "warn"',
    `/* eslint ${HARDCODED_TEXT_RULE}: "warn" -- x */\nexport function A() {\n  return <p>Hola</p>;\n}\n`,
    INLINE_CONFIG_RULE,
    1,
    3,
  ],
] as const;

describe.each(COMPONENT_PATHS)(
  "local/no-hardcoded-text is unsuppressible in %s (RF-15, RF-16)",
  (filePath) => {
    it.each(SUPPRESSION_ATTEMPTS)(
      "fails with %s and pass 2 reports the text",
      async (_name, code, commentRule, commentLine, textLine) => {
        const { exitCode, pass1, pass2 } = await lintBoth(code, filePath);
        expect(exitCode).toBe(1);
        expect(
          pass1.messages.filter(
            (m) =>
              m.ruleId === commentRule &&
              m.severity === 2 &&
              m.line === commentLine,
          ),
        ).toHaveLength(1);
        const reports = ruleReports(pass2.messages);
        expect(reports).toHaveLength(1);
        expect(reports[0]?.severity).toBe(2);
        expect(reports[0]?.line).toBe(textLine);
        expect(reports[0]?.message).toContain("Hola");
      },
    );
  },
);
