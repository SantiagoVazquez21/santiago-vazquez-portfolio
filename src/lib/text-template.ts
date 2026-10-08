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
