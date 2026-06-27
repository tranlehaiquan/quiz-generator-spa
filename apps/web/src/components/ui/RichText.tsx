import katex from 'katex';

interface RichTextProps {
  text: string;
  className?: string;
}

export default function RichText({ text, className = '' }: RichTextProps) {
  if (!text) return null;

  // Split text by block code, display math, inline math, inline code, bold, and italic markers
  // Capturing group ensures matched delimiters are kept in the split array
  const regex = /(```[\s\S]+?```|\$\$[\s\S]+?\$\$|\$[\s\S]+?\$|`[\s\S]+?`|\*\*[\s\S]+?\*\*|\*[\s\S]+?\*)/g;
  const parts = text.split(regex);

  return (
    <span className={`inline-block ${className}`}>
      {parts.map((part, index) => {
        // 1. Block Code: ``` ... ```
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).trim();
          const langMatch = code.match(/^(\w+)\s*\n/);
          const lang = langMatch ? langMatch[1] : '';
          const displayCode = langMatch ? code.slice(langMatch[0].length) : code;
          return (
            <pre key={index} className="block my-2 p-3 bg-slate-900 border border-slate-800 rounded-md overflow-x-auto">
              {lang && <span className="block text-[11px] uppercase tracking-wide text-slate-500 mb-1">{lang}</span>}
              <code className="text-indigo-300 font-mono text-[13px]">{displayCode}</code>
            </pre>
          );
        }

        // 2. Display Math: $$ ... $$
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const formula = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(formula, {
              displayMode: true,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="block my-3 overflow-x-auto text-center"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return <span key={index} className="block my-3 text-rose-455 font-mono">{part}</span>;
          }
        }

        // 3. Inline Math: $ ... $
        if (part.startsWith('$') && part.endsWith('$')) {
          const formula = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(formula, {
              displayMode: false,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="inline-block px-0.5"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return <span key={index} className="text-rose-455 font-mono">{part}</span>;
          }
        }

        // 4. Inline Code: ` ... `
        if (part.startsWith('`') && part.endsWith('`')) {
          const code = part.slice(1, -1);
          return (
            <code
              key={index}
              className="px-1.5 py-0.5 mx-0.5 bg-slate-900 border border-slate-800 text-indigo-300 font-mono text-[13px] rounded-md inline-block font-semibold"
            >
              {code}
            </code>
          );
        }

        // 5. Bold: ** ... **
        if (part.startsWith('**') && part.endsWith('**')) {
          const boldText = part.slice(2, -2);
          return <strong key={index} className="font-extrabold text-slate-100">{boldText}</strong>;
        }

        // 6. Italic: * ... *
        if (part.startsWith('*') && part.endsWith('*')) {
          const italicText = part.slice(1, -1);
          return <em key={index} className="italic text-slate-300">{italicText}</em>;
        }

        // 7. Plain Text with line breaks
        return (
          <span key={index} className="whitespace-pre-line leading-relaxed">
            {part}
          </span>
        );
      })}
    </span>
  );
}
