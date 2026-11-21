import { Fragment } from 'react';

interface LegalDocumentViewProps {
  title: string;
  content: string;
  lastRevisedDate?: string;
}

type DocumentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

function formatDisplayDate(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    const d = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }
  }
  return trimmed;
}

function parseLegalBlocks(raw: string): DocumentBlock[] {
  const normalized = raw.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const blocks: DocumentBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paragraphLines.join(' ').trim() });
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', items: listItems });
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', text: trimmed.slice(3).trim() });
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', text: trimmed.slice(4).trim() });
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      flushParagraph();
      listItems.push(trimmed.slice(2).trim());
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();
  return blocks;
}

export function LegalDocumentView({ title, content, lastRevisedDate }: LegalDocumentViewProps) {
  const blocks = parseLegalBlocks(content || '');
  const formattedDate = formatDisplayDate(lastRevisedDate);

  return (
    <article className="max-w-3xl">
      <header className="pb-8 border-b border-[#171614]/10">
        <p className="text-xs font-medium tracking-[0.2em] uppercase text-[#766E64]">
          Studio Policy
        </p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl font-normal tracking-tight text-[#171614] leading-[1.1]">
          {title}
        </h1>
        {formattedDate && (
          <p className="mt-4 text-xs font-mono tabular-nums text-[#766E64]">
            Last Revised: {formattedDate}
          </p>
        )}
      </header>

      <div className="pt-8 space-y-6">
        {blocks.map((block, idx) => {
          if (block.type === 'heading') {
            return (
              <h2
                key={idx}
                className="pt-4 font-serif text-2xl sm:text-[1.65rem] font-normal text-[#171614] leading-snug"
              >
                {block.text}
              </h2>
            );
          }

          if (block.type === 'list') {
            return (
              <ul
                key={idx}
                className="space-y-2.5 pl-5 list-disc marker:text-[#766E64] text-[15px] text-[#3E3A35] leading-relaxed"
              >
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{item}</li>
                ))}
              </ul>
            );
          }

          return (
            <Fragment key={idx}>
              <p className="text-[15px] text-[#3E3A35] leading-[1.8]">{block.text}</p>
            </Fragment>
          );
        })}
      </div>
    </article>
  );
}
