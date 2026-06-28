import { useState, useRef } from 'react';
import { UploadCloud, FileUp } from 'lucide-react';
import { hc } from 'hono/client';
import type { AppType } from '@aeroquiz/api';
import type { Quiz } from '../../App.tsx';

const client = hc<AppType>('/');

interface OcrModeProps {
  onScanComplete: (quiz: Quiz) => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  t: (key: string) => string;
  lang: 'vi' | 'en';
}

export default function OcrMode({ onScanComplete, addToast, t }: OcrModeProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerPreviewUrl, setScannerPreviewUrl] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScanFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast(t('invalidFile'), t('imageUploadRequired'), "warning");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast(t('fileTooLarge'), t('imageSizeLimit'), "warning");
      return;
    }

    setIsScanning(true);
    setScannerStatus(t('statusUploading'));

    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) setScannerPreviewUrl(e.target.result as string); };
    reader.readAsDataURL(file);

    const timers = [
      setTimeout(() => setScannerStatus(t('statusStartingOcr')), 1200),
      setTimeout(() => setScannerStatus(t('statusRecognizing')), 3000),
      setTimeout(() => setScannerStatus(t('statusStructuring')), 6000),
    ];

    try {
      const res = await client.api.quizzes.scan.$post({ form: { file } });

      if (res.ok) {
        const scannedQuiz = await res.json() as Quiz & { rawText?: string };
        onScanComplete(scannedQuiz);
      } else {
        const errorData = await res.json() as { error?: string };
        addToast("OCR Error", errorData.error || t('scanError'), "error");
      }
    } catch {
      addToast("Connection Error", "Network failure during scan.", "error");
    } finally {
      setIsScanning(false);
      timers.forEach(t => clearTimeout(t));
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) handleScanFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isScanning && fileInputRef.current?.click()}
        className={`relative rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[300px] overflow-hidden group ${
          isScanning 
            ? 'border-indigo-500/40 bg-slate-950/20 cursor-wait'
            : isDragOver
              ? 'border-indigo-400 bg-indigo-950/20 scale-[1.01]'
              : 'border-slate-800 bg-slate-950/30 hover:border-slate-700 hover:bg-slate-900/10 cursor-pointer'
        }`}
      >
        {scannerPreviewUrl && (
          <img src={scannerPreviewUrl} className="absolute inset-0 w-full h-full object-cover opacity-10 filter blur-[3px] pointer-events-none" alt="preview" />
        )}
        {isScanning && (
          <div className="absolute inset-x-0 h-0.5 bg-indigo-500/80 shadow-[0_0_12px_#6366f1] animate-scan pointer-events-none z-10" />
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*"
          onChange={(e) => { if (e.target.files?.[0]) handleScanFile(e.target.files[0]); }} />

        {isScanning ? (
          <div className="space-y-4 z-20 animate-pulse">
            <div className="p-4 bg-indigo-650/15 border border-indigo-500/35 text-indigo-400 rounded-full w-18 h-18 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/5">
              <FileUp className="h-8 w-8 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h4 className="font-bold text-sm text-slate-200">{t('scanning')}</h4>
              <div className="inline-block bg-slate-950/80 border border-slate-850 px-4 py-1.5 rounded-xl font-mono text-[10px] text-indigo-400 shadow-inner">
                {scannerStatus}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5 z-20">
            <div className="p-4 bg-slate-900/60 border border-slate-850 text-slate-500 group-hover:text-indigo-400 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/5 group-hover:scale-105 rounded-full w-18 h-18 flex items-center justify-center mx-auto shadow-md transition duration-300">
              <UploadCloud className="h-8 w-8" />
            </div>
            <div className="space-y-2 max-w-xs mx-auto">
              <h4 className="font-bold text-sm text-slate-200 group-hover:text-indigo-300 transition duration-300">{t('scanZone')}</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{t('scanSupport')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
