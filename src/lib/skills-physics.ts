export type Vec = { x: number; y: number };
export type Bounds = { width: number; height: number };
// Center (px) and velocity (px/s).
export type Body = { x: number; y: number; vx: number; vy: number };
// offset = pointer − center when the icon was grabbed.
export type Held = { index: number; offset: Vec };
export type Playfield = { bodies: readonly Body[]; held: Held | null };
export type AdvanceMode = {
  paused: boolean;
  visible: boolean;
  reduced: boolean;
};

// Must match the h-24/w-24 of each icon in SkillsPlayground.
export const ICON_DIAMETER = 96;
export const ICON_RADIUS = ICON_DIAMETER / 2;
export const BASE_SPEED = 60;
export const REDUCED_SPEED_FACTOR = 0.2;
export const MIN_AREA_HEIGHT = 192;
// Half a free row on top of the rows the icons need, so they have room to move (RF-12).
export const FREE_ROOM = ICON_RADIUS;
// A late frame or a tab coming back never advances more than this (RNF-2, RF-10).
export const MAX_FRAME_MS = 50;
export const MIN_AXIS_ANGLE_DEG = 15;
export const MAX_OVERLAP_PX = 2;
export const SEPARATION_PASSES = 8;
export const SEED_RANGE = 2 ** 32;
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
// Here and not in the component, where the text lint would flag the literal (plan, section 8).
export const MEDIA_QUERY_CHANGE_EVENT = "change";

const UINT32_RANGE = 2 ** 32;
const QUADRANTS = 4;
const DEG_TO_RAD = Math.PI / 180;
const MIN_AXIS_ANGLE = MIN_AXIS_ANGLE_DEG * DEG_TO_RAD;
const MAX_AXIS_ANGLE = (90 - MIN_AXIS_ANGLE_DEG) * DEG_TO_RAD;
const TINY = 1e-9;
const CONTACT_DISTANCE = 2 * ICON_RADIUS;

// mulberry32: tiny, fast and deterministic, so tests can replay any start (D9).
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export function columnsFor(width: number): number {
  return Math.max(1, Math.floor(width / ICON_DIAMETER));
}

export function minAreaHeight(count: number, width: number): number {
  const rows = Math.ceil(count / columnsFor(width));
  return Math.max(MIN_AREA_HEIGHT, rows * ICON_DIAMETER + FREE_ROOM);
}

export function areaBounds(measured: Bounds, count: number): Bounds {
  return {
    width: measured.width,
    height: Math.max(measured.height, minAreaHeight(count, measured.width)),
  };
}

// A minimized window measures 0×0; nothing should move or be squeezed then.
export function hasRoom(bounds: Bounds): boolean {
  return bounds.width > 0 && bounds.height > 0;
}

// Each icon gets its own grid cell and never leaves it, so the start has no overlaps (RF-1).
export function createPlayfield(
  count: number,
  bounds: Bounds,
  seed: number,
): Playfield {
  const random = createRandom(seed);
  const cols = columnsFor(bounds.width);
  const rows = Math.ceil(count / cols);
  const cellW = bounds.width / cols;
  const cellH = bounds.height / rows;
  const slackX = Math.max(0, cellW / 2 - ICON_RADIUS);
  const slackY = Math.max(0, cellH / 2 - ICON_RADIUS);
  const angleSpan = 90 - 2 * MIN_AXIS_ANGLE_DEG;

  const bodies: Body[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col + 0.5) * cellW + (random() * 2 - 1) * slackX;
    const y = (row + 0.5) * cellH + (random() * 2 - 1) * slackY;
    const quadrant = Math.floor(random() * QUADRANTS);
    const degrees = quadrant * 90 + MIN_AXIS_ANGLE_DEG + random() * angleSpan;
    const theta = degrees * DEG_TO_RAD;
    bodies.push({
      x,
      y,
      vx: BASE_SPEED * Math.cos(theta),
      vy: BASE_SPEED * Math.sin(theta),
    });
  }
  return { bodies, held: null };
}

function clamp(value: number, min: number, max: number): number {
  // The minimum wins: in an area narrower than an icon, the icon sits at x = R.
  return Math.max(min, Math.min(value, max));
}

function inside(body: Body, bounds: Bounds): Body {
  const x = clamp(body.x, ICON_RADIUS, bounds.width - ICON_RADIUS);
  const y = clamp(body.y, ICON_RADIUS, bounds.height - ICON_RADIUS);
  return x === body.x && y === body.y ? body : { ...body, x, y };
}

function dot(a: Vec, b: Vec): number {
  return a.x * b.x + a.y * b.y;
}

// Equal centers have no direction between them: separate them along x.
function normal(from: Vec, to: Vec): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.hypot(dx, dy);
  return distance > TINY
    ? { x: dx / distance, y: dy / distance }
    : { x: 1, y: 0 };
}

function signOf(value: number): number {
  return value < 0 ? -1 : 1;
}

// An almost straight heading would bounce forever on one line; 15° keeps the DVD look (D7).
export function steerOffAxis(v: Vec): Vec {
  const speed = Math.hypot(v.x, v.y);
  if (speed < TINY) {
    return v;
  }
  const angle = Math.atan2(Math.abs(v.y), Math.abs(v.x));
  if (angle >= MIN_AXIS_ANGLE && angle <= MAX_AXIS_ANGLE) {
    return v;
  }
  const target = angle < MIN_AXIS_ANGLE ? MIN_AXIS_ANGLE : MAX_AXIS_ANGLE;
  return {
    x: signOf(v.x) * speed * Math.cos(target),
    y: signOf(v.y) * speed * Math.sin(target),
  };
}

// Expects v·toward ≤ 0. If the 15° turn heads toward `toward`, its mirror across the same
// axis does not: both failing would need the opposite of what v·toward ≤ 0 already implies.
export function steerAway(v: Vec, toward: Vec): Vec {
  const steered = steerOffAxis(v);
  if (dot(steered, toward) <= 0) {
    return steered;
  }
  return Math.abs(steered.x) < Math.abs(steered.y)
    ? { x: -steered.x, y: steered.y }
    : { x: steered.x, y: -steered.y };
}

// Flips only the part of v that heads toward `toward`, so the speed is kept exactly.
function reflectAway(v: Vec, toward: Vec): Vec {
  const along = dot(v, toward);
  return along > 0
    ? { x: v.x - 2 * along * toward.x, y: v.y - 2 * along * toward.y }
    : v;
}

function turnAway(body: Body, toward: Vec): Body {
  const velocity = { x: body.vx, y: body.vy };
  const next = steerAway(reflectAway(velocity, toward), toward);
  return next === velocity ? body : { ...body, vx: next.x, vy: next.y };
}

// Only directions change, never speeds (D6): an icon never stops or speeds up, and afterwards
// va'·n ≤ 0 ≤ vb'·n, so they no longer approach along the line between their centers.
export function collide(a: Body, b: Body): readonly [Body, Body] {
  const n = normal(a, b);
  if ((a.vx - b.vx) * n.x + (a.vy - b.vy) * n.y <= 0) {
    return [a, b];
  }
  return [turnAway(a, n), turnAway(b, { x: -n.x, y: -n.y })];
}

// The held icon acts as a wall (RF-5): same treatment as a collision, but only the free body
// changes, so it never heads back toward the held one.
export function bounceOff(free: Body, heldCenter: Vec): Body {
  const n = normal(heldCenter, free);
  if (free.vx * n.x + free.vy * n.y >= 0) {
    return free;
  }
  return turnAway(free, { x: -n.x, y: -n.y });
}

// Several passes, because pushing one pair apart can push one of them into a third.
function separate(
  moved: readonly Body[],
  heldIndex: number | undefined,
  bounds: Bounds,
): Body[] {
  const bodies = [...moved];
  for (let pass = 0; pass < SEPARATION_PASSES; pass++) {
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const a = bodies[i];
        const b = bodies[j];
        const distance = Math.hypot(b.x - a.x, b.y - a.y);
        if (distance >= CONTACT_DISTANCE) {
          continue;
        }
        const overlap = CONTACT_DISTANCE - distance;
        if (i === heldIndex || j === heldIndex) {
          // The held body does not move: the free one takes the whole overlap.
          const [held, free, freeIndex] =
            i === heldIndex ? [a, b, j] : [b, a, i];
          const n = normal(held, free);
          bodies[freeIndex] = bounceOff(
            { ...free, x: free.x + n.x * overlap, y: free.y + n.y * overlap },
            held,
          );
          continue;
        }
        const n = normal(a, b);
        const half = overlap / 2;
        [bodies[i], bodies[j]] = collide(
          { ...a, x: a.x - n.x * half, y: a.y - n.y * half },
          { ...b, x: b.x + n.x * half, y: b.y + n.y * half },
        );
      }
    }
    for (let i = 0; i < bodies.length; i++) {
      if (i !== heldIndex) {
        bodies[i] = inside(bodies[i], bounds);
      }
    }
  }
  return bodies;
}

// Walls flip only the perpendicular component, so the angle and speed of a DVD bounce are kept (RF-3).
// The lower wall is checked last: in an area narrower than an icon, x = R wins.
function bounceOffWalls(body: Body, bounds: Bounds): Body {
  let { x, y, vx, vy } = body;
  if (x > bounds.width - ICON_RADIUS) {
    x = bounds.width - ICON_RADIUS;
    vx = -Math.abs(vx);
  }
  if (x < ICON_RADIUS) {
    x = ICON_RADIUS;
    vx = Math.abs(vx);
  }
  if (y > bounds.height - ICON_RADIUS) {
    y = bounds.height - ICON_RADIUS;
    vy = -Math.abs(vy);
  }
  if (y < ICON_RADIUS) {
    y = ICON_RADIUS;
    vy = Math.abs(vy);
  }
  return { x, y, vx, vy };
}

export function step(
  field: Playfield,
  dtSeconds: number,
  bounds: Bounds,
): Playfield {
  if (dtSeconds <= 0 || !hasRoom(bounds)) {
    return field;
  }
  const heldIndex = field.held?.index;
  // The held body keeps its velocity for the release (RF-6); moveHeld owns its position.
  const moved = field.bodies.map((body, i) =>
    i === heldIndex
      ? body
      : bounceOffWalls(
          {
            ...body,
            x: body.x + body.vx * dtSeconds,
            y: body.y + body.vy * dtSeconds,
          },
          bounds,
        ),
  );
  const bodies = separate(moved, heldIndex, bounds);
  if (bodies.every((body, i) => body === field.bodies[i])) {
    return field;
  }
  return { bodies, held: field.held };
}

// Only one icon is held at a time (RF-5): a second pointer does nothing.
export function grab(field: Playfield, index: number, pointer: Vec): Playfield {
  if (
    field.held !== null ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= field.bodies.length
  ) {
    return field;
  }
  const body = field.bodies[index];
  return {
    bodies: field.bodies,
    held: { index, offset: { x: pointer.x - body.x, y: pointer.y - body.y } },
  };
}

// Only the position changes: the velocity is kept for the release (RF-6).
export function moveHeld(
  field: Playfield,
  pointer: Vec,
  bounds: Bounds,
): Playfield {
  const { held } = field;
  if (held === null || !hasRoom(bounds)) {
    return field;
  }
  const body = field.bodies[held.index];
  const next = inside(
    {
      ...body,
      x: pointer.x - held.offset.x,
      y: pointer.y - held.offset.y,
    },
    bounds,
  );
  if (next.x === body.x && next.y === body.y) {
    return field;
  }
  return {
    bodies: field.bodies.map((current, i) =>
      i === held.index ? next : current,
    ),
    held,
  };
}

// No throw: the icon resumes the velocity it had before being grabbed (RF-6).
export function release(field: Playfield): Playfield {
  return field.held === null ? field : { bodies: field.bodies, held: null };
}

export function speedFactor(reduced: boolean): number {
  return reduced ? REDUCED_SPEED_FACTOR : 1;
}

// Paused or out of sight, nothing moves and nothing is lost (RF-8, RF-10). Coming back, the first
// delta can be minutes long: the cap turns it into a single frame of movement (RNF-2, D11).
export function advance(
  field: Playfield,
  dtMs: number,
  bounds: Bounds,
  mode: AdvanceMode,
): Playfield {
  if (mode.paused || !mode.visible || !hasRoom(bounds) || dtMs <= 0) {
    return field;
  }
  const seconds =
    (Math.min(dtMs, MAX_FRAME_MS) / 1000) * speedFactor(mode.reduced);
  return step(field, seconds, bounds);
}

// A minimized window measures 0×0: squeezing everything against the origin would lose the
// positions it must show again on restore (RF-10, RF-13).
export function fitToBounds(field: Playfield, bounds: Bounds): Playfield {
  if (!hasRoom(bounds)) {
    return field;
  }
  const bodies = field.bodies.map((body) => inside(body, bounds));
  if (bodies.every((body, i) => body === field.bodies[i])) {
    return field;
  }
  return { bodies, held: field.held };
}

export function toTransform(body: Body): string {
  return `translate3d(${body.x - ICON_RADIUS}px, ${body.y - ICON_RADIUS}px, 0)`;
}
