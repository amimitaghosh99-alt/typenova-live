import React from 'react';

/**
 * Minimal markdown renderer for LLM chat replies.
 *
 * Covers only what the coach actually emits: fenced code, headings, bullet and
 * numbered lists, bold, italic and inline code. Everything is returned as React
 * elements — model output is never parsed as HTML — so no sanitizer is needed.
 */

const INLINE = /(\[.*?\]\(.*?\)|https?:\/\/[^\s<]+[^<.,:;"')\]\s]|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_)/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(INLINE).filter(Boolean).map((token, i) => {
    const key = `${keyPrefix}-${i}`;
    
    const linkMatch = token.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a key={key} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--aru-glow))] font-bold hover:underline underline-offset-2 transition-all">
          {linkMatch[1]}
        </a>
      );
    }

    if (token.startsWith('http://') || token.startsWith('https://')) {
      return (
        <a key={key} href={token} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--aru-glow))] font-bold hover:underline underline-offset-2 transition-all">
          {token}
        </a>
      );
    }

    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      return <strong key={key} className="font-bold text-white">{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code key={key} className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-indigo-300 text-[0.85em] font-mono">
          {token.slice(1, -1)}
        </code>
      );
    }
    if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
      if (token.length > 2) return <em key={key} className="italic">{token.slice(1, -1)}</em>;
    }
    return <React.Fragment key={key}>{token}</React.Fragment>;
  });
}

type Block =
  | { kind: 'code'; lang: string; body: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'para'; text: string };

function parse(source: string): Block[] {
  const blocks: Block[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ kind: 'para', text: para.join('\n') });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push({ kind: 'list', ...list });
    list = null;
  };
  const flushAll = () => { flushPara(); flushList(); };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trimStart().startsWith('```')) {
      flushAll();
      const lang = line.trim().slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) body.push(lines[i++]);
      blocks.push({ kind: 'code', lang, body: body.join('\n') });
      continue;
    }

    if (!line.trim()) { flushAll(); continue; }

    const heading = line.match(/^#{1,6}\s+(.*)$/);
    if (heading) { flushAll(); blocks.push({ kind: 'heading', text: heading[1] }); continue; }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushPara();
      const ordered = !!numbered;
      if (!list || list.ordered !== ordered) { flushList(); list = { ordered, items: [] }; }
      list.items.push((bullet ? bullet[1] : numbered![1]));
      continue;
    }

    flushList();
    para.push(line);
  }
  flushAll();
  return blocks;
}

export const ChatMarkdown = React.memo(function ChatMarkdown({ content }: { content: string }) {
  const blocks = React.useMemo(() => parse(content), [content]);

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, b) => {
        switch (block.kind) {
          case 'code':
            return (
              <pre
                key={b}
                className="overflow-x-auto custom-scrollbar rounded-lg bg-black/50 border border-white/10 p-3 text-xs font-mono text-zinc-200"
              >
                <code>{block.body}</code>
              </pre>
            );
          case 'heading':
            return (
              <h4 key={b} className="font-black tracking-wide text-white text-[0.95em]">
                {renderInline(block.text, `h${b}`)}
              </h4>
            );
          case 'list': {
            const items = block.items.map((item, i) => <li key={i}>{renderInline(item, `l${b}-${i}`)}</li>);
            const cls = 'flex flex-col gap-1 pl-5 marker:text-indigo-400/70';
            return block.ordered ? (
              <ol key={b} className={`${cls} list-decimal`}>{items}</ol>
            ) : (
              <ul key={b} className={`${cls} list-disc`}>{items}</ul>
            );
          }
          default:
            return (
              <p key={b} className="whitespace-pre-wrap">
                {renderInline(block.text, `p${b}`)}
              </p>
            );
        }
      })}
    </div>
  );
});
