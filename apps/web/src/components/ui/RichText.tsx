import React from 'react';
import katex from 'katex';

interface RichTextProps {
  text: string;
  className?: string;
}

type Token =
  | { kind: 'block-code'; lang: string; code: string }
  | { kind: 'display-math'; formula: string }
  | { kind: 'inline-math'; formula: string }
  | { kind: 'inline-code'; code: string }
  | { kind: 'bold'; content: string }
  | { kind: 'italic'; content: string }
  | { kind: 'text'; content: string };

/**
 * Tokenise a markdown-lite string into typed tokens.
 * Order matters: longer/block delimiters must be checked before shorter ones.
 */
function tokenize(text: string): Token[] {
  const tokens: Token[] = [];

  // Ordered list of patterns — block/longer delimiters MUST come before shorter ones
  const patterns: [RegExp, (m: RegExpExecArray) => Token][] = [
    // Block code: ```lang?\ncode```
    [
      /```([\w]*)\n?([\s\S]*?)```/,
      (m) => ({ kind: 'block-code', lang: m[1] ?? '', code: m[2] ?? '' }),
    ],
    // Display math: $$...$$
    [
      /\$\$([\s\S]+?)\$\$/,
      (m) => ({ kind: 'display-math', formula: m[1]!.trim() }),
    ],
    // Inline math: $...$ (single-char content is fine, e.g. $x$)
    [
      /\$([^$\n]+?)\$/,
      (m) => ({ kind: 'inline-math', formula: m[1]!.trim() }),
    ],
    // Inline code: `...`
    [
      /`([^`]+?)`/,
      (m) => ({ kind: 'inline-code', code: m[1]! }),
    ],
    // Bold: **...** (must come before italic)
    [
      /\*\*(.+?)\*\*/,
      (m) => ({ kind: 'bold', content: m[1]! }),
    ],
    // Italic: *...*
    [
      /\*(.+?)\*/,
      (m) => ({ kind: 'italic', content: m[1]! }),
    ],
  ];

  // Build a combined regex from all pattern sources (no individual /g flags)
  const combined = new RegExp(
    patterns.map(([re]) => '(' + re.source + ')').join('|'),
    'g',
  );

  let lastIndex = 0;

  for (const match of text.matchAll(combined)) {
    // Flush any plain text before this match
    if (match.index! > lastIndex) {
      tokens.push({ kind: 'text', content: text.slice(lastIndex, match.index) });
    }

    // Re-test each pattern against the matched string to identify token type
    let pushed = false;
    for (const [re, factory] of patterns) {
      const singleRe = new RegExp('^(?:' + re.source + ')$');
      const m2 = singleRe.exec(match[0]);
      if (m2) {
        tokens.push(factory(m2));
        pushed = true;
        break;
      }
    }
    if (!pushed) {
      tokens.push({ kind: 'text', content: match[0] });
    }

    lastIndex = match.index! + match[0].length;
  }

  // Flush trailing plain text
  if (lastIndex < text.length) {
    tokens.push({ kind: 'text', content: text.slice(lastIndex) });
  }

  return tokens;
}

function renderMathHtml(formula: string, displayMode: boolean): string | null {
  try {
    return katex.renderToString(formula, { displayMode, throwOnError: false });
  } catch {
    return null;
  }
}

function TokenNode({ token }: { token: Token }): React.ReactElement {
  switch (token.kind) {
    case 'block-code':
      return (
        <pre className="block my-2 p-3 bg-slate-900 border border-slate-800 rounded-md overflow-x-auto">
          {token.lang && (
            <span className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">
              {token.lang}
            </span>
          )}
          <code className="text-indigo-300 font-mono text-[13px] whitespace-pre">
            {token.code.trimEnd()}
          </code>
        </pre>
      );

    case 'display-math': {
      const html = renderMathHtml(token.formula, true);
      return html
        ? (
          <span
            className="block my-3 overflow-x-auto text-center"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <span className="block my-3 text-rose-400 font-mono">
            {'$$' + token.formula + '$$'}
          </span>
        );
    }

    case 'inline-math': {
      const html = renderMathHtml(token.formula, false);
      return html
        ? (
          <span
            className="inline px-0.5"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <span className="text-rose-400 font-mono">
            {'$' + token.formula + '$'}
          </span>
        );
    }

    case 'inline-code':
      return (
        <code className="px-1.5 py-0.5 mx-0.5 bg-slate-900 border border-slate-800 text-indigo-300 font-mono text-[13px] rounded-md inline font-semibold">
          {token.code}
        </code>
      );

    case 'bold':
      return (
        <strong className="font-extrabold text-slate-100">
          {token.content}
        </strong>
      );

    case 'italic':
      return (
        <em className="italic text-slate-300">
          {token.content}
        </em>
      );

    case 'text':
      return (
        <span className="whitespace-pre-line leading-relaxed">
          {token.content}
        </span>
      );
  }
}

export default function RichText({ text, className = '' }: RichTextProps) {
  if (!text) return null;

  const tokens = tokenize(text);

  return (
    <span className={className}>
      {tokens.map((token, i) => (
        <TokenNode key={i} token={token} />
      ))}
    </span>
  );
}
