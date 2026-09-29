import { Fragment } from "react";

interface TitleWithEmphasisProps {
  title: string;
}

/**
 * Renders a title with its final word wrapped in `<em>`, reproducing the
 * source's `title.replace(/(\w+)$/, '<em>$1</em>')`. Done with JSX (no
 * `dangerouslySetInnerHTML`) so the emphasised word is safely escaped.
 */
export function TitleWithEmphasis({ title }: TitleWithEmphasisProps) {
  const match = title.match(/^(.*?)(\w+)$/s);

  if (!match) {
    return <Fragment>{title}</Fragment>;
  }

  const [, head, lastWord] = match;
  return (
    <Fragment>
      {head}
      <em>{lastWord}</em>
    </Fragment>
  );
}
