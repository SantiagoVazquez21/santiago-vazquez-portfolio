const TEMPLATE_KEY = /\{(\w+)\}/g;

// A missing key throws: an accessible name reading "{project}" aloud is worse than a failing test (RF-4).
export function fillTemplate(
  template: string,
  values: Readonly<Record<string, string>>,
): string {
  return template.replace(TEMPLATE_KEY, (_match, key: string) => {
    if (!Object.hasOwn(values, key)) {
      throw new Error(`Missing template value for "{${key}}"`);
    }
    return values[key];
  });
}

// Splits around a single {key} so a component can place an element (a link) in between (spec 005, RF-8).
export function splitTemplate(
  template: string,
  key: string,
): { before: string; after: string } {
  const parts = template.split(`{${key}}`);
  if (parts.length !== 2) {
    throw new Error(`Expected "{${key}}" exactly once in the template`);
  }
  return { before: parts[0], after: parts[1] };
}
