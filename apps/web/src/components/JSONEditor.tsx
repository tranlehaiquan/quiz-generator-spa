import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Zap,
  Braces,
  ScanEye,
  Sparkles,
} from 'lucide-react';
import type { Quiz } from '../App.tsx';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { hc } from 'hono/client';
import type { AppType } from '@aeroquiz/api';
import { getAuthHeaders } from '@/contexts/AuthContext';
import JsonMode from './creator/JsonMode.tsx';
import OcrMode from './creator/OcrMode.tsx';
import AIGenerator from './AIGenerator.tsx';

const client = hc<AppType>('/');

type InputMode = 'json' | 'ocr' | 'ai';

interface JSONEditorProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  onQuizCreated: (quiz: Quiz) => void;
  onCancel: () => void;
  addToast: (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  t: (key: string) => string;
  lang: 'vi' | 'en';
}

const TEMPLATE_JSON = {
  title: "Đề kiểm tra kiến thức mẫu",
  description: "Liệu bạn có thể đạt điểm tối đa cho chủ đề này không?",
  questions: [
    {
      question: "Ngôn ngữ nào dưới đây KHÔNG phải là ngôn ngữ lập trình?",
      options: ["Python", "Java", "HTML", "C++"],
      answer: "HTML",
      explanation: "HTML là ngôn ngữ đánh dấu siêu văn bản dùng để định nghĩa cấu trúc nội dung hiển thị, không phải là ngôn ngữ lập trình có logic xử lý."
    },
    {
      question: "Cổng mặc định dùng cho lưu lượng web HTTP là gì?",
      options: ["22", "80", "443", "8080"],
      answer: "80",
      explanation: "Cổng 80 là cổng tiêu chuẩn được gán cho lưu lượng web truyền tải không mã hóa qua giao thức HTTP."
    }
  ]
};

export default function JSONEditor({ mode, onModeChange, onQuizCreated, onCancel, addToast, t, lang }: JSONEditorProps) {
  const [jsonText, setJsonText] = useState(JSON.stringify(TEMPLATE_JSON, null, 2));
  const [isValid, setIsValid] = useState(true);
  const [validationMsg, setValidationMsg] = useState(t('jsonValid'));
  const [hasGenerated, setHasGenerated] = useState(mode === 'json');

  useEffect(() => {
    setHasGenerated(mode === 'json');
  }, [mode]);

  const validateSchema = (text: string): Quiz | null => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed.title || !parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        setIsValid(false);
        setValidationMsg(t('jsonInvalid'));
        return null;
      }
      setIsValid(true);
      setValidationMsg(t('jsonValid'));
      return parsed;
    } catch {
      setIsValid(false);
      setValidationMsg(t('jsonInvalid'));
      return null;
    }
  };

  const handleLoadTemplate = () => {
    setJsonText(JSON.stringify(TEMPLATE_JSON, null, 2));
    setIsValid(true);
    setValidationMsg(t('jsonValid'));
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setIsValid(true);
      setValidationMsg(t('jsonValid'));
    } catch {
      addToast("JSON Error", lang === 'vi' ? "Không thể định dạng mã JSON bị lỗi cú pháp." : "Could not format invalid JSON.", "error");
    }
  };

  const handleGenerate = async () => {
    const quizData = validateSchema(jsonText);
    if (!quizData) return;

    try {
      const res = await client.api.quizzes.$post({
        json: {
          title: quizData.title,
          description: quizData.description,
          tags: quizData.tags || ["Custom"],
          questions: quizData.questions
        }
      }, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const savedQuiz = await res.json();
        onQuizCreated(savedQuiz);
      } else {
        const errorData = await res.json() as { error?: string };
        addToast("Error", errorData.error || "Failed to save quiz.", "error");
      }
    } catch {
      addToast("Connection Error", "Could not sync quiz with server.", "error");
    }
  };

  const handleScanComplete = (quiz: Quiz) => {
    setJsonText(JSON.stringify(quiz, null, 2));
    setIsValid(true);
    setValidationMsg(t('jsonValid'));
    setHasGenerated(true);
    onModeChange('json');
  };

  const handleAIGenerated = (quiz: Quiz) => {
    setJsonText(JSON.stringify({
      title: quiz.title,
      description: quiz.description,
      tags: quiz.tags,
      questions: quiz.questions,
    }, null, 2));
    setIsValid(true);
    setValidationMsg(t('jsonValid'));
    setHasGenerated(true);
    onModeChange('json');
    addToast(
      lang === 'vi' ? 'AI đã tạo đề thi!' : 'AI generated quiz!',
      lang === 'vi' ? "Nhấn 'Bắt đầu làm bài' để chơi!" : "Click 'Parse & Play' to start!",
      'success'
    );
  };

  const modes = [
    { id: 'json' as InputMode, icon: Braces, label: lang === 'vi' ? 'JSON Thủ công' : 'Manual JSON' },
    { id: 'ocr' as InputMode, icon: ScanEye, label: lang === 'vi' ? 'Quét ảnh OCR' : 'Scan Image' },
    { id: 'ai' as InputMode, icon: Sparkles, label: lang === 'vi' ? 'Tạo bằng AI' : 'AI Generate' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-indigo-300 bg-clip-text text-transparent">
            {t('createQuiz')}
          </h2>
          <p className="text-slate-400 text-sm">{t('creatorDesc')}</p>
        </div>
        <Button variant="ghost" onClick={onCancel} className="rounded-xl text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          <span>{t('backBtn')}</span>
        </Button>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/60">
        {modes.map(m => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Input Panel */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/15 p-6 shadow-lg">
        {mode === 'json' && (
          <JsonMode
            jsonText={jsonText}
            onJsonChange={setJsonText}
            onLoadTemplate={handleLoadTemplate}
            onFormatJson={handleFormatJson}
            validateSchema={validateSchema}
            t={t}
            lang={lang}
          />
        )}

        {mode === 'ocr' && (
          <OcrMode
            onScanComplete={handleScanComplete}
            addToast={addToast}
            t={t}
            lang={lang}
          />
        )}

        {mode === 'ai' && (
          <div className="animate-in fade-in duration-200">
            <AIGenerator
              onQuizGenerated={handleAIGenerated}
              addToast={addToast}
              lang={lang}
            />
          </div>
        )}
      </div>

      {/* Validation & Submit */}
      <div className="space-y-3">
        <Alert className={`rounded-2xl border ${isValid ? 'border-emerald-500/20 bg-emerald-950/10 text-emerald-400' : 'border-rose-500/20 bg-rose-950/10 text-rose-400'}`}>
          <div className="flex items-start space-x-2">
            {isValid ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
            <div>
              <AlertTitle className="text-xs font-bold uppercase tracking-wider">
                {isValid ? 'Ready' : 'Invalid'}
              </AlertTitle>
              <AlertDescription className="text-xs mt-1 text-slate-300 font-medium">{validationMsg}</AlertDescription>
            </div>
          </div>
        </Alert>

        <Button
          onClick={handleGenerate}
          disabled={!isValid || !hasGenerated}
          className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 border border-indigo-500 transition text-base"
        >
          <Zap className="h-4 w-4 mr-2" />
          <span>{t('parsePlay')}</span>
        </Button>
      </div>
    </div>
  );
}
