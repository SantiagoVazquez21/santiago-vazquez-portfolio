import { describe, expect, it } from "vitest";
import {
  canOpen,
  clickIntent,
  INTENT,
  keyIntent,
  nextSelection,
  OPEN_COOLDOWN_MS,
  type OpenLog,
  recordOpen,
  type Selection,
} from "@/lib/desktop-selection";

describe("INTENT", () => {
  it("names the three intents", () => {
    expect(INTENT).toEqual({ select: "select", open: "open", none: "none" });
  });
});

describe("nextSelection", () => {
  it("selects an icon when nothing was selected (RF-4)", () => {
    expect(
      nextSelection(null, { target: "github", intent: INTENT.select }),
    ).toBe("github");
  });

  it("replaces the previous icon, so there are never two (RF-4)", () => {
    expect(
      nextSelection("github", { target: "resume", intent: INTENT.select }),
    ).toBe("resume");
  });

  it("keeps the same icon when it is selected again", () => {
    expect(
      nextSelection("about", { target: "about", intent: INTENT.select }),
    ).toBe("about");
  });

  it.each<Selection>([null, "projects"])(
    "selects the target when opening (previous: %s) (RF-6)",
    (current) => {
      expect(
        nextSelection(current, { target: "linkedin", intent: INTENT.open }),
      ).toBe("linkedin");
    },
  );

  it.each<Selection>([null, "projects"])(
    "keeps the current selection with none (previous: %s)",
    (current) => {
      expect(
        nextSelection(current, { target: "linkedin", intent: INTENT.none }),
      ).toBe(current);
    },
  );

  it.each<Selection>([null, "contact"])(
    "deselects on a background or title click (previous: %s) (RF-5)",
    (current) => {
      expect(nextSelection(current, { target: null })).toBeNull();
    },
  );

  it("focus selects (RF-10)", () => {
    expect(
      nextSelection("skills", { target: "education", intent: INTENT.select }),
    ).toBe("education");
  });

  it("Space selects through keyIntent (RF-10)", () => {
    expect(
      nextSelection("skills", {
        target: "education",
        intent: keyIntent(" ", false),
      }),
    ).toBe("education");
  });
});

describe("keyIntent", () => {
  it("Enter opens (RF-6, RF-10)", () => {
    expect(keyIntent("Enter", false)).toBe(INTENT.open);
  });

  it("a held Enter does not open again (RF-6)", () => {
    expect(keyIntent("Enter", true)).toBe(INTENT.none);
  });

  it("Space selects (RF-10)", () => {
    expect(keyIntent(" ", false)).toBe(INTENT.select);
  });

  it("a held Space still only selects", () => {
    expect(keyIntent(" ", true)).toBe(INTENT.select);
  });

  it.each(["Tab", "a", "Escape", "ArrowRight", "enter", ""])(
    "any other key (%j) does nothing",
    (key) => {
      expect(keyIntent(key, false)).toBe(INTENT.none);
    },
  );
});

describe("clickIntent", () => {
  it.each([1, 2])("a touch opens (detail %i) (RF-6)", (detail) => {
    expect(clickIntent("touch", detail)).toBe(INTENT.open);
  });

  it.each([1, 2])("a pen counts as a touch and opens (detail %i)", (detail) => {
    expect(clickIntent("pen", detail)).toBe(INTENT.open);
  });

  it.each([1, 2])("a mouse click selects (detail %i) (RF-4)", (detail) => {
    expect(clickIntent("mouse", detail)).toBe(INTENT.select);
  });

  // detail 0 is the click that Enter or element.click() (from dblclick) fires.
  it.each(["mouse", "touch", "pen", null])(
    "detail 0 opens (pointer %j) (RF-6)",
    (pointerType) => {
      expect(clickIntent(pointerType, 0)).toBe(INTENT.open);
    },
  );

  it.each(["", "trackball", "Touch", null])(
    "an unknown or missing pointer selects (%j)",
    (pointerType) => {
      expect(clickIntent(pointerType, 1)).toBe(INTENT.select);
    },
  );
});

describe("OPEN_COOLDOWN_MS", () => {
  it("is 500 ms", () => {
    expect(OPEN_COOLDOWN_MS).toBe(500);
  });
});

describe("canOpen", () => {
  const OPENED_AT = 10_000;
  const log: OpenLog = { github: OPENED_AT };

  it("allows the first open of an icon (RF-6)", () => {
    expect(canOpen({}, "github", OPENED_AT)).toBe(true);
  });

  it.each([0, 499])(
    "blocks the same icon %i ms after its last open (RF-6)",
    (elapsed) => {
      expect(canOpen(log, "github", OPENED_AT + elapsed)).toBe(false);
    },
  );

  it("allows the same icon again 500 ms after its last open", () => {
    expect(canOpen(log, "github", OPENED_AT + 500)).toBe(true);
  });

  it("does not block another icon opened 100 ms later (RF-6)", () => {
    expect(canOpen(log, "linkedin", OPENED_AT + 100)).toBe(true);
  });

  it("does not lock the icon if the clock went backwards", () => {
    expect(canOpen(log, "github", OPENED_AT - 60_000)).toBe(true);
  });
});

describe("recordOpen", () => {
  it("returns a new log with the open, without mutating the previous one", () => {
    const previous: OpenLog = { github: 1_000 };
    const snapshot = { ...previous };
    const next = recordOpen(previous, "resume", 2_000);
    expect(next).not.toBe(previous);
    expect(next).toEqual({ github: 1_000, resume: 2_000 });
    expect(previous).toEqual(snapshot);
  });

  it("replaces the last open of the same icon", () => {
    expect(recordOpen({ github: 1_000 }, "github", 3_000)).toEqual({
      github: 3_000,
    });
  });

  it("blocks the recorded icon right after recording it (RF-6)", () => {
    const log = recordOpen({}, "resume", 5_000);
    expect(canOpen(log, "resume", 5_000)).toBe(false);
    expect(canOpen(log, "resume", 5_000 + OPEN_COOLDOWN_MS)).toBe(true);
  });
});
