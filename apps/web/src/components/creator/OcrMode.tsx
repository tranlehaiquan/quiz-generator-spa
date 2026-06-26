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

export default function OcrMode({ onScanComplete, addToast, t, lang }: OcrModeProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerPreviewUrl, setScannerPreviewUrl] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScanFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      addToast("Invalid File", lang === 'vi' ? "Vui lòng tải lên file hình ảnh." : "Please upload an image file.", "warning");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast("File Too Large", lang === 'vi' ? "Ảnh tối đa 10MB." : "Image must be under 10MB.", "warning");
      return;
    }

    setIsScanning(true);
    setScannerStatus(lang === 'vi' ? "Đang tải ảnh lên..." : "Uploading image...");

    const reader = new FileReader();
    reader.onload = (e) => { if (e.target?.result) setScannerPreviewUrl(e.target.result as string); };
    reader.readAsDataURL(file);

    const timers = [
      setTimeout(() => setScannerStatus(lang === 'vi' ? "Tesseract OCR đang đọc ảnh..." : "Tesseract OCR reading image..."), 1500),
      setTimeout(() => setScannerStatus(lang === 'vi' ? "Đang nhận diện văn bản..." : "Recognizing text..."), 3500),
      setTimeout(() => setScannerStatus(lang === 'vi' ? "AI đang cấu trúc đề thi..." : "AI structuring quiz..."), 7000),
    ];

    try {
      const res = await client.api.quizzes.scan.$post({ form: { file } });

      if (res.ok) {
        const scannedQuiz = await res.json() as Quiz & { rawText?: string };
        if (scannedQuiz.rawText) {
          addToast(
            lang === 'vi' ? 'OCR hoàn tất (văn bản thô)' : 'OCR complete (raw text)',
            lang === 'vi' ? 'Không có AI để cấu trúc. Văn bản thô đã được chèn vào editor.' : 'No AI configured for structuring. Raw text placed in editor.',
            'warning'
          );
        } else {
          addToast(t('scanSuccess'), lang === 'vi' ? "Nhấp 'Bắt đầu làm bài' để chơi!" : "Click 'Parse & Play' to start!", "success");
        }
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
    <div className="animate-in fade-in duration-200">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition duration-300 flex flex-col items-center justify-center min-h-[280px] overflow-hidden group ${
          isDragOver
            ? 'border-indigo-400 bg-indigo-950/20'
            : 'border-slate-700 bg-slate-950/30 hover:border-slate-600 hover:bg-slate-900/10'
        }`}
      >
        {scannerPreviewUrl && (
          <img src={scannerPreviewUrl} className="absolute inset-0 w-full h-full object-cover opacity-15 filter blur-[2px] pointer-events-none" alt="preview" />
        )}
        {isScanning && (
          <div className="absolute inset-x-0 h-0.5 bg-indigo-500/80 shadow-[0_0_12px_#6366f1] animate-scan pointer-events-none z-10" />
        )}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*"
          onChange={(e) => { if (e.target.files?.[0]) handleScanFile(e.target.files[0]); }} />

        {isScanning ? (
          <div className="space-y-4 z-20">
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
              <FileUp className="h-8 w-8 animate-bounce" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-sm text-slate-200">{t('scanning')}</h4>
              <p className="text-xs text-indigo-400/80 font-mono">{scannerStatus}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 z-20">
            <div className="p-4 bg-slate-900/60 border border-slate-800 text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500/25 group-hover:bg-indigo-500/5 rounded-full w-16 h-16 flex items-center justify-center mx-auto transition duration-300">
              <UploadCloud className="h-8 w-8" />
            </div>
            <div className="space-y-1 max-w-xs mx-auto">
              <h4 className="font-bold text-sm text-slate-200 group-hover:text-indigo-300 transition">{t('scanZone')}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{t('scanSupport')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
