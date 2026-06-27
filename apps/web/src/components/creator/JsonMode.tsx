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
    <div className="animate-in fade-in duration-300 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-350 flex items-center space-x-2">
          <FileJson className="h-4 w-4 text-indigo-400" />
          <span>{t('editorTitle')}</span>
        </h3>
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" onClick={onLoadTemplate}
            className="rounded-xl border-slate-800 text-slate-350 hover:bg-slate-850 hover:text-white text-xs h-8.5 font-bold transition">
            {t('loadTemplate')}
          </Button>
          <Button size="sm" variant="outline" onClick={onFormatJson}
            className="rounded-xl border-slate-800 text-slate-350 hover:bg-slate-850 hover:text-white text-xs h-8.5 font-bold transition">
            {t('formatJson')}
          </Button>
        </div>
      </div>

      <textarea
        value={jsonText}
        onChange={(e) => { onJsonChange(e.target.value); validateSchema(e.target.value); }}
        className="w-full h-[400px] bg-slate-950 border border-slate-850 focus:border-indigo-500/50 rounded-2xl p-4 font-mono text-xs text-indigo-200/90 focus:outline-none transition resize-none custom-scrollbar shadow-inner leading-relaxed"
        spellCheck="false"
      />

      <details className="text-xs text-slate-500 group border border-slate-900 rounded-xl p-3 bg-slate-950/20">
        <summary className="cursor-pointer hover:text-slate-300 flex items-center gap-2 font-bold select-none transition">
          <Code2 className="h-4 w-4 text-indigo-400" />
          <span>{lang === 'vi' ? 'Cấu trúc JSON & Hướng dẫn chi tiết' : 'JSON Schema & Integration Guide'}</span>
        </summary>
        <div className="mt-2 text-slate-500 leading-relaxed pl-6 border-t border-slate-900/60 pt-2 font-medium">
          {t('schemaHelp')}
        </div>
      </details>
    </div>
  );
}
