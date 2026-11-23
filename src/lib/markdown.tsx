import type { ReactNode } from 'react';

/**
 * Tiny, dependency-free markdown renderer for task notes.
 * Supports: # / ## / ### headings, - and 1. lists (with - [ ] / - [x] checkboxes),
 * > quotes, ``` code fences, **bold**, *italic*, `code` and [text](https://link).
 * It builds React elements (no innerHTML), and only http(s) links are rendered as links.
 */

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;
const LINK = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text
    .split(INLINE)
    .filter((part) => part !== '')
    .map((part, i): ReactNode => {
      const key = `${keyPrefix}-${i}`;
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={key} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={key} className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[0.85em] text-neutral-800">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={key} className="italic">
            {part.slice(1, -1)}
          </em>
        );
      }
      const link = LINK.exec(part);
      if (link) {
        return (
          <a
            key={key}
            href={link[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline decoration-blue-700/30 underline-offset-2 hover:text-blue-800"
          >
            {link[1]}
          </a>
        );
      }
      return part;
    });
}

const BULLET = /^\s*[-*]\s+(.*)$/;
const ORDERED = /^\s*\d+\.\s+(.*)$/;
const HEADING = /^(#{1,3})\s+(.*)$/;
const CHECKBOX = /^\[( |x|X)\]\s+(.*)$/;

function startsNewBlock(line: string): boolean {
  return (
    line.startsWith('```') ||
    HEADING.test(line) ||
    BULLET.test(line) ||
    ORDERED.test(line) ||
    line.startsWith('>')
  );
}

function renderListItem(raw: string, key: string): ReactNode {
  const checkbox = CHECKBOX.exec(raw);
  if (checkbox) {
    const checked = checkbox[1] !== ' ';
    return (
      <li key={key} className="list-none">
        <span aria-hidden className={`mr-2 ${checked ? 'text-neutral-700' : 'text-neutral-400'}`}>
          {checked ? '☑' : '☐'}
        </span>
        <span className={checked ? 'text-neutral-400 line-through' : undefined}>
          {renderInline(checkbox[2], key)}
        </span>
      </li>
    );
  }
  return <li key={key}>{renderInline(raw, key)}</li>;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${i}`;

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (line.startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      i++; // closing fence (or end of input)
      blocks.push(
        <pre
          key={key}
          className="overflow-x-auto rounded-md bg-neutral-100 p-3 font-mono text-xs leading-relaxed text-neutral-800"
        >
          <code>{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      const cls =
        level === 1
          ? 'text-lg font-semibold text-ink'
          : level === 2
            ? 'text-base font-semibold text-ink'
            : 'text-sm font-semibold text-neutral-500';
      blocks.push(
        <p key={key} role="heading" aria-level={level} className={cls}>
          {renderInline(heading[2], key)}
        </p>,
      );
      i++;
      continue;
    }

    if (BULLET.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length) {
        const m = BULLET.exec(lines[i]);
        if (!m) break;
        items.push(renderListItem(m[1], `${key}-${i}`));
        i++;
      }
      blocks.push(
        <ul key={key} className="list-disc space-y-1 pl-5 marker:text-neutral-400">
          {items}
        </ul>,
      );
      continue;
    }

    if (ORDERED.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length) {
        const m = ORDERED.exec(lines[i]);
        if (!m) break;
        items.push(<li key={`${key}-${i}`}>{renderInline(m[1], `${key}-${i}`)}</li>);
        i++;
      }
      blocks.push(
        <ol key={key} className="list-decimal space-y-1 pl-5 marker:text-neutral-400">
          {items}
        </ol>,
      );
      continue;
    }

    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote key={key} className="border-l-2 border-neutral-300 pl-3 text-neutral-500">
          {quote.map((q, qi) => (
            <span key={`${key}-${qi}`} className="block">
              {renderInline(q, `${key}-${qi}`)}
            </span>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Paragraph: consecutive plain lines, rendered with soft line breaks.
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && (para.length === 0 || !startsNewBlock(lines[i]))) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key}>
        {para.map((p, pi) => (
          <span key={`${key}-${pi}`}>
            {pi > 0 && <br />}
            {renderInline(p, `${key}-${pi}`)}
          </span>
        ))}
      </p>,
    );
  }

  if (blocks.length === 0) {
    return <p className="text-sm text-neutral-400">Nothing to preview yet.</p>;
  }

  return <div className="space-y-3 text-sm leading-relaxed text-neutral-700">{blocks}</div>;
}
