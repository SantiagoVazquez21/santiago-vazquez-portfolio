import { Fragment } from "react";

type SeparatedItemsProps = {
  items: readonly string[];
  separator: string;
  // Given: the items are a list named by that element (RF-13). Absent: one line of text.
  labelledBy?: string;
};

// The separator is decorative (spec 004, D6): screen readers never announce it.
// role="list" keeps the list semantics that Safari drops from lists without bullets.
export function SeparatedItems({
  items,
  separator,
  labelledBy,
}: SeparatedItemsProps) {
  if (labelledBy !== undefined) {
    return (
      <ul role="list" aria-labelledby={labelledBy}>
        {items.map((item, index) => (
          <li key={index} className="inline">
            {index > 0 && <span aria-hidden="true">{separator}</span>}
            {item}
          </li>
        ))}
      </ul>
    );
  }
  // The blank outside the hidden separator keeps the fields apart when it is read aloud.
  return (
    <p>
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && (
            <>
              {" "}
              <span aria-hidden="true">{separator}</span>
            </>
          )}
          {item}
        </Fragment>
      ))}
    </p>
  );
}
