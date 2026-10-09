import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect } from "vitest";

// Shared by the wallpaper and cursor tests: every new SVG of spec 007 passes
// the same safety and header checks (plan 007, sections 5 and 9).

export type SvgElement = {
  name: string;
  attributes: Record<string, string>;
};

export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';

export function readPublic(src: string): string {
  return readFileSync(join(process.cwd(), "public", src), "utf8");
}

// The optional XML declaration is the only thing allowed before the root (plan 007, section 5).
export function withoutDeclaration(svg: string): string {
  return svg.startsWith(XML_DECLARATION)
    ? svg.slice(XML_DECLARATION.length)
    : svg;
}

// Fails on anything this small reader does not understand, so nothing can hide from it.
export function parseElements(svg: string): SvgElement[] {
  const body = withoutDeclaration(svg);
  const elements: SvgElement[] = [];
  let rest = body;
  for (const match of body.matchAll(/<\/?([A-Za-z][\w:.-]*)([^<>]*)>/g)) {
    rest = rest.replace(match[0], "");
    if (match[0].startsWith("</")) continue;
    const raw = match[2].replace(/\/\s*$/, "");
    const attributes: Record<string, string> = {};
    const leftover = raw.replace(
      /\s+([^\s="']+)="([^"]*)"/g,
      (_pair: string, attribute: string, value: string) => {
        attributes[attribute] = value;
        return "";
      },
    );
    if (leftover.trim() !== "") {
      throw new Error(`Unreadable attributes in <${match[1]}>: ${leftover}`);
    }
    elements.push({ name: match[1], attributes });
  }
  if (rest.trim() !== "") {
    throw new Error(`Text or markup outside the elements: ${rest.trim()}`);
  }
  return elements;
}

export function expectSafeSvg(svg: string): void {
  const body = withoutDeclaration(svg);
  expect(body.trimStart().startsWith("<svg")).toBe(true);
  expect(body).not.toContain("<?");
  expect(body).not.toContain("<!");
  expect(svg.match(/<svg\b/g)).toHaveLength(1);
  expect(svg).not.toMatch(/<script/i);
  expect(svg).not.toMatch(/href/i);
  expect(svg).not.toMatch(/<foreignObject/i);
  expect(svg).not.toMatch(/\son[a-z]+\s*=/i);
  expect(svg).not.toMatch(/<image/i);
  expect(svg).not.toMatch(/data:/i);
  expect(svg).not.toMatch(/<metadata/i);
  expect(svg).not.toMatch(/<pattern/i);
  expect(svg).not.toMatch(/<filter/i);
  for (const { name, attributes } of parseElements(svg)) {
    expect(name, "tool-prefixed element").not.toContain(":");
    for (const attribute of Object.keys(attributes)) {
      expect(attribute, `prefixed attribute in <${name}>`).not.toContain(":");
    }
  }
}

export function rootAttributes(svg: string): Record<string, string> {
  return parseElements(svg)[0].attributes;
}
