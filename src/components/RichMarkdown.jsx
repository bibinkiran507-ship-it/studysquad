import React, { useState, useMemo, memo } from 'react';
import { Check, Copy, Square, CheckSquare } from 'lucide-react';
import { formatLatexToReadable } from '../lib/latexFormat';
import { ACADEMIC_THEME_STYLES, renderInlineAcademicText } from '../lib/inlineAcademic';

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-2.5 rounded-xl bg-black/75 border border-white/15 overflow-hidden shadow-inner">
      <div className="px-3 py-1.5 bg-white/5 border-b border-white/10 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
        <span className="text-cyan-400 font-semibold">{lang || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="hover:text-white transition-colors cursor-pointer text-[10px] px-2 py-0.5 rounded bg-white/10 inline-flex items-center gap-1"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 text-cyan-300 font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function parseTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableDivider(line) {
  return /^\|?[\s:-]+\|[\s|:-]*$/.test(line.trim());
}

/**
 * Rich Academic Markdown + Math Renderer
 * Cleanly formats headings, bullets, checklists, tables, code blocks, bold/italic,
 * and LaTeX math equations without showing raw Markdown/LaTeX symbols to students.
 */
const RichMarkdown = memo(function RichMarkdown({ content, theme = 'cyan', className = '' }) {
  const renderedBlocks = useMemo(() => {
    if (!content) return null;

    const palette = ACADEMIC_THEME_STYLES[theme] || ACADEMIC_THEME_STYLES.cyan;
    const text = String(content);

    const blockRegex = /```([a-zA-Z0-9_+#.-]*)\r?\n([\s\S]*?)```|\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g;
    const segments = [];
    let lastIdx = 0;
    let match;

    while ((match = blockRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        segments.push({ type: 'text', text: text.substring(lastIdx, match.index) });
      }
      if (match[2] !== undefined) {
        segments.push({
          type: 'code',
          lang: match[1] || 'code',
          code: match[2].trimEnd(),
        });
      } else {
        const mathBody = (match[3] !== undefined ? match[3] : match[4] || '').trim();
        segments.push({ type: 'math', math: mathBody });
      }
      lastIdx = blockRegex.lastIndex;
    }

    if (lastIdx < text.length) {
      segments.push({ type: 'text', text: text.substring(lastIdx) });
    }

    return segments.map((seg, segIdx) => {
      if (seg.type === 'code') {
        return <CodeBlock key={segIdx} lang={seg.lang} code={seg.code} />;
      }

      if (seg.type === 'math') {
        return (
          <div
            key={segIdx}
            className={`my-2 px-4 py-2.5 rounded-xl border font-mono text-xs sm:text-sm text-center overflow-x-auto ${palette.blockMath}`}
          >
            {formatLatexToReadable(seg.math)}
          </div>
        );
      }

      const rawLines = seg.text.split(/\r?\n/);
      const nodes = [];

      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        const trimmed = line.trim();

        if (!trimmed) {
          nodes.push(<div key={`sp-${i}`} className="h-1.5" />);
          continue;
        }

        if (
          trimmed.includes('|') &&
          i + 1 < rawLines.length &&
          isTableDivider(rawLines[i + 1])
        ) {
          const headers = parseTableRow(trimmed);
          const rows = [];
          i += 2;
          while (i < rawLines.length && rawLines[i].trim().includes('|')) {
            rows.push(parseTableRow(rawLines[i]));
            i++;
          }
          i--;

          nodes.push(
            <div
              key={`tbl-${i}`}
              className="my-2.5 overflow-x-auto rounded-xl border border-white/10 bg-black/40"
            >
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b border-white/10 ${palette.tableHead}`}>
                    {headers.map((h, hIdx) => (
                      <th key={hIdx} className="px-3 py-2 font-bold whitespace-nowrap">
                        {renderInlineAcademicText(h, theme)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="border-b border-white/5 last:border-b-0 odd:bg-white/[0.02]"
                    >
                      {headers.map((_, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-neutral-200 align-top">
                          {renderInlineAcademicText(row[cIdx] || '', theme)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }

        if (/^[-*_]{3,}$/.test(trimmed)) {
          nodes.push(<hr key={`hr-${i}`} className="my-3 border-white/10" />);
          continue;
        }

        if (trimmed.startsWith('#### ')) {
          nodes.push(
            <h6 key={`h4-${i}`} className={`font-bold text-xs sm:text-sm pt-2 ${palette.h3}`}>
              {renderInlineAcademicText(trimmed.slice(5), theme)}
            </h6>
          );
          continue;
        }
        if (trimmed.startsWith('### ')) {
          nodes.push(
            <h5
              key={`h3-${i}`}
              className={`font-bold text-sm sm:text-base pt-3 pb-1 border-b border-white/10 ${palette.h3}`}
            >
              {renderInlineAcademicText(trimmed.slice(4), theme)}
            </h5>
          );
          continue;
        }
        if (trimmed.startsWith('## ')) {
          nodes.push(
            <h4
              key={`h2-${i}`}
              className={`font-bold text-sm sm:text-base pt-3 pb-1 border-b border-white/10 ${palette.h2}`}
            >
              {renderInlineAcademicText(trimmed.slice(3), theme)}
            </h4>
          );
          continue;
        }
        if (trimmed.startsWith('# ')) {
          nodes.push(
            <h3
              key={`h1-${i}`}
              className={`font-extrabold text-base sm:text-lg pb-2 mb-2 border-b tracking-tight ${palette.h1}`}
            >
              {renderInlineAcademicText(trimmed.slice(2), theme)}
            </h3>
          );
          continue;
        }

        const checkMatch = trimmed.match(/^(?:[-*•]\s+)?\[([ xX])\]\s+(.*)/);
        if (checkMatch) {
          const checked = checkMatch[1].toLowerCase() === 'x';
          nodes.push(
            <div key={`chk-${i}`} className="flex items-start gap-2.5 pl-1 py-0.5">
              {checked ? (
                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Square className={`w-4 h-4 shrink-0 mt-0.5 opacity-80 ${palette.bullet}`} />
              )}
              <span className="flex-1 text-neutral-200">
                {renderInlineAcademicText(checkMatch[2], theme)}
              </span>
            </div>
          );
          continue;
        }

        const bulletMatch = line.match(/^(\s*)(?:•|-|\*)\s+(.*)/);
        if (bulletMatch) {
          const isNested = bulletMatch[1].length >= 2;
          nodes.push(
            <div
              key={`li-${i}`}
              className={`flex items-start gap-2 ${isNested ? 'pl-5' : 'pl-1'} py-0.5`}
            >
              <span className={`${palette.bullet} font-bold shrink-0 leading-snug`}>
                {isNested ? '◦' : '•'}
              </span>
              <span className="flex-1 text-neutral-200">
                {renderInlineAcademicText(bulletMatch[2], theme)}
              </span>
            </div>
          );
          continue;
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          nodes.push(
            <div key={`ol-${i}`} className="flex items-start gap-2.5 pl-1 py-0.5">
              <span className={`${palette.bullet} font-bold shrink-0 text-xs mt-0.5 min-w-[1.1rem]`}>
                {numMatch[1]}.
              </span>
              <span className="flex-1 text-neutral-200">
                {renderInlineAcademicText(numMatch[2], theme)}
              </span>
            </div>
          );
          continue;
        }

        if (trimmed.startsWith('> ')) {
          nodes.push(
            <blockquote
              key={`bq-${i}`}
              className="pl-3 py-1 my-1 border-l-2 border-white/25 text-neutral-300 italic bg-white/[0.02] rounded-r-lg"
            >
              {renderInlineAcademicText(trimmed.slice(2), theme)}
            </blockquote>
          );
          continue;
        }

        nodes.push(
          <p key={`p-${i}`} className="text-neutral-200">
            {renderInlineAcademicText(trimmed, theme)}
          </p>
        );
      }

      return (
        <div key={segIdx} className="space-y-1">
          {nodes}
        </div>
      );
    });
  }, [content, theme]);

  if (!renderedBlocks) return null;

  return (
    <div className={`space-y-2 leading-relaxed text-xs sm:text-sm font-sans ${className}`}>
      {renderedBlocks}
    </div>
  );
});

export default RichMarkdown;
