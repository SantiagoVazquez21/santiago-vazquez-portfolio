import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "@/i18n";
import { compareDictionaries } from "@/lib/dictionaries";

describe("real dictionaries", () => {
  it("have the same keys at every level and no empty texts", () => {
    expect(
      compareDictionaries(
        { name: "es", tree: DICTIONARIES.es },
        { name: "en", tree: DICTIONARIES.en },
      ),
    ).toEqual([]);
  });
});
