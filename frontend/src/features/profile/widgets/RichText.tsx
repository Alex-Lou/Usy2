import { Fragment, type ReactNode } from "react";

// Safe, whitelisted inline formatting. We build React nodes ourselves (never
// dangerouslySetInnerHTML), so stored text can only ever produce the marks
// below — no HTML/script injection is possible.
//   **bold**  *italic*  [texte](https://lien)  + line breaks
const TOKEN = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\))/g;

function safeHref(url: string): string | undefined {
  return /^https?:\/\//i.test(url) ? url : undefined;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      nodes.push(<strong key={key}>{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      nodes.push(<em key={key}>{m[3]}</em>);
    } else if (m[4] !== undefined) {
      const href = safeHref(m[5]);
      nodes.push(
        href ? (
          <a key={key} href={href} target="_blank" rel="noreferrer noopener" className="text-primary underline">
            {m[4]}
          </a>
        ) : (
          m[4]
        ),
      );
    }
    last = m.index + m[0].length;
    key += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function RichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="rounded-token border border-border bg-surface px-4 py-3 text-text">
      {lines.map((line, i) => (
        <Fragment key={i}>
          {renderInline(line)}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </div>
  );
}
