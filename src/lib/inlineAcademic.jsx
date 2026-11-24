import React from 'react';
import { formatLatexToReadable } from './latexFormat';

export const ACADEMIC_THEME_STYLES = {
  cyan: {
    h1: 'text-cyan-300 border-cyan-500/30',
    h2: 'text-cyan-200',
    h3: 'text-cyan-200',
    bullet: 'text-cyan-400',
    code: 'bg-white/10 text-cyan-300 border-white/10',
    math: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/25',
    blockMath: 'bg-cyan-950/30 border-cyan-500/30 text-cyan-200',
    tableHead: 'bg-cyan-500/10 text-cyan-200',
  },
  amber: {
    h1: 'text-amber-300 border-amber-500/30',
    h2: 'text-amber-200',
    h3: 'text-amber-300',
    bullet: 'text-amber-400',
    code: 'bg-amber-500/10 text-amber-200 border-amber-500/25',
    math: 'bg-amber-500/10 text-amber-200 border-amber-500/25',
    blockMath: 'bg-amber-950/30 border-amber-500/30 text-amber-200',
    tableHead: 'bg-amber-500/15 text-amber-200',
  },
  violet: {
    h1: 'text-violet-300 border-violet-500/30',
    h2: 'text-violet-200',
    h3: 'text-violet-200',
    bullet: 'text-violet-400',
    code: 'bg-violet-500/15 text-violet-200 border-violet-500/25',
    math: 'bg-violet-500/15 text-violet-200 border-violet-500/25',
    blockMath: 'bg-violet-950/35 border-violet-500/30 text-violet-200',
    tableHead: 'bg-violet-500/15 text-violet-200',
  },
  emerald: {
    h1: 'text-emerald-300 border-emerald-500/30',
    h2: 'text-emerald-200',
    h3: 'text-emerald-200',
    bullet: 'text-emerald-400',
    code: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25',
    math: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/25',
    blockMath: 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200',
    tableHead: 'bg-emerald-500/15 text-emerald-200',
  },
};

/**
 * Renders inline Markdown (**bold**, *italic*, `code`) AND inline LaTeX math ($...$, \(...\))
 * into crisp, readable academic JSX without any raw symbols.
 */
export function renderInlineAcademicText(text, theme = 'cyan') {
  if (text === null || text === undefined) return text;
  const str = String(text);
  if (!str) return str;

  const palette = ACADEMIC_THEME_STYLES[theme] || ACADEMIC_THEME_STYLES.cyan;
  const parts = [];
  const tokenRegex =
    /(`[^`\n]+`|\$\$[^$\n]+\$\$|\\\([^)\n]+\\\)|\$(?!\s)(?:[^$\n]*?[^\s$\\])\$(?!\d)|\*\*\*[^*\n]+\*\*\*|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;

  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = tokenRegex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }
    const token = match[0];

    if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={key++}
          className={`px-1.5 py-0.5 rounded-md font-mono text-[11px] sm:text-xs border ${palette.code}`}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (
      (token.startsWith('$$') && token.endsWith('$$')) ||
      (token.startsWith('\\(') && token.endsWith('\\)')) ||
      (token.startsWith('$') && token.endsWith('$'))
    ) {
      const innerRaw = token.startsWith('$$')
        ? token.slice(2, -2)
        : token.startsWith('\\(')
        ? token.slice(2, -2)
        : token.slice(1, -1);

      if (/^\d[\d,.]*$/.test(innerRaw.trim())) {
        parts.push(token);
      } else {
        const readable = formatLatexToReadable(innerRaw);
        parts.push(
          <span
            key={key++}
            className={`inline-block px-1.5 py-0.5 mx-0.5 rounded-md font-mono text-[11px] sm:text-xs font-medium border align-baseline ${palette.math}`}
          >
            {readable}
          </span>
        );
      }
    } else if (token.startsWith('***') && token.endsWith('***')) {
      parts.push(
        <strong key={key++} className="font-bold italic text-white">
          {renderInlineAcademicText(token.slice(3, -3), theme)}
        </strong>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={key++} className="font-bold text-white">
          {renderInlineAcademicText(token.slice(2, -2), theme)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={key++} className="italic text-neutral-300">
          {renderInlineAcademicText(token.slice(1, -1), theme)}
        </em>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }

  return parts.length > 0 ? parts : str;
}
