import { describe, expect, it } from "vitest";
import {
  type AdvanceMode,
  advance,
  areaBounds,
  BASE_SPEED,
  bounceOff,
  type Bounds,
  collide,
  columnsFor,
  createPlayfield,
  createRandom,
  grab,
  hasRoom,
  ICON_DIAMETER,
  fitToBounds,
  ICON_RADIUS,
  MAX_FRAME_MS,
  MAX_OVERLAP_PX,
  MEDIA_QUERY_CHANGE_EVENT,
  MIN_AREA_HEIGHT,
  MIN_AXIS_ANGLE_DEG,
  minAreaHeight,
  moveHeld,
  type Playfield,
  REDUCED_MOTION_QUERY,
  REDUCED_SPEED_FACTOR,
  release,
  speedFactor,
  steerAway,
  steerOffAxis,
  step,
  toTransform,
  type Body,
  type Vec,
} from "@/lib/skills-physics";

const R = 48;
const EPSILON = 1e-9;
const TOOLS_COUNT = 7;
const AREAS: readonly Bounds[] = [
  { width: 676, height: 192 },
  { width: 320, height: 336 },
  { width: 280, height: 432 },
];

function degreesFromNearestAxis(vx: number, vy: number): number {
  const fromHorizontal =
    (Math.atan2(Math.abs(vy), Math.abs(vx)) * 180) / Math.PI;
  return Math.min(fromHorizontal, 90 - fromHorizontal);
}

function expectValidStart(field: Playfield, count: number, bounds: Bounds) {
  expect(field.held).toBeNull();
  expect(field.bodies).toHaveLength(count);
  for (const body of field.bodies) {
    expect(body.x).toBeGreaterThanOrEqual(R - EPSILON);
    expect(body.x).toBeLessThanOrEqual(bounds.width - R + EPSILON);
    expect(body.y).toBeGreaterThanOrEqual(R - EPSILON);
    expect(body.y).toBeLessThanOrEqual(bounds.height - R + EPSILON);
    expect(Math.hypot(body.vx, body.vy)).toBeCloseTo(BASE_SPEED, 9);
    expect(degreesFromNearestAxis(body.vx, body.vy)).toBeGreaterThanOrEqual(
      MIN_AXIS_ANGLE_DEG - EPSILON,
    );
  }
  for (let i = 0; i < field.bodies.length; i++) {
    for (let j = i + 1; j < field.bodies.length; j++) {
      const a = field.bodies[i];
      const b = field.bodies[j];
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(
        2 * R - EPSILON,
      );
    }
  }
}

describe("constants", () => {
  it("uses the owner's values: 96 px icons, 60 px/s, 0.2 and 192 px (duda 2)", () => {
    expect(ICON_DIAMETER).toBe(96);
    expect(ICON_RADIUS).toBe(R);
    expect(BASE_SPEED).toBe(60);
    expect(REDUCED_SPEED_FACTOR).toBe(0.2);
    expect(MIN_AREA_HEIGHT).toBe(192);
    expect(MIN_AXIS_ANGLE_DEG).toBe(15);
  });

  it("asks the browser for the reduce preference with a valid media query (RF-11)", () => {
    expect(REDUCED_MOTION_QUERY).toBe("(prefers-reduced-motion: reduce)");
  });

  it("listens to the event a media query fires when its match changes (RF-11)", () => {
    expect(MEDIA_QUERY_CHANGE_EVENT).toBe("change");
  });
});

describe("createRandom", () => {
  it("gives the same sequence for the same seed", () => {
    const first = createRandom(42);
    const second = createRandom(42);
    const a = Array.from({ length: 20 }, () => first());
    const b = Array.from({ length: 20 }, () => second());
    expect(a).toEqual(b);
  });

  it("gives a different sequence for a different seed", () => {
    const first = createRandom(1);
    const second = createRandom(2);
    const a = Array.from({ length: 20 }, () => first());
    const b = Array.from({ length: 20 }, () => second());
    expect(a).not.toEqual(b);
  });

  it("stays in [0, 1)", () => {
    for (const seed of [0, 1, 7, 2 ** 31, 2 ** 32 - 1]) {
      const random = createRandom(seed);
      for (let i = 0; i < 1000; i++) {
        const value = random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    }
  });
});

describe("columnsFor", () => {
  it("fits as many 96 px columns as the width allows, at least one", () => {
    expect(columnsFor(676)).toBe(7);
    expect(columnsFor(320)).toBe(3);
    expect(columnsFor(280)).toBe(2);
    expect(columnsFor(96)).toBe(1);
    expect(columnsFor(50)).toBe(1);
    expect(columnsFor(0)).toBe(1);
  });
});

describe("minAreaHeight (RF-12)", () => {
  it("is the rows the icons need plus half a free row, never under 192 px", () => {
    expect(minAreaHeight(TOOLS_COUNT, 676)).toBe(192);
    expect(minAreaHeight(TOOLS_COUNT, 320)).toBe(336);
    expect(minAreaHeight(TOOLS_COUNT, 280)).toBe(432);
    expect(minAreaHeight(TOOLS_COUNT, 50)).toBe(720);
  });

  it("keeps the 192 px floor for a single icon", () => {
    expect(minAreaHeight(1, 676)).toBe(192);
  });
});

describe("areaBounds (RF-12)", () => {
  it("raises the measured height to the minimum", () => {
    expect(areaBounds({ width: 320, height: 100 }, TOOLS_COUNT)).toEqual({
      width: 320,
      height: 336,
    });
  });

  it("never shrinks the measured height", () => {
    expect(areaBounds({ width: 676, height: 500 }, TOOLS_COUNT)).toEqual({
      width: 676,
      height: 500,
    });
  });

  // A window too low for the area measures it with width but no height; only the width
  // tells it apart from a minimized one, so room is checked after raising the height.
  it("gives room to an area with width but no height, not to a minimized one", () => {
    const tooLow = areaBounds({ width: 661, height: 0 }, TOOLS_COUNT);
    // Six columns at 661 px: two rows plus half a free row.
    expect(tooLow).toEqual({ width: 661, height: 240 });
    expect(hasRoom(tooLow)).toBe(true);
    expect(hasRoom(areaBounds({ width: 0, height: 0 }, TOOLS_COUNT))).toBe(
      false,
    );
  });
});

describe("hasRoom", () => {
  it("is false when either side is zero, as in a minimized window", () => {
    expect(hasRoom({ width: 0, height: 0 })).toBe(false);
    expect(hasRoom({ width: 300, height: 0 })).toBe(false);
    expect(hasRoom({ width: 0, height: 300 })).toBe(false);
  });

  it("is true for a measured area", () => {
    expect(hasRoom({ width: 676, height: 192 })).toBe(true);
  });
});

describe("createPlayfield (RF-1)", () => {
  it("gives the same state for the same seed", () => {
    const bounds = AREAS[0];
    expect(createPlayfield(TOOLS_COUNT, bounds, 123)).toEqual(
      createPlayfield(TOOLS_COUNT, bounds, 123),
    );
  });

  it("gives a different state for a different seed", () => {
    const bounds = AREAS[0];
    expect(createPlayfield(TOOLS_COUNT, bounds, 123)).not.toEqual(
      createPlayfield(TOOLS_COUNT, bounds, 456),
    );
  });

  for (const count of [1, 3, 7]) {
    for (const bounds of AREAS) {
      it(`places ${count} icons in ${bounds.width}×${bounds.height} inside, apart, at base speed and off-axis`, () => {
        for (let seed = 1; seed <= 20; seed++) {
          expectValidStart(createPlayfield(count, bounds, seed), count, bounds);
        }
      });
    }
  }
});

describe("step: movement and wall bounces (RF-2, RF-3)", () => {
  const BOUNDS: Bounds = { width: 676, height: 192 };
  const DT = 0.1;

  function single(body: Body): Playfield {
    return { bodies: [body], held: null };
  }

  function expectInside(body: Body, bounds: Bounds) {
    expect(body.x).toBeGreaterThanOrEqual(R);
    expect(body.x).toBeLessThanOrEqual(bounds.width - R);
    expect(body.y).toBeGreaterThanOrEqual(R);
    expect(body.y).toBeLessThanOrEqual(bounds.height - R);
  }

  it("moves a free body in a straight line by its velocity", () => {
    const [moved] = step(
      single({ x: 300, y: 100, vx: 36, vy: -48 }),
      DT,
      BOUNDS,
    ).bodies;
    expect(moved.x).toBeCloseTo(303.6, 9);
    expect(moved.y).toBeCloseTo(95.2, 9);
    expect(moved.vx).toBe(36);
    expect(moved.vy).toBe(-48);
  });

  const walls: readonly {
    name: string;
    body: Body;
    expected: { vx: number; vy: number };
  }[] = [
    {
      name: "left",
      body: { x: R + 1, y: 100, vx: -48, vy: 36 },
      expected: { vx: 48, vy: 36 },
    },
    {
      name: "right",
      body: { x: 676 - R - 1, y: 100, vx: 48, vy: 36 },
      expected: { vx: -48, vy: 36 },
    },
    {
      name: "top",
      body: { x: 300, y: R + 1, vx: 36, vy: -48 },
      expected: { vx: 36, vy: 48 },
    },
    {
      name: "bottom",
      body: { x: 300, y: 192 - R - 1, vx: 36, vy: 48 },
      expected: { vx: 36, vy: -48 },
    },
  ];

  for (const { name, body, expected } of walls) {
    it(`bounces off the ${name} wall: only that axis flips, same speed, stays inside`, () => {
      const [bounced] = step(single(body), DT, BOUNDS).bodies;
      expect(bounced.vx).toBe(expected.vx);
      expect(bounced.vy).toBe(expected.vy);
      expect(Math.hypot(bounced.vx, bounced.vy)).toBeCloseTo(
        Math.hypot(body.vx, body.vy),
        9,
      );
      expectInside(bounced, BOUNDS);
    });
  }

  it("flips both axes in a corner", () => {
    const body: Body = { x: R + 1, y: R + 1, vx: -48, vy: -36 };
    const [bounced] = step(single(body), DT, BOUNDS).bodies;
    expect(bounced.vx).toBe(48);
    expect(bounced.vy).toBe(36);
    expect(bounced.x).toBe(R);
    expect(bounced.y).toBe(R);
  });

  it("keeps the held body still with its velocity untouched", () => {
    const held: Body = { x: 300, y: 100, vx: 36, vy: 48 };
    const free: Body = { x: 500, y: 100, vx: -36, vy: 48 };
    const field: Playfield = {
      bodies: [held, free],
      held: { index: 0, offset: { x: 0, y: 0 } },
    };
    const next = step(field, DT, BOUNDS);
    expect(next.bodies[0]).toBe(held);
    expect(next.bodies[1].x).toBeCloseTo(496.4, 9);
    expect(next.held).toBe(field.held);
  });

  it("returns the same object when the only body is held", () => {
    const field: Playfield = {
      bodies: [{ x: 300, y: 100, vx: 36, vy: 48 }],
      held: { index: 0, offset: { x: 0, y: 0 } },
    };
    expect(step(field, DT, BOUNDS)).toBe(field);
  });

  it("returns the same object for a zero or negative dt", () => {
    const field = createPlayfield(TOOLS_COUNT, BOUNDS, 1);
    expect(step(field, 0, BOUNDS)).toBe(field);
    expect(step(field, -0.016, BOUNDS)).toBe(field);
  });

  it("returns the same object for a 0×0 area, as in a minimized window", () => {
    const field = createPlayfield(TOOLS_COUNT, BOUNDS, 1);
    expect(step(field, DT, { width: 0, height: 0 })).toBe(field);
  });
});

const COS_15 = Math.cos((15 * Math.PI) / 180);
const SIN_15 = Math.sin((15 * Math.PI) / 180);
const FRAME_SECONDS = 0.016;
const FRAME_MS = 16;
const MOVING: AdvanceMode = { paused: false, visible: true, reduced: false };

function expectNear(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(EPSILON);
}

function expectVec(actual: Vec, x: number, y: number) {
  expectNear(actual.x, x);
  expectNear(actual.y, y);
}

function expectVelocity(body: Body, vx: number, vy: number) {
  expectNear(body.vx, vx);
  expectNear(body.vy, vy);
}

describe("steerOffAxis (RF-4)", () => {
  it("turns a horizontal heading to 15° keeping speed and quadrant", () => {
    expectVec(steerOffAxis({ x: 60, y: 0 }), 60 * COS_15, 60 * SIN_15);
  });

  it("turns a vertical heading to 15° from the vertical axis", () => {
    expectVec(steerOffAxis({ x: 0, y: -60 }), 60 * SIN_15, -60 * COS_15);
  });

  it("turns an almost vertical heading to 75° from the horizontal in the same quadrant", () => {
    const steered = steerOffAxis({ x: -3, y: -80 });
    expect(steered.x).toBeLessThan(0);
    expect(steered.y).toBeLessThan(0);
    expectNear(
      (Math.atan2(Math.abs(steered.y), Math.abs(steered.x)) * 180) / Math.PI,
      75,
    );
    expectNear(Math.hypot(steered.x, steered.y), Math.hypot(3, 80));
  });

  it("returns the same object for a heading already off-axis or a still one", () => {
    const offAxis = { x: 30, y: 40 };
    const still = { x: 0, y: 0 };
    expect(steerOffAxis(offAxis)).toBe(offAxis);
    expect(steerOffAxis(still)).toBe(still);
  });
});

describe("steerAway (RF-4)", () => {
  it("keeps the 15° turn when it already moves away", () => {
    expectVec(
      steerAway({ x: -60, y: 0 }, { x: 1, y: 0 }),
      -60 * COS_15,
      60 * SIN_15,
    );
  });

  it("returns the same object for an off-axis heading that moves away", () => {
    const v = { x: -30, y: 40 };
    expect(steerAway(v, { x: 1, y: 0 })).toBe(v);
  });
});

describe("collide (RF-4, D6)", () => {
  // Every case: same speed for each body, positions untouched, and no approach along the normal.
  function collideChecked(a: Body, b: Body): readonly [Body, Body] {
    const result = collide(a, b);
    const [nextA, nextB] = result;
    expectNear(Math.hypot(nextA.vx, nextA.vy), Math.hypot(a.vx, a.vy));
    expectNear(Math.hypot(nextB.vx, nextB.vy), Math.hypot(b.vx, b.vy));
    expect([nextA.x, nextA.y, nextB.x, nextB.y]).toEqual([a.x, a.y, b.x, b.y]);
    const distance = Math.hypot(b.x - a.x, b.y - a.y);
    const n =
      distance > EPSILON
        ? { x: (b.x - a.x) / distance, y: (b.y - a.y) / distance }
        : { x: 1, y: 0 };
    expect(
      (nextA.vx - nextB.vx) * n.x + (nextA.vy - nextB.vy) * n.y,
    ).toBeLessThanOrEqual(EPSILON);
    return result;
  }

  it("head-on: both reflect", () => {
    const [a, b] = collideChecked(
      { x: 100, y: 100, vx: 40, vy: 30 },
      { x: 194, y: 100, vx: -40, vy: 30 },
    );
    expectVelocity(a, -40, 30);
    expectVelocity(b, 40, 30);
  });

  it("oblique: A reflects and the almost horizontal reflection of B turns to 15° away from A", () => {
    const [a, b] = collideChecked(
      { x: 200, y: 150, vx: 22, vy: 46 },
      { x: 256.4, y: 225.2, vx: 12, vy: -34 },
    );
    expectVelocity(a, -38, -34);
    const speedB = Math.sqrt(1300);
    expectVelocity(b, speedB * COS_15, -speedB * SIN_15);
  });

  it("catching up: only the one moving toward the other changes", () => {
    const [a, b] = collideChecked(
      { x: 100, y: 100, vx: 60, vy: 20 },
      { x: 194, y: 100, vx: 20, vy: 30 },
    );
    expectVelocity(a, -60, 20);
    expectVelocity(b, 20, 30);
  });

  it("perpendicular: none is left still, both leave at 60 px/s", () => {
    const [a, b] = collideChecked(
      { x: 100, y: 100, vx: 60, vy: 0 },
      { x: 194, y: 100, vx: 0, vy: 60 },
    );
    expectVelocity(a, -60 * COS_15, 60 * SIN_15);
    expectVelocity(b, 60 * SIN_15, 60 * COS_15);
  });

  it("mirrors the 15° turn when the usual one would move toward the other", () => {
    const [a, b] = collideChecked(
      { x: 100, y: 100, vx: -37, vy: 15 },
      { x: 118, y: 180, vx: 0, vy: -40 },
    );
    const speedA = Math.sqrt(1594);
    expectVelocity(a, -speedA * COS_15, -speedA * SIN_15);
    expectVelocity(b, 28800 / 1681, 60760 / 1681);
  });

  it("turns almost straight headings to 15° after the reflection", () => {
    const [a, b] = collideChecked(
      { x: 100, y: 100, vx: 50, vy: 5 },
      { x: 194, y: 100, vx: -50, vy: 5 },
    );
    const speed = Math.sqrt(2525);
    expectVelocity(a, -speed * COS_15, speed * SIN_15);
    expectVelocity(b, speed * COS_15, speed * SIN_15);
  });

  it("returns the same objects when they already move apart, even touching", () => {
    const a: Body = { x: 100, y: 100, vx: -40, vy: 30 };
    const b: Body = { x: 194, y: 100, vx: 40, vy: 30 };
    const [nextA, nextB] = collide(a, b);
    expect(nextA).toBe(a);
    expect(nextB).toBe(b);
  });

  it("uses the normal (1, 0) for equal centers", () => {
    const [a, b] = collideChecked(
      { x: 100, y: 100, vx: 30, vy: 40 },
      { x: 100, y: 100, vx: -30, vy: 40 },
    );
    expectVelocity(a, -30, 40);
    expectVelocity(b, 30, 40);
  });
});

function maxOverlap(bodies: readonly Body[]): number {
  let worst = 0;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const distance = Math.hypot(
        bodies[j].x - bodies[i].x,
        bodies[j].y - bodies[i].y,
      );
      worst = Math.max(worst, 2 * R - distance);
    }
  }
  return worst;
}

describe("step: collisions and separation (RF-2, RF-4, RNF-2)", () => {
  it("separates two overlapping free bodies and makes them bounce apart", () => {
    const field: Playfield = {
      bodies: [
        { x: 100, y: 100, vx: 40, vy: 30 },
        { x: 180, y: 100, vx: -40, vy: 30 },
      ],
      held: null,
    };
    const [a, b] = step(field, FRAME_SECONDS, {
      width: 676,
      height: 192,
    }).bodies;
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeGreaterThanOrEqual(
      2 * R - MAX_OVERLAP_PX,
    );
    expectVelocity(a, -40, 30);
    expectVelocity(b, 40, 30);
  });

  for (const bounds of AREAS) {
    it(`keeps 7 bodies inside, apart and at base speed for 2000 advance frames in ${bounds.width}×${bounds.height}`, () => {
      const problems: string[] = [];
      for (let seed = 1; seed <= 5; seed++) {
        let field = createPlayfield(TOOLS_COUNT, bounds, seed);
        for (let frame = 0; frame < 2000 && problems.length === 0; frame++) {
          field = advance(field, FRAME_MS, bounds, MOVING);
          const overlap = maxOverlap(field.bodies);
          if (overlap > MAX_OVERLAP_PX) {
            problems.push(`seed ${seed} frame ${frame}: overlap ${overlap}`);
          }
          for (const body of field.bodies) {
            const outside =
              body.x < R ||
              body.x > bounds.width - R ||
              body.y < R ||
              body.y > bounds.height - R;
            const speedError =
              Math.abs(Math.hypot(body.vx, body.vy) - BASE_SPEED) / BASE_SPEED;
            if (outside || speedError > EPSILON) {
              problems.push(
                `seed ${seed} frame ${frame}: ${JSON.stringify(body)}`,
              );
            }
          }
        }
      }
      expect(problems).toEqual([]);
    });
  }

  it("clears two 40 px overlaps in 31 frames (0.5 s)", () => {
    const bounds: Bounds = { width: 320, height: 336 };
    const start = createPlayfield(TOOLS_COUNT, bounds, 1);
    const [first] = start.bodies;
    const gap = 2 * R - 40;
    // Body 1 over body 0 and body 2 over body 1, in a row.
    let field: Playfield = {
      bodies: start.bodies.map((body, i) =>
        i === 1 || i === 2
          ? { ...body, x: first.x + i * gap, y: first.y }
          : body,
      ),
      held: null,
    };
    expect(maxOverlap(field.bodies)).toBeCloseTo(40, 9);
    for (let frame = 0; frame < 31; frame++) {
      field = advance(field, FRAME_MS, bounds, MOVING);
    }
    expect(maxOverlap(field.bodies)).toBeLessThanOrEqual(MAX_OVERLAP_PX);
  });
});

describe("bounceOff (RF-5)", () => {
  const HELD_CENTER: Vec = { x: 100, y: 100 };

  // Every case: same speed, position untouched, and never heading back toward the held icon.
  function bounceChecked(free: Body, heldCenter: Vec = HELD_CENTER): Body {
    const bounced = bounceOff(free, heldCenter);
    expectNear(
      Math.hypot(bounced.vx, bounced.vy),
      Math.hypot(free.vx, free.vy),
    );
    expect([bounced.x, bounced.y]).toEqual([free.x, free.y]);
    const distance = Math.hypot(free.x - heldCenter.x, free.y - heldCenter.y);
    const n = {
      x: (free.x - heldCenter.x) / distance,
      y: (free.y - heldCenter.y) / distance,
    };
    expect(bounced.vx * n.x + bounced.vy * n.y).toBeGreaterThanOrEqual(
      -EPSILON,
    );
    return bounced;
  }

  it("reflects a body heading into the held one, as off a wall", () => {
    const bounced = bounceChecked({ x: 194, y: 100, vx: -40, vy: 30 });
    expectVelocity(bounced, 40, 30);
  });

  it("returns the same object when the body already moves away", () => {
    const free: Body = { x: 194, y: 100, vx: 40, vy: 30 };
    expect(bounceOff(free, HELD_CENTER)).toBe(free);
  });

  it("turns an almost straight heading to 15° after the reflection", () => {
    const bounced = bounceChecked({ x: 194, y: 100, vx: -60, vy: 0 });
    expectVelocity(bounced, 60 * COS_15, 60 * SIN_15);
  });

  it("mirrors the 15° turn when the usual one would head back toward the held one", () => {
    const bounced = bounceChecked(
      { x: 100, y: 100, vx: -37, vy: 15 },
      { x: 118, y: 180 },
    );
    const speed = Math.sqrt(1594);
    expectVelocity(bounced, -speed * COS_15, -speed * SIN_15);
  });
});

describe("dragging: grab, moveHeld and release (RF-5, RF-6)", () => {
  const BOUNDS: Bounds = { width: 676, height: 192 };

  function twoBodies(): Playfield {
    return {
      bodies: [
        { x: 200, y: 96, vx: 36, vy: 48 },
        { x: 500, y: 96, vx: -36, vy: 48 },
      ],
      held: null,
    };
  }

  it("grab stores the pointer offset from the center and moves nothing", () => {
    const field = twoBodies();
    const grabbed = grab(field, 1, { x: 510, y: 90 });
    expect(grabbed.held).toEqual({ index: 1, offset: { x: 10, y: -6 } });
    expect(grabbed.bodies).toBe(field.bodies);
  });

  it("a second grab while one is held returns the same object", () => {
    const grabbed = grab(twoBodies(), 0, { x: 200, y: 96 });
    expect(grab(grabbed, 1, { x: 500, y: 96 })).toBe(grabbed);
    expect(grab(grabbed, 0, { x: 210, y: 96 })).toBe(grabbed);
  });

  it("grab with an index out of range returns the same object", () => {
    const field = twoBodies();
    expect(grab(field, 2, { x: 0, y: 0 })).toBe(field);
    expect(grab(field, -1, { x: 0, y: 0 })).toBe(field);
  });

  it("moveHeld follows the pointer minus the offset and keeps the velocity", () => {
    const grabbed = grab(twoBodies(), 1, { x: 510, y: 90 });
    const moved = moveHeld(grabbed, { x: 410, y: 110 }, BOUNDS);
    expect(moved.bodies[1]).toEqual({ x: 400, y: 116, vx: -36, vy: 48 });
    expect(moved.bodies[0]).toBe(grabbed.bodies[0]);
    expect(moved.held).toBe(grabbed.held);
  });

  it("moveHeld with the pointer outside the area leaves the icon at the nearest edge", () => {
    const grabbed = grab(twoBodies(), 1, { x: 510, y: 90 });
    const right = moveHeld(grabbed, { x: 2000, y: 100 }, BOUNDS).bodies[1];
    expect([right.x, right.y]).toEqual([676 - R, 106]);
    const corner = moveHeld(grabbed, { x: -300, y: -300 }, BOUNDS).bodies[1];
    expect([corner.x, corner.y]).toEqual([R, R]);
  });

  it("moveHeld returns the same object with nothing held, a 0×0 area or no change", () => {
    const field = twoBodies();
    expect(moveHeld(field, { x: 300, y: 100 }, BOUNDS)).toBe(field);
    const grabbed = grab(field, 1, { x: 510, y: 90 });
    expect(moveHeld(grabbed, { x: 300, y: 100 }, { width: 0, height: 0 })).toBe(
      grabbed,
    );
    expect(moveHeld(grabbed, { x: 510, y: 90 }, BOUNDS)).toBe(grabbed);
  });

  it("release drops the held icon without changing any body", () => {
    const grabbed = grab(twoBodies(), 1, { x: 510, y: 90 });
    const released = release(grabbed);
    expect(released.held).toBeNull();
    expect(released.bodies).toBe(grabbed.bodies);
  });

  it("release with nothing held returns the same object", () => {
    const field = twoBodies();
    expect(release(field)).toBe(field);
  });

  it("after dragging and releasing, the velocity is exactly the one before grabbing (no throw)", () => {
    const bounds: Bounds = { width: 320, height: 336 };
    const start = createPlayfield(TOOLS_COUNT, bounds, 3);
    const before = start.bodies[2];
    let field = grab(start, 2, { x: before.x + 5, y: before.y - 5 });
    for (let frame = 0; frame < 100; frame++) {
      const pointer = {
        x: 160 + 120 * Math.cos(frame / 7),
        y: 168 + 140 * Math.sin(frame / 5),
      };
      field = step(moveHeld(field, pointer, bounds), FRAME_SECONDS, bounds);
    }
    field = release(field);
    expect(field.held).toBeNull();
    expect(field.bodies[2].vx).toBe(before.vx);
    expect(field.bodies[2].vy).toBe(before.vy);
  });
});

describe("step: the held icon as a wall (RF-4, RF-5)", () => {
  const BOUNDS: Bounds = { width: 676, height: 192 };

  it("pushes an overlapping free body out by the full overlap and bounces it off", () => {
    const held: Body = { x: 300, y: 96, vx: 36, vy: 48 };
    const field: Playfield = {
      bodies: [held, { x: 380, y: 96, vx: -36, vy: 48 }],
      held: { index: 0, offset: { x: 0, y: 0 } },
    };
    const [still, free] = step(field, FRAME_SECONDS, BOUNDS).bodies;
    expect(still).toBe(held);
    expect(Math.hypot(free.x - held.x, free.y - held.y)).toBeGreaterThanOrEqual(
      2 * R - MAX_OVERLAP_PX,
    );
    expectNear(Math.hypot(free.vx, free.vy), 60);
    expect(free.vx).toBeGreaterThan(0);
  });

  it("works the same when the held icon comes after the free one", () => {
    const held: Body = { x: 380, y: 96, vx: 36, vy: 48 };
    const field: Playfield = {
      bodies: [{ x: 300, y: 96, vx: 36, vy: 48 }, held],
      held: { index: 1, offset: { x: 0, y: 0 } },
    };
    const [free, still] = step(field, FRAME_SECONDS, BOUNDS).bodies;
    expect(still).toBe(held);
    expect(Math.hypot(free.x - held.x, free.y - held.y)).toBeGreaterThanOrEqual(
      2 * R - MAX_OVERLAP_PX,
    );
    expectNear(Math.hypot(free.vx, free.vy), 60);
    expect(free.vx).toBeLessThan(0);
  });

  it("a free body driven against the held one never sinks into it and keeps its speed", () => {
    const held: Body = { x: 338, y: 96, vx: 0, vy: 0 };
    let field: Playfield = {
      bodies: [held, { x: 500, y: 60, vx: -60 * COS_15, vy: 60 * SIN_15 }],
      held: { index: 0, offset: { x: 0, y: 0 } },
    };
    let bounced = false;
    for (let frame = 0; frame < 200; frame++) {
      field = step(field, FRAME_SECONDS, BOUNDS);
      const [still, free] = field.bodies;
      expect(still).toBe(held);
      expect(
        Math.hypot(free.x - held.x, free.y - held.y),
      ).toBeGreaterThanOrEqual(2 * R - MAX_OVERLAP_PX);
      expectNear(Math.hypot(free.vx, free.vy), 60);
      bounced ||= free.vx > 0;
    }
    expect(bounced).toBe(true);
  });

  it("chain push: the pushed bodies stay inside and separate within 31 frames after release", () => {
    const bounds: Bounds = { width: 400, height: 192 };
    // Three in a row, the last one against the right wall.
    let field: Playfield = {
      bodies: [
        { x: 400 - 5 * R, y: 96, vx: 36, vy: 48 },
        { x: 400 - 3 * R, y: 96, vx: -36, vy: 48 },
        { x: 400 - R, y: 96, vx: 36, vy: -48 },
      ],
      held: null,
    };
    const pointer = { x: field.bodies[0].x + 4, y: 100 };
    field = grab(field, 0, pointer);
    for (let k = 1; k <= 10; k++) {
      field = moveHeld(field, { x: pointer.x + 6 * k, y: pointer.y }, bounds);
      field = step(field, FRAME_SECONDS, bounds);
      for (const body of field.bodies) {
        expect(body.x).toBeGreaterThanOrEqual(R);
        expect(body.x).toBeLessThanOrEqual(bounds.width - R);
        expect(body.y).toBeGreaterThanOrEqual(R);
        expect(body.y).toBeLessThanOrEqual(bounds.height - R);
      }
    }
    expect(field.bodies[0].x).toBeCloseTo(400 - 5 * R + 60, 9);
    field = release(field);
    for (let frame = 0; frame < 31; frame++) {
      field = advance(field, FRAME_MS, bounds, MOVING);
    }
    expect(maxOverlap(field.bodies)).toBeLessThanOrEqual(MAX_OVERLAP_PX);
  });
});

describe("speedFactor (RF-11)", () => {
  it("is 1 normally and the slow factor when reduced motion is requested", () => {
    expect(speedFactor(false)).toBe(1);
    expect(speedFactor(true)).toBe(REDUCED_SPEED_FACTOR);
  });
});

describe("advance (RF-8, RF-10, RF-11, RNF-2)", () => {
  const BOUNDS: Bounds = { width: 676, height: 192 };

  function lone(): Playfield {
    return { bodies: [{ x: 300, y: 96, vx: 36, vy: 48 }], held: null };
  }

  function displacement(from: Playfield, to: Playfield): number {
    const [a] = from.bodies;
    const [b] = to.bodies;
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  it("matches a step of the same time while moving", () => {
    const field = createPlayfield(TOOLS_COUNT, BOUNDS, 1);
    expect(advance(field, FRAME_MS, BOUNDS, MOVING)).toEqual(
      step(field, FRAME_SECONDS, BOUNDS),
    );
  });

  it("returns the same object while paused", () => {
    const field = createPlayfield(TOOLS_COUNT, BOUNDS, 1);
    expect(advance(field, FRAME_MS, BOUNDS, { ...MOVING, paused: true })).toBe(
      field,
    );
  });

  it("returns the same object while the area is not visible", () => {
    const field = createPlayfield(TOOLS_COUNT, BOUNDS, 1);
    expect(
      advance(field, FRAME_MS, BOUNDS, { ...MOVING, visible: false }),
    ).toBe(field);
  });

  it("returns the same object for a 0×0 area or a zero or negative time", () => {
    const field = createPlayfield(TOOLS_COUNT, BOUNDS, 1);
    expect(advance(field, FRAME_MS, { width: 0, height: 0 }, MOVING)).toBe(
      field,
    );
    expect(advance(field, 0, BOUNDS, MOVING)).toBe(field);
    expect(advance(field, -FRAME_MS, BOUNDS, MOVING)).toBe(field);
  });

  it("after 100 hidden frames and a 5000 ms visible one, equals a single 50 ms advance", () => {
    const start = createPlayfield(TOOLS_COUNT, BOUNDS, 2);
    let field = start;
    for (let frame = 0; frame < 100; frame++) {
      field = advance(field, FRAME_MS, BOUNDS, { ...MOVING, visible: false });
    }
    expect(field).toBe(start);
    field = advance(field, 5000, BOUNDS, MOVING);
    expect(field).toEqual(advance(start, MAX_FRAME_MS, BOUNDS, MOVING));
  });

  it("moves 0.2 times as far with reduced motion", () => {
    const field = lone();
    const normal = displacement(
      field,
      advance(field, FRAME_MS, BOUNDS, MOVING),
    );
    const slow = displacement(
      field,
      advance(field, FRAME_MS, BOUNDS, { ...MOVING, reduced: true }),
    );
    expectNear(normal, BASE_SPEED * FRAME_SECONDS);
    expectNear(slow, REDUCED_SPEED_FACTOR * normal);
  });

  it("caps a late frame at 50 ms: 5000 ms moves a lone body as far as 50 ms, at most 3 px", () => {
    const field = lone();
    const late = advance(field, 5000, BOUNDS, MOVING);
    expect(late).toEqual(advance(field, MAX_FRAME_MS, BOUNDS, MOVING));
    expect(displacement(field, late)).toBeLessThanOrEqual(3 + EPSILON);
  });
});

describe("fitToBounds (RF-13)", () => {
  const LARGE: Bounds = { width: 676, height: 336 };
  const SMALL: Bounds = { width: 300, height: 192 };

  function expectAllInside(field: Playfield, bounds: Bounds) {
    for (const body of field.bodies) {
      expect(body.x).toBeGreaterThanOrEqual(R);
      expect(body.x).toBeLessThanOrEqual(bounds.width - R);
      expect(body.y).toBeGreaterThanOrEqual(R);
      expect(body.y).toBeLessThanOrEqual(bounds.height - R);
    }
  }

  it("brings every body inside when the area shrinks, the held one too, keeping velocities", () => {
    const start = createPlayfield(TOOLS_COUNT, LARGE, 4);
    const farthest = start.bodies.reduce(
      (best, body, i) => (body.x > start.bodies[best].x ? i : best),
      0,
    );
    const held = grab(start, farthest, {
      x: start.bodies[farthest].x,
      y: start.bodies[farthest].y,
    });
    expect(held.bodies[farthest].x).toBeGreaterThan(SMALL.width - R);
    const fitted = fitToBounds(held, SMALL);
    expectAllInside(fitted, SMALL);
    expect(fitted.bodies[farthest].x).toBe(SMALL.width - R);
    expect(fitted.held).toBe(held.held);
    fitted.bodies.forEach((body, i) => {
      expect([body.vx, body.vy]).toEqual([
        start.bodies[i].vx,
        start.bodies[i].vy,
      ]);
    });
  });

  it("returns the same object when nothing is outside", () => {
    // 336 px is the height areaBounds gives 7 icons at 300 px wide.
    const fitting: Bounds = { width: 300, height: 336 };
    const field = createPlayfield(TOOLS_COUNT, fitting, 4);
    expect(fitToBounds(field, fitting)).toBe(field);
    expect(fitToBounds(field, LARGE)).toBe(field);
  });

  it("returns the same object for a 0×0 area, so a minimized window keeps its positions", () => {
    const field = createPlayfield(TOOLS_COUNT, LARGE, 4);
    expect(fitToBounds(field, { width: 0, height: 0 })).toBe(field);
  });

  it("puts every body at x = R in an area narrower than an icon", () => {
    const field = createPlayfield(TOOLS_COUNT, LARGE, 4);
    const fitted = fitToBounds(field, { width: 50, height: 720 });
    for (const body of fitted.bodies) {
      expect(body.x).toBe(R);
      expect(body.y).toBeGreaterThanOrEqual(R);
      expect(body.y).toBeLessThanOrEqual(720 - R);
    }
  });
});

describe("toTransform", () => {
  it("places the icon's top-left corner one radius before its center", () => {
    expect(toTransform({ x: 100, y: 60, vx: 36, vy: 48 })).toBe(
      "translate3d(52px, 12px, 0)",
    );
  });
});
