import { FileJson, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Quiz } from '../../App.tsx';

interface JsonModeProps {
  jsonText: string;
  onJsonChange: (text: string) => void;
  onLoadTemplate: () => void;
  onFormatJson: () => void;
  validateSchema: (text: string) => Quiz | null;
  t: (key: string) => string;
  lang: 'vi' | 'en';
}

export default function JsonMode({
  jsonText,
  onJsonChange,
  onLoadTemplate,
  onFormatJson,
  validateSchema,
  t,
  lang,
}: JsonModeProps) {
  return (
    <div className="animate-in fade-in duration-200 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-300 flex items-center space-x-1.5">
          <FileJson className="h-4 w-4 text-indigo-400" />
          <span>{t('editorTitle')}</span>
        </h3>
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" onClick={onLoadTemplate}
            className="rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8">
            {t('loadTemplate')}
          </Button>
          <Button size="sm" variant="outline" onClick={onFormatJson}
            className="rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8">
            {t('formatJson')}
          </Button>
        </div>
      </div>

      <textarea
        value={jsonText}
        onChange={(e) => { onJsonChange(e.target.value); validateSchema(e.target.value); }}
        className="w-full h-[420px] bg-slate-950/80 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-indigo-200 focus:outline-none focus:border-indigo-500/50 transition resize-none custom-scrollbar"
        spellCheck="false"
      />

      <details className="text-xs text-slate-500 group">
        <summary className="cursor-pointer hover:text-slate-300 flex items-center gap-1.5">
          <Code2 className="h-3.5 w-3.5 text-indigo-400" />
          {lang === 'vi' ? 'Cấu trúc JSON & hướng dẫn' : 'JSON structure & guide'}
        </summary>
        <p className="mt-2 text-slate-500 leading-relaxed pl-5">{t('schemaHelp')}</p>
      </details>
    </div>
  );
}
