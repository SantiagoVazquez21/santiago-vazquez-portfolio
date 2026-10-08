"use client";

import { useAnimationFrame } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { SKILL_GLYPHS, type SkillId } from "@/content/catalog";
import {
  MEDIA_QUERY_CHANGE_EVENT,
  REDUCED_MOTION_QUERY,
  SEED_RANGE,
  advance,
  areaBounds,
  createPlayfield,
  fitToBounds,
  grab,
  hasRoom,
  minAreaHeight,
  moveHeld,
  release,
  toTransform,
  type Bounds,
  type Playfield,
  type Vec,
} from "@/lib/skills-physics";

type SkillsPlaygroundProps = {
  // In the content's order, which is also the order screen readers read (RF-14).
  skillIds: readonly SkillId[];
  names: Readonly<Record<SkillId, string>>;
  // The id of the folder's heading, which names the list (RF-14).
  labelledBy: string;
  // Lives in SkillsExplorer so it survives switching folders and resets on close (RF-9).
  paused: boolean;
};

function writePositions(
  items: ReadonlyMap<number, HTMLLIElement>,
  field: Playfield,
) {
  field.bodies.forEach((body, index) => {
    const item = items.get(index);
    if (item !== undefined) item.style.transform = toTransform(body);
  });
}

// The physics state lives in refs and positions are written straight to each icon's
// transform, so React never renders per frame and the list never changes (plan, D5).
// Icons get no focus, no selection and no role beyond list items (RF-14).
export function SkillsPlayground({
  skillIds,
  names,
  labelledBy,
  paused,
}: SkillsPlaygroundProps) {
  const area = useRef<HTMLUListElement>(null);
  const field = useRef<Playfield | null>(null);
  const bounds = useRef<Bounds>({ width: 0, height: 0 });
  // A state-held Map keeps one instance across renders without reading a ref while rendering.
  const [items] = useState(() => new Map<number, HTMLLIElement>());
  const [minHeight, setMinHeight] = useState(0);
  // Read by the loop on every frame, without rendering.
  const onScreen = useRef(true);
  const reduced = useRef(false);
  // The pointer holding an icon; any other pointer is ignored until it lets go (RF-5).
  const grabPointer = useRef<number | null>(null);
  const count = skillIds.length;

  // Subscribed instead of read once (as motion's useReducedMotion does), so a preference
  // changed with the folder open takes effect on the next frame: same positions, slower or
  // faster from there, no reload and no jump (RF-11, plan D4).
  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    reduced.current = query.matches;
    const onChange = (event: MediaQueryListEvent) => {
      reduced.current = event.matches;
    };
    query.addEventListener(MEDIA_QUERY_CHANGE_EVENT, onChange);
    return () => query.removeEventListener(MEDIA_QUERY_CHANGE_EVENT, onChange);
  }, []);

  // A minimized window (hidden, no box) and an area scrolled out of the body or the screen
  // stop intersecting, so the loop holds the positions (RF-10). A window covered by another
  // still intersects and keeps moving.
  useEffect(() => {
    const element = area.current;
    if (element === null) return;

    const observer = new IntersectionObserver((entries) => {
      const latest = entries[entries.length - 1];
      if (latest !== undefined) onScreen.current = latest.isIntersecting;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // The first measurement creates the start (RF-1); later ones bring back inside whatever
  // a smaller area left out (RF-13). The callback runs after layout and before paint, so
  // no frame shows the icons without their positions.
  useEffect(() => {
    const element = area.current;
    if (element === null) return;

    const observer = new ResizeObserver(([entry]) => {
      const measured: Bounds = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      // Checked after raising the height: a window too low for the area measures it with
      // width but no height and still needs the minimum (RF-12). Minimized has no width
      // either, so bounds and positions stay as they were (RF-10).
      const next = areaBounds(measured, count);
      if (!hasRoom(next)) return;
      setMinHeight(minAreaHeight(count, measured.width));
      bounds.current = next;
      const previous = field.current;
      const current =
        previous === null
          ? createPlayfield(count, next, Math.floor(Math.random() * SEED_RANGE))
          : fitToBounds(previous, next);
      if (current === previous) return;
      field.current = current;
      writePositions(items, current);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [count, items]);

  // A paused, hidden or unmeasured field comes back as the same object: nothing to write
  // (RF-8, RF-10). document.hidden is read here, on every frame, instead of listened to.
  // The observer reports a minimized window only after the first frame without a box, so
  // that frame would still move the icons: the box is also checked here, which is cheap
  // because nothing is pending layout at the start of a frame (RF-10, plan D12 adjusted).
  useAnimationFrame((_, deltaMs) => {
    const current = field.current;
    const element = area.current;
    if (current === null || element === null) return;
    const next = advance(current, deltaMs, bounds.current, {
      paused,
      visible:
        onScreen.current &&
        !document.hidden &&
        element.getClientRects().length > 0,
      reduced: reduced.current,
    });
    if (next === current) return;
    field.current = next;
    writePositions(items, next);
  });

  // Measured on every event: the window may have moved, scrolled or resized since the last one.
  function localPoint(event: PointerEvent<HTMLElement>): Vec | null {
    const element = area.current;
    if (element === null) return null;
    const rect = element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  // No preventDefault, so the press still focuses the window like in 004. Capturing keeps
  // the icon following the pointer outside the area and the window (RF-5, plan D2).
  function handlePointerDown(index: number, event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || grabPointer.current !== null) return;
    const current = field.current;
    const pointer = localPoint(event);
    if (current === null || pointer === null) return;
    const next = grab(current, index, pointer);
    if (next === current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    grabPointer.current = event.pointerId;
    field.current = next;
  }

  // Written here and not only by the loop, so a paused field still follows the pointer (RF-8).
  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerId !== grabPointer.current) return;
    const current = field.current;
    const pointer = localPoint(event);
    if (current === null || pointer === null) return;
    const next = moveHeld(current, pointer, bounds.current);
    if (next === current) return;
    field.current = next;
    writePositions(items, next);
  }

  // Up, cancel or a lost capture (the window minimized or closed mid-drag) all let go the
  // same way: where it is, with the velocity it had before (RF-6). After an up the capture
  // is lost too, but the pointer no longer matches.
  function handlePointerEnd(event: PointerEvent<HTMLElement>) {
    if (event.pointerId !== grabPointer.current) return;
    grabPointer.current = null;
    const current = field.current;
    if (current !== null) field.current = release(current);
  }

  // A Map of elements instead of data-* attributes, which the text lint would flag.
  function registerItem(index: number) {
    return (element: HTMLLIElement | null) => {
      if (element === null) {
        items.delete(index);
      } else {
        items.set(index, element);
      }
    };
  }

  // overflow-hidden keeps any icon from widening the body (RNF-3). h-24 w-24 must match
  // ICON_DIAMETER: a 32 px logo and up to three lines of name fit whole. touch-none only on
  // the icons: a finger on one drags it, a finger on the blank area still scrolls the body.
  return (
    <ul
      ref={area}
      role="list"
      aria-labelledby={labelledBy}
      style={{ minHeight }}
      className="relative mt-2 min-w-0 flex-1 overflow-hidden"
    >
      {skillIds.map((skillId, index) => (
        <li
          key={skillId}
          ref={registerItem(index)}
          onPointerDown={(event) => handlePointerDown(index, event)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onLostPointerCapture={handlePointerEnd}
          className="absolute top-0 left-0 flex h-24 w-24 cursor-grab touch-none flex-col items-center gap-1 text-center text-sm leading-5 select-none will-change-transform active:cursor-grabbing"
        >
          <img
            src={SKILL_GLYPHS[skillId].src}
            alt=""
            width={32}
            height={32}
            draggable={false}
            className="h-8 w-8"
          />
          <span className="max-w-full px-1 break-words">{names[skillId]}</span>
        </li>
      ))}
    </ul>
  );
}
