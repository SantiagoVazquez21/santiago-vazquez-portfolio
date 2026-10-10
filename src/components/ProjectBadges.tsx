type BadgeListProps = {
  items: readonly string[];
  // One id per item, in order: the card's aria-describedby points at each <li> so the
  // browser joins them with a space and no two badges run together (spec 008, D8).
  itemIds?: readonly string[];
};

type ContextTagListProps = BadgeListProps & {
  label: string;
};

// The detail names the list with its visible heading; the card, which has none, with a label.
type TechnologyChipListProps = BadgeListProps &
  (
    | { label: string; labelledBy?: never }
    | { labelledBy: string; label?: never }
  );

// Tags and chips differ by their border (dotted versus sunken), not only by colour
// (spec 008, RF-2; spec 011, RF-2).
// Neither is focusable: they only describe the card (spec 008, RF-9; spec 011, RF-2).
// role="list" keeps the list semantics that Safari drops from lists without bullets.
export function ContextTagList({ items, itemIds, label }: ContextTagListProps) {
  return (
    <ul role="list" aria-label={label} className="flex flex-wrap gap-1">
      {items.map((item, index) => (
        <li
          key={item}
          id={itemIds?.[index]}
          className="border border-dotted border-[#000080] px-1 text-sm text-[#000080]"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export function TechnologyChipList({
  items,
  itemIds,
  label,
  labelledBy,
}: TechnologyChipListProps) {
  return (
    <ul
      role="list"
      aria-label={label}
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-1"
    >
      {items.map((item, index) => (
        <li
          key={item}
          id={itemIds?.[index]}
          className="border border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white px-1 text-sm"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

type TagProps = {
  id?: string;
  children: string;
};

// A single tag, such as a job's modality (spec 011, plan D5): no list to name and no
// "list, 1 item" announced. Its classes repeat ContextTagList's <li> letter by letter, plus
// self-start so it does not stretch in a flex column; they cannot be shared through a
// constant because no-hardcoded-text rejects it (spec 011, plan D11).
export function Tag({ id, children }: TagProps) {
  return (
    <p
      id={id}
      className="border border-dotted border-[#000080] px-1 text-sm text-[#000080] self-start"
    >
      {children}
    </p>
  );
}
