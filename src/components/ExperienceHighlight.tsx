type ExperienceHighlightProps = {
  text: string;
  id?: string;
};

// A solid 2 px border on all four sides tells the achievement apart from the dotted tag and
// the sunken chips, also in greyscale (spec 011, RF-3). It draws no caption: the card shows
// it alone and the detail puts its own heading above it.
export function ExperienceHighlight({ text, id }: ExperienceHighlightProps) {
  return (
    <p id={id} className="border-2 border-[#000080] bg-white px-2 py-1">
      {text}
    </p>
  );
}
